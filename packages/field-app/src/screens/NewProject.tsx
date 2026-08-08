import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function NewProject({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [ptype, setPtype] = useState<'new_build' | 'renovation'>('new_build');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const idempotencyKey = useRef(
    globalThis.crypto?.randomUUID?.() ?? `field-open-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  async function create() {
    setBusy(true); setErr('');
    try {
      const { error } = await supabase().rpc('rpc_open_customer_job', {
        p_request: {
          project_display_name: name.trim(),
          project_type: ptype,
        },
        p_idempotency_key: idempotencyKey.current,
      });
      if (error) { setErr(error.message); return; }
      onDone();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'เปิดโครงการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เปิดบ้านใหม่</h2>
        <label>ชื่อบ้าน (ที่ทีมเรียกกัน)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="บ้านคุณสมชาย รามอินทรา" />
        <label style={{ marginTop: 8 }}>ประเภทงาน</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['new_build', '🏠 บ้าน/คอนโดใหม่'], ['renovation', '🛠️ รีโนเวท']] as const).map(([k, label]) => (
            <button key={k} className="btn btn-ghost"
              style={{ flex: 1, minHeight: 44, borderColor: ptype === k ? 'var(--brand)' : undefined, fontWeight: ptype === k ? 700 : 400 }}
              onClick={() => setPtype(k)}>{label}</button>
          ))}
        </div>
        {ptype === 'renovation' && (
          <p className="muted">งานรีโนเวท: ตอนจบวัดระบบจะให้เช็คสภาพโครงสร้างเดิม/ไฟเก่า/ขอบเขตรื้อถอนก่อนส่งมอบ — กันงานงอกที่ลูกค้าไม่ได้ตกลง</p>
        )}
        <p className="muted">ระบบจะสร้างห้องมาตรฐาน 5 ห้อง (ครัว · นั่งเล่น · นอนใหญ่ · นอน 2 · นอน 3) พร้อมเลนช่าง 3 คนต่อห้อง — ปรับได้ภายหลัง</p>
        <button className="btn btn-primary" onClick={create} disabled={!name.trim() || busy}>
          {busy ? 'กำลังสร้าง…' : 'สร้างบ้าน + ห้องมาตรฐาน'}
        </button>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-ghost" onClick={onDone}>ย้อนกลับ</button>
      </div>
    </div>
  );
}
