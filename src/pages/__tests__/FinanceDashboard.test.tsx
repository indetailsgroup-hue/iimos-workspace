/** @vitest-environment jsdom */
/**
 * FinanceDashboard.test.ts — Unit tests for Finance Dashboard UI
 * Tests all 4 tabs: Overview, Ledger, Receivables, Bank Feed
 * @version 14.0.0
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { FinanceDashboard } from '../FinanceDashboard';
import type { FinanceHomeData } from '../FinanceDashboard';
import type { MultiBookLedger, BookEntry } from '../../ledger/multibook';
import { emptyLedger, post } from '../../ledger/multibook';
import type { Receivable } from '../../ledger/receivables';
import type { BankTxn, LedgerRecord } from '../../ledger/bankfeed';

// ============================================================================
// Fixtures
// ============================================================================

const mockHomeData: FinanceHomeData = {
  awaiting: [
    {
      installment_id: 'inst-001',
      project_id: 'proj-001',
      name: 'โปรเจค A — ครัวบิวท์อิน',
      seq: 2,
      label: 'งวดที่ 2',
      amount: 45000,
      days_waiting: 5,
      has_slip: false,
    },
    {
      installment_id: 'inst-002',
      project_id: 'proj-002',
      name: 'โปรเจค B — ตู้เสื้อผ้า',
      seq: 1,
      label: 'งวดที่ 1',
      amount: 30000,
      days_waiting: 2,
      has_slip: true,
    },
  ],
  overdue: [
    {
      installment_id: 'inst-003',
      project_id: 'proj-003',
      name: 'โปรเจค C — ห้องน้ำ',
      seq: 3,
      label: 'งวดที่ 3',
      amount: 20000,
      days_waiting: 45,
    },
  ],
  received_today: { count: 3, total: 85000 },
};

function buildTestLedger(): MultiBookLedger {
  let ledger = emptyLedger();
  const entry: BookEntry = {
    entryId: 'e-001',
    bookId: 'internal',
    lines: [
      { account_code: '1000', debit: 100000, credit: 0 },
      { account_code: '4000', debit: 0, credit: 100000 },
    ],
  };
  ledger = post(ledger, entry);
  const entry2: BookEntry = {
    entryId: 'e-002',
    bookId: 'internal',
    lines: [
      { account_code: '5000', debit: 40000, credit: 0 },
      { account_code: '1000', debit: 0, credit: 40000 },
    ],
  };
  ledger = post(ledger, entry2);
  return ledger;
}

const mockReceivables: Receivable[] = [
  { id: 'rcv-001', dueDate: '2024-01-15', amount: 50000, paid: 50000 },
  { id: 'rcv-002', dueDate: '2024-06-30', amount: 75000, paid: 20000 },
  { id: 'rcv-003', dueDate: '2020-01-01', amount: 30000, paid: 0 }, // overdue
];

const mockBankTxns: BankTxn[] = [
  { bankTxnId: 'btx-001', date: '2024-03-15', amount: 100000, description: 'รับเงินจากลูกค้า A' },
  { bankTxnId: 'btx-002', date: '2024-03-16', amount: 45000, description: 'รับเงินจากลูกค้า B' },
  { bankTxnId: 'btx-003', date: '2024-03-17', amount: 12000, description: 'จ่ายค่าวัสดุ' },
];

const mockLedgerRecords: LedgerRecord[] = [
  { entryId: 'e-001', date: '2024-03-15', amount: 100000 }, // matches btx-001
  { entryId: 'e-005', date: '2024-03-20', amount: 8000 },  // no match
];

// ============================================================================
// Tests
// ============================================================================

describe('FinanceDashboard', () => {
  const mockFetchHome = vi.fn<[], Promise<FinanceHomeData>>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHome.mockResolvedValue(mockHomeData);
  });

  afterEach(() => {
    cleanup();
  });

  // --------------------------------------------------------------------------
  // Rendering & Tabs
  // --------------------------------------------------------------------------

  it('renders dashboard with tab bar', async () => {
    render(<FinanceDashboard fetchHome={mockFetchHome} />);
    expect(screen.getByTestId('finance-dashboard')).toBeDefined();
    expect(screen.getByTestId('tab-overview')).toBeDefined();
    expect(screen.getByTestId('tab-ledger')).toBeDefined();
    expect(screen.getByTestId('tab-receivables')).toBeDefined();
    expect(screen.getByTestId('tab-bankfeed')).toBeDefined();
  });

  it('shows Overview tab by default and loads data', async () => {
    render(<FinanceDashboard fetchHome={mockFetchHome} />);
    await waitFor(() => {
      // 45000+30000=75000 outstanding
      expect(screen.getAllByText(/75,000/).length).toBeGreaterThan(0);
    });
    // received today 85000
    expect(screen.getAllByText(/85,000/).length).toBeGreaterThan(0);
    expect(screen.getByText('โปรเจค A — ครัวบิวท์อิน')).toBeDefined();
    // Overdue items render with emoji prefix so use regex
    expect(screen.getByText(/โปรเจค C — ห้องน้ำ/)).toBeDefined();
  });

  it('shows error state when fetch fails', async () => {
    mockFetchHome.mockRejectedValue(new Error('session expired'));
    render(<FinanceDashboard fetchHome={mockFetchHome} />);
    await waitFor(() => {
      expect(screen.getByText('session expired')).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Tab 2: Ledger
  // --------------------------------------------------------------------------

  describe('Ledger Tab', () => {
    it('shows empty state when no ledger data', () => {
      render(
        <FinanceDashboard fetchHome={mockFetchHome} initialTab="ledger" />,
      );
      expect(screen.getByText(/ยังไม่มีข้อมูลบัญชี/)).toBeDefined();
    });

    it('shows book summary when ledger is provided', () => {
      const ledger = buildTestLedger();
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          ledger={ledger}
          initialTab="ledger"
        />,
      );
      // 2 entries in internal book
      const entryCountKpi = screen.getByTestId('kpi-จำนวนรายการ');
      expect(entryCountKpi.textContent).toContain('2');
      // totalDebit: 100000+40000 = 140,000
      expect(screen.getAllByText(/140,000/).length).toBeGreaterThanOrEqual(2);
    });

    it('shows statutory statement with book and format selectors', () => {
      const ledger = buildTestLedger();
      const coa = { '1000': 'asset' as const, '4000': 'revenue' as const, '5000': 'expense' as const };
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          ledger={ledger}
          coa={coa}
          initialTab="ledger"
        />,
      );
      expect(screen.getByTestId('book-selector')).toBeDefined();
      expect(screen.getByTestId('format-selector')).toBeDefined();
      // Should show statutory section labels
      expect(screen.getByText(/สินทรัพย์ \(Assets\)/)).toBeDefined();
      expect(screen.getByText(/รายได้ \(Revenue\)/)).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Tab 3: Receivables
  // --------------------------------------------------------------------------

  describe('Receivables Tab', () => {
    it('shows empty state when no receivables', () => {
      render(
        <FinanceDashboard fetchHome={mockFetchHome} initialTab="receivables" />,
      );
      expect(screen.getByText(/ยังไม่มีข้อมูลลูกหนี้/)).toBeDefined();
    });

    it('renders receivables table with correct data', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          receivables={mockReceivables}
          initialTab="receivables"
        />,
      );
      expect(screen.getByTestId('receivables-table')).toBeDefined();
      expect(screen.getByTestId('receivable-row-rcv-001')).toBeDefined();
      expect(screen.getByTestId('receivable-row-rcv-002')).toBeDefined();
      expect(screen.getByTestId('receivable-row-rcv-003')).toBeDefined();
    });

    it('shows overdue count in KPI', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          receivables={mockReceivables}
          initialTab="receivables"
        />,
      );
      // rcv-003 is overdue (dueDate 2020-01-01, paid=0) + rcv-002 might be overdue too
      // Find the overdue KPI by looking for the alert-styled card
      const kpis = screen.getAllByText(/เกินกำหนด/);
      expect(kpis.length).toBeGreaterThan(0);
    });

    it('filters to show only overdue when checkbox toggled', async () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          receivables={mockReceivables}
          initialTab="receivables"
        />,
      );
      const checkbox = screen.getByTestId('overdue-filter');
      // Before filter: all 3 rows visible
      expect(screen.getByTestId('receivable-row-rcv-001')).toBeDefined();
      expect(screen.getByTestId('receivable-row-rcv-003')).toBeDefined();
      // Toggle filter
      fireEvent.click(checkbox);
      await waitFor(() => {
        // rcv-003 should still be visible (overdue) 
        expect(screen.getByTestId('receivable-row-rcv-003')).toBeDefined();
        // rcv-001 is paid fully — should be gone
        expect(screen.queryByTestId('receivable-row-rcv-001')).toBeNull();
      });
    });

    it('highlights overdue rows with status badge', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          receivables={mockReceivables}
          initialTab="receivables"
        />,
      );
      // rcv-001 is paid in full → "ชำระครบ"
      const row1 = screen.getByTestId('receivable-row-rcv-001');
      expect(within(row1).getByText('ชำระครบ')).toBeDefined();
      // rcv-003 is overdue
      const row3 = screen.getByTestId('receivable-row-rcv-003');
      expect(within(row3).getByText('เกินกำหนด')).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Tab 4: Bank Feed
  // --------------------------------------------------------------------------

  describe('Bank Feed Tab', () => {
    it('shows empty state when no bank txns', () => {
      render(
        <FinanceDashboard fetchHome={mockFetchHome} initialTab="bankfeed" />,
      );
      expect(screen.getByText(/ยังไม่มีข้อมูล Bank Feed/)).toBeDefined();
    });

    it('renders bank feed table with match results', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          bankTxns={mockBankTxns}
          ledgerRecords={mockLedgerRecords}
          initialTab="bankfeed"
        />,
      );
      expect(screen.getByTestId('bankfeed-table')).toBeDefined();
      // btx-001 should be matched (same date + amount as e-001)
      const table = screen.getByTestId('bankfeed-table');
      expect(within(table).getAllByText(/จับคู่แล้ว/).length).toBe(1);
      // btx-002, btx-003 should be pending
      expect(within(table).getAllByText(/รอจับคู่/).length).toBe(2);
    });

    it('shows reconciliation progress bar', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          bankTxns={mockBankTxns}
          ledgerRecords={mockLedgerRecords}
          initialTab="bankfeed"
        />,
      );
      const bar = screen.getByTestId('reconciliation-bar');
      expect(bar).toBeDefined();
      // 1 out of 3 matched
      expect(screen.getByText('1/3 จับคู่สำเร็จ')).toBeDefined();
    });

    it('shows correct KPI counts', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          bankTxns={mockBankTxns}
          ledgerRecords={mockLedgerRecords}
          initialTab="bankfeed"
        />,
      );
      // "ธุรกรรมทั้งหมด" KPI should show 3
      const totalKpi = screen.getByTestId('kpi-ธุรกรรมทั้งหมด');
      expect(totalKpi.textContent).toContain('3');
      // "จับคู่แล้ว" KPI should show 1
      const matchedKpi = screen.getByTestId('kpi-จับคู่แล้ว');
      expect(matchedKpi.textContent).toContain('1');
    });
  });

  // --------------------------------------------------------------------------
  // Tab Switching
  // --------------------------------------------------------------------------

  describe('Tab navigation', () => {
    it('switches tabs on click', async () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          receivables={mockReceivables}
        />,
      );
      // Start on overview — wait for data to load
      await waitFor(() => {
        expect(screen.getByText('โปรเจค A — ครัวบิวท์อิน')).toBeDefined();
      });
      // Switch to receivables
      fireEvent.click(screen.getByTestId('tab-receivables'));
      expect(screen.getByTestId('receivables-table')).toBeDefined();
      // Switch to bank feed (empty state)
      fireEvent.click(screen.getByTestId('tab-bankfeed'));
      expect(screen.getByText(/ยังไม่มีข้อมูล Bank Feed/)).toBeDefined();
    });

    it('supports initialTab prop', () => {
      render(
        <FinanceDashboard
          fetchHome={mockFetchHome}
          receivables={mockReceivables}
          initialTab="receivables"
        />,
      );
      expect(screen.getByTestId('receivables-table')).toBeDefined();
    });
  });
});
