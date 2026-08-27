/**
 * FinanceDashboard — ระบบการเงินเต็มรูปแบบสำหรับผู้จัดการบัญชี (DAPH Decor)
 *
 * Tabs:
 *   1. ภาพรวมวันนี้   — ยอดค้างรวม, รับแล้ววันนี้, งวดใกล้ถึง, ค้างนาน (จาก rpc_finance_home)
 *   2. บัญชีแยกประเภท — Statement จาก MultiBookLedger (DBD2554 / IFRS Format 3)
 *   3. ลูกหนี้การค้า   — Receivables ทั้งหมด + filter overdue + color coding
 *   4. Bank Feed       — สถานะ reconciliation ของ BankTxn
 *
 * Data Sources:
 *   - Tab 1: rpc_finance_home (Field App session, ADR-058)
 *   - Tab 2-4: local ledger modules (multibook, receivables, bankfeed)
 *
 * Architecture: Follows existing MONOLITH patterns (Tailwind, explicit state, role-gated via RequireRole)
 * @version 14.0.0
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { readFieldSession } from '../bridge/fieldBridge';
import type { MultiBookLedger, StatutoryStatement, BookStatement, CoaTypeMap } from '../ledger/multibook';
import { statement as bookStatement, statutoryStatement } from '../ledger/multibook';
import type { Receivable } from '../ledger/receivables';
import { isOverdue, findOverdue } from '../ledger/receivables';
import type { BankTxn, LedgerRecord, MatchResult } from '../ledger/bankfeed';
import { autoMatch } from '../ledger/bankfeed';

// ============================================================================
// Types
// ============================================================================

export interface FinanceHomeRow {
  installment_id: string;
  project_id: string;
  name: string;
  seq: number;
  label: string;
  amount: number;
  days_waiting: number;
  has_slip?: boolean;
}

export interface FinanceHomeData {
  awaiting: FinanceHomeRow[];
  overdue: FinanceHomeRow[];
  received_today: { count: number; total: number };
}

export type TabId = 'overview' | 'ledger' | 'receivables' | 'bankfeed';

export interface FinanceDashboardProps {
  /** override สำหรับเทส/embed — default: fetch ผ่าน session Field App */
  fetchHome?: () => Promise<FinanceHomeData>;
  /** ปลายทางลิงก์ "เปิด Field App" */
  fieldAppUrl?: string;
  /** inject MultiBookLedger สำหรับเทส */
  ledger?: MultiBookLedger | null;
  /** Chart of Accounts type mapping — default: DAPH standard */
  coa?: CoaTypeMap;
  /** inject Receivables สำหรับเทส */
  receivables?: Receivable[];
  /** inject BankTxn list สำหรับเทส */
  bankTxns?: BankTxn[];
  /** inject ledger records for bank feed matching */
  ledgerRecords?: LedgerRecord[];
  /** initial tab */
  initialTab?: TabId;
}

// ============================================================================
// Constants
// ============================================================================

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
const FIELD_APP_URL = (import.meta.env.VITE_FIELD_APP_URL as string | undefined) ?? '../';

const THB = (n: number) => Number(n).toLocaleString('th-TH');

/** Default Chart of Accounts mapping for DAPH Decor (follows DBD 2554 standard numbering) */
const DAPH_COA: CoaTypeMap = Object.freeze({
  '1000': 'asset',    // เงินสด
  '1100': 'asset',    // ลูกหนี้การค้า
  '1200': 'asset',    // สินค้าคงเหลือ
  '1300': 'asset',    // สินทรัพย์หมุนเวียนอื่น
  '1500': 'asset',    // ที่ดิน อาคาร อุปกรณ์
  '2000': 'liability', // เจ้าหนี้การค้า
  '2100': 'liability', // หนี้สินหมุนเวียนอื่น
  '2500': 'liability', // หนี้สินระยะยาว
  '3000': 'equity',   // ทุนจดทะเบียน
  '3100': 'equity',   // กำไรสะสม
  '4000': 'revenue',  // รายได้จากการขาย
  '4100': 'revenue',  // รายได้อื่น
  '5000': 'expense',  // ต้นทุนขาย
  '5100': 'expense',  // ค่าแรง
  '5200': 'expense',  // ค่าวัสดุ
  '6000': 'expense',  // ค่าใช้จ่ายในการขาย
  '6100': 'expense',  // ค่าใช้จ่ายบริหาร
});

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'ภาพรวมวันนี้', icon: '📊' },
  { id: 'ledger', label: 'บัญชีแยกประเภท', icon: '📒' },
  { id: 'receivables', label: 'ลูกหนี้การค้า', icon: '💰' },
  { id: 'bankfeed', label: 'Bank Feed', icon: '🏦' },
];

// ============================================================================
// RPC Fetch (existing pattern — reuse Field App session)
// ============================================================================

async function fetchHomeViaFieldSession(): Promise<FinanceHomeData> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
  const session = readFieldSession();
  if (!session) throw new Error('ยังไม่มี session — เปิด Field App แล้วล็อกอินก่อน');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_finance_home`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_ANON,
      authorization: `Bearer ${session.accessToken}`,
    },
    body: '{}',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `rpc_finance_home failed (${res.status})`);
  }
  return res.json();
}

// ============================================================================
// Tab 1: Overview (existing logic, preserved)
// ============================================================================

function OverviewTab({
  home,
  fieldAppUrl,
}: {
  home: FinanceHomeData | null;
  fieldAppUrl: string;
}) {
  const outstanding = useMemo(
    () => (home ? home.awaiting.reduce((sum, r) => sum + Number(r.amount), 0) : 0),
    [home],
  );

  if (!home) return <div className="opacity-70">กำลังโหลดข้อมูลจาก Field App…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">สรุปภาพรวมวันนี้</h3>
        <a
          href={fieldAppUrl}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-surface-2 hover:bg-surface-3 border border-oi-border"
          title="บันทึกรับ/แนบสลิปทำใน Field App"
        >
          เปิด Field App ↗
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="ยอดค้างรวม" value={`${THB(outstanding)} ฿`} sub={`${home.awaiting.length} งวดรอชำระ`} />
        <KpiCard label="รับแล้ววันนี้" value={`${THB(home.received_today.total)} ฿`} sub={`${home.received_today.count} รายการ`} />
        <KpiCard
          label="ค้างนานเกินกำหนด"
          value={`${home.overdue.length} งวด`}
          sub={home.overdue.length > 0 ? '⚠️ ต้องติดตาม' : '✓ ปกติ'}
          alert={home.overdue.length > 0}
        />
      </div>

      {/* Awaiting list */}
      {home.awaiting.length > 0 && (
        <div className="p-4 rounded-lg bg-surface-1 border border-oi-border space-y-2">
          <div className="font-semibold">งวดใกล้ถึง (แจ้งลูกค้าแล้ว รอชำระ)</div>
          {home.awaiting.map((r) => (
            <div key={r.installment_id} className="py-2 border-b border-oi-border last:border-b-0">
              <div className="font-medium">{r.name}</div>
              <div className="opacity-80">งวด {r.seq} · {r.label} — {THB(r.amount)} บาท</div>
              <div className="text-xs opacity-70">
                แจ้งแล้ว {r.days_waiting} วัน{r.has_slip ? ' · 🧾 มีสลิปแล้ว' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overdue list */}
      {home.overdue.length > 0 && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/30 space-y-2">
          <div className="font-semibold text-red-300">ค้างนานเกินกำหนดเตือน</div>
          {home.overdue.map((r) => (
            <div key={r.installment_id} className="py-1">
              🔴 {r.name} · งวด {r.seq} — {THB(r.amount)} บาท ค้าง {r.days_waiting} วัน
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab 2: Ledger (Multi-Book Statement)
// ============================================================================

function LedgerTab({ ledger, coa }: { ledger: MultiBookLedger | null; coa: CoaTypeMap }) {
  const [selectedBook, setSelectedBook] = useState<string>('internal');
  const [format, setFormat] = useState<'DBD2554' | 'IFRS_Format3'>('DBD2554');

  const stmt = useMemo<StatutoryStatement | null>(() => {
    if (!ledger) return null;
    try {
      return statutoryStatement(ledger, selectedBook, format, coa);
    } catch {
      return null;
    }
  }, [ledger, selectedBook, format, coa]);

  const bookSummaryData = useMemo<BookStatement | null>(() => {
    if (!ledger) return null;
    try {
      return bookStatement(ledger, selectedBook);
    } catch {
      return null;
    }
  }, [ledger, selectedBook]);

  if (!ledger) {
    return (
      <div className="text-center py-8 opacity-70">
        <div className="text-4xl mb-2">📒</div>
        <div>ยังไม่มีข้อมูลบัญชี — post() ยังไม่ถูกเรียก</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs font-medium opacity-70">สมุดบัญชี:</label>
        <select
          value={selectedBook}
          onChange={(e) => setSelectedBook(e.target.value)}
          className="px-2 py-1 rounded bg-surface-2 border border-oi-border text-sm"
          data-testid="book-selector"
        >
          <option value="internal">Internal (บริหาร)</option>
          <option value="external">External (ภาษี)</option>
        </select>

        <label className="text-xs font-medium opacity-70 ml-4">รูปแบบ:</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as 'DBD2554' | 'IFRS_Format3')}
          className="px-2 py-1 rounded bg-surface-2 border border-oi-border text-sm"
          data-testid="format-selector"
        >
          <option value="DBD2554">DBD 2554 (กรมพัฒนาธุรกิจ)</option>
          <option value="IFRS_Format3">IFRS Format 3</option>
        </select>
      </div>

      {/* Book Summary */}
      {bookSummaryData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard label="จำนวนรายการ" value={String(bookSummaryData.entryCount)} sub={`Book: ${selectedBook}`} />
          <KpiCard label="เดบิตรวม" value={`${THB(bookSummaryData.totalDebit)} ฿`} sub="Total Debit" />
          <KpiCard label="เครดิตรวม" value={`${THB(bookSummaryData.totalCredit)} ฿`} sub="Total Credit" />
        </div>
      )}

      {/* Statutory Statement */}
      {stmt && (
        <div className="p-4 rounded-lg bg-surface-1 border border-oi-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">งบการเงิน ({format === 'DBD2554' ? 'DBD 2554' : 'IFRS'})</h4>
            <span className={`text-xs px-2 py-0.5 rounded ${stmt.balanced ? 'bg-green-800/40 text-green-300' : 'bg-red-800/40 text-red-300'}`}>
              {stmt.balanced ? '✓ สมดุล' : '✗ ไม่สมดุล'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <StatRow label="สินทรัพย์ (Assets)" value={stmt.assets} />
            <StatRow label="หนี้สิน (Liabilities)" value={stmt.liabilities} />
            <StatRow label="ส่วนของเจ้าของ (Equity)" value={stmt.equity} />
            <StatRow label="รายได้ (Revenue)" value={stmt.revenue} />
            <StatRow label="ค่าใช้จ่าย (Expense)" value={stmt.expense} />
            <StatRow label="กำไรสุทธิ (Net Profit)" value={stmt.netProfit} highlight />
          </div>
        </div>
      )}

      {!stmt && bookSummaryData && (
        <div className="p-3 rounded bg-yellow-900/20 border border-yellow-500/30 text-sm">
          ⚠️ ยังไม่สามารถสร้างงบการเงินได้ — อาจยังไม่มีรายการใน book "{selectedBook}"
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab 3: Receivables
// ============================================================================

function ReceivablesTab({ receivables }: { receivables: Receivable[] }) {
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const displayed = useMemo(() => {
    if (showOverdueOnly) return findOverdue(receivables, today);
    return receivables;
  }, [receivables, showOverdueOnly, today]);

  const totalAmount = useMemo(
    () => receivables.reduce((sum, r) => sum + Number(r.amount), 0),
    [receivables],
  );
  const totalPaid = useMemo(
    () => receivables.reduce((sum, r) => sum + Number(r.paid), 0),
    [receivables],
  );
  const overdueCount = useMemo(
    () => receivables.filter((r) => isOverdue(r, today)).length,
    [receivables, today],
  );

  if (receivables.length === 0) {
    return (
      <div className="text-center py-8 opacity-70">
        <div className="text-4xl mb-2">💰</div>
        <div>ยังไม่มีข้อมูลลูกหนี้</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiCard label="ลูกหนี้ทั้งหมด" value={String(receivables.length)} sub="รายการ" />
        <KpiCard label="ยอดรวม" value={`${THB(totalAmount)} ฿`} sub="Amount" />
        <KpiCard label="ชำระแล้ว" value={`${THB(totalPaid)} ฿`} sub={`${Math.round((totalPaid / totalAmount) * 100)}%`} />
        <KpiCard label="เกินกำหนด" value={String(overdueCount)} sub="รายการ" alert={overdueCount > 0} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showOverdueOnly}
            onChange={(e) => setShowOverdueOnly(e.target.checked)}
            className="rounded"
            data-testid="overdue-filter"
          />
          แสดงเฉพาะเกินกำหนด ({overdueCount})
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-oi-border">
        <table className="w-full text-sm" data-testid="receivables-table">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-right">ยอด</th>
              <th className="px-3 py-2 text-right">ชำระแล้ว</th>
              <th className="px-3 py-2 text-right">คงเหลือ</th>
              <th className="px-3 py-2 text-center">กำหนดชำระ</th>
              <th className="px-3 py-2 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) => {
              const overdue = isOverdue(r, today);
              const remaining = Number(r.amount) - Number(r.paid);
              return (
                <tr
                  key={r.id}
                  className={`border-t border-oi-border ${overdue ? 'bg-red-900/10' : ''}`}
                  data-testid={`receivable-row-${r.id}`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2 text-right">{THB(Number(r.amount))}</td>
                  <td className="px-3 py-2 text-right">{THB(Number(r.paid))}</td>
                  <td className="px-3 py-2 text-right font-medium">{THB(remaining)}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {new Date(r.dueDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {remaining <= 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-800/40 text-green-300">ชำระครบ</span>
                    ) : overdue ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-800/40 text-red-300">เกินกำหนด</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-800/40 text-blue-300">รอชำระ</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 4: Bank Feed
// ============================================================================

function BankFeedTab({
  bankTxns,
  ledgerRecords,
}: {
  bankTxns: BankTxn[];
  ledgerRecords: LedgerRecord[];
}) {
  const matchResults = useMemo(() => {
    return bankTxns.map((txn) => ({
      txn,
      result: autoMatch(txn, ledgerRecords),
    }));
  }, [bankTxns, ledgerRecords]);

  const matched = matchResults.filter((r) => r.result.status === 'matched').length;
  const pending = matchResults.filter((r) => r.result.status === 'pending_reconcile').length;

  if (bankTxns.length === 0) {
    return (
      <div className="text-center py-8 opacity-70">
        <div className="text-4xl mb-2">🏦</div>
        <div>ยังไม่มีข้อมูล Bank Feed</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="ธุรกรรมทั้งหมด" value={String(bankTxns.length)} sub="รายการ" />
        <KpiCard label="จับคู่แล้ว" value={String(matched)} sub={`${Math.round((matched / bankTxns.length) * 100)}%`} />
        <KpiCard label="รอจับคู่" value={String(pending)} sub="ต้องตรวจสอบ" alert={pending > 0} />
      </div>

      {/* Reconciliation progress bar */}
      <div className="p-3 rounded-lg bg-surface-1 border border-oi-border">
        <div className="text-xs font-medium mb-1 opacity-70">Reconciliation Progress</div>
        <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${bankTxns.length > 0 ? (matched / bankTxns.length) * 100 : 0}%` }}
            data-testid="reconciliation-bar"
          />
        </div>
        <div className="text-xs mt-1 opacity-70">
          {matched}/{bankTxns.length} จับคู่สำเร็จ
        </div>
      </div>

      {/* Transaction list */}
      <div className="overflow-x-auto rounded-lg border border-oi-border">
        <table className="w-full text-sm" data-testid="bankfeed-table">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-3 py-2 text-left">วันที่</th>
              <th className="px-3 py-2 text-left">รายละเอียด</th>
              <th className="px-3 py-2 text-right">จำนวน</th>
              <th className="px-3 py-2 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {matchResults.map(({ txn, result }) => (
              <tr key={txn.bankTxnId} className="border-t border-oi-border">
                <td className="px-3 py-2 text-xs">{new Date(txn.date).toLocaleDateString('th-TH')}</td>
                <td className="px-3 py-2">{txn.description}</td>
                <td className="px-3 py-2 text-right font-mono">{THB(Number(txn.amount))}</td>
                <td className="px-3 py-2 text-center">
                  {result.status === 'matched' ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-800/40 text-green-300">
                      ✓ จับคู่แล้ว
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-800/40 text-yellow-300">
                      ⏳ รอจับคู่
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function KpiCard({
  label,
  value,
  sub,
  alert = false,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        alert ? 'bg-red-900/10 border-red-500/30' : 'bg-surface-1 border-oi-border'
      }`}
      data-testid={`kpi-${label.replace(/\s/g, '-')}`}
    >
      <div className="text-xs opacity-70">{label}</div>
      <div className={`text-xl font-bold ${alert ? 'text-red-300' : ''}`}>{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}

function StatRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded ${highlight ? 'bg-surface-2' : ''}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className={`font-medium ${highlight ? 'text-lg' : ''}`}>{THB(value)} ฿</div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FinanceDashboard({
  fetchHome = fetchHomeViaFieldSession,
  fieldAppUrl = FIELD_APP_URL,
  ledger = null,
  coa = DAPH_COA,
  receivables = [],
  bankTxns = [],
  ledgerRecords = [],
  initialTab = 'overview',
}: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [home, setHome] = useState<FinanceHomeData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    fetchHome().then(
      (data) => { if (alive) setHome(data); },
      (e: unknown) => { if (alive) setErr(e instanceof Error ? e.message : String(e)); },
    );
    return () => { alive = false; };
  }, [fetchHome]);

  return (
    <div className="p-4 space-y-4 text-sm text-textc-primary max-w-5xl" data-testid="finance-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">💼 Finance Dashboard — DAPH Decor</h2>
      </div>

      {/* Error Banner */}
      {err && activeTab === 'overview' && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
          {err}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-oi-border overflow-x-auto" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'overview' && <OverviewTab home={home} fieldAppUrl={fieldAppUrl} />}
        {activeTab === 'ledger' && <LedgerTab ledger={ledger} coa={coa} />}
        {activeTab === 'receivables' && <ReceivablesTab receivables={receivables} />}
        {activeTab === 'bankfeed' && <BankFeedTab bankTxns={bankTxns} ledgerRecords={ledgerRecords} />}
      </div>
    </div>
  );
}

export default FinanceDashboard;
