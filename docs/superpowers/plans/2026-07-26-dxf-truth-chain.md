# Plan — dxf-truth-chain: ซ่อมโซ่ความจริงการผลิต MONOLITH (FLIP swap + DXF export unification + gate wiring)

**วันที่:** 2026-07-26 · **ฐาน:** `guardrails/claim-linters` @ `55557d7` → build บน local branch `fix/dxf-truth-chain` · **Evidence:** `docs/reports/2026-07-25-monolith-e2e-dxf-dowel-depth-handoff.md` + ledger `.superpowers/sdd/dxf-truth-chain-progress.md` (ผล S0 สิบ agents + orchestrator spot-check)

## ปัญหา

1. **P0-A:** FLIP handover (`generateDrillMap.ts:2028-2079`) จับคู่ synthesized bore ด้วยตำแหน่ง 3D อย่างเดียว → ตู้ INSET flush จาก live store (`useCabinetStore.ts:1716`) เกิด tie แล้ว depth/normal ถูกไขว้ (SIDE face 18mm บนแผ่น 18mm / TOP edge 12mm) — G11 Run Gate แจ้ง 16 blockers ตรงจุดนี้
2. **P0-B:** ปุ่ม DXF บน GateToolbar เรียก `quickDxfExport` (สังเคราะห์รูตาม role, doc ตัวเองระบุ "NOT for production", `exportPipeline.ts:369`) → ชุดไฟล์ Ø5 ล้วน ประกอบตู้ตามแบบมิได้ · ฝั่ง OperationGraph exporter อ่าน truth source ตรง (useDrillMapStore) แต่วาดที่พิกัด world ดิบ (`operationGraphToDxf.ts:296`, `dxfExportFromOperationGraph.ts:147` เรียก build แบบไร้ transform) · RIGHT_SIDE เป็น byte-copy ของ LEFT (convention ระบบ = mirror ในไฟล์ — Face-B logic ใน DXFGenerator) · label T มาจาก option default แทน material จริง (`cabinetToDxf.ts:745`)
3. **Gate wiring:** verdict อยู่ที่ `useGateStore.lastResult` โดยไร้ invalidation เมื่อแก้ตู้ · ExportPanel เช็ค gate ตอน freeze อยู่แล้ว (`ExportPanel.tsx:817-821`) แต่ GateToolbar freeze/export + AppShell upload (`App.tsx:722-737`) มิได้เช็ค — พิสูจน์สด 25 ก.ค.: DXF ออกได้ขณะ gate FAILED

## คำตัดสินเจ้าของ (grill 2026-07-26 — ห้ามเปิดใหม่)

- **Q1=A:** สร้าง projection stage world→panel-local (+mirror ในไฟล์) ให้ OG path แล้วปลด quickDxf จากปุ่มผู้ใช้ทุกจุด (คงไว้เป็น dev-preview ตามที่ G10 quarantine)
- **Q2=O2+O3:** fresh gate PASS เป็นเงื่อนไขทั้ง freeze (ทุก surface, auto-run gate ตอนกด Freeze) และ export/upload actions · freshness key = drillMap object identity (มิใช่ drillMapVersion — หลักฐาน: `setDrillMap` แทนที่ object โดยมิได้ bump version, `useDrillMapStore.ts:301-341`)
- **Q3=A:** panel DXF ใช้ "panel cut size" ตาม formula-reference §3 (finish − edge-band, มิบวก premill) · บันทึกคำตัดสิน D-2 ลง SPECS-RECONCILIATION-NOTES · saw-blank (+premill) เป็น field ชื่อใหม่ในอนาคตถ้าต้องการ

## สมมติฐาน / เงื่อนไขหยุด

- **Baseline ต้องเขียวก่อนเริ่ม T1:** S3 pre-flight รัน `npx vitest run` + `npx tsc -b tsconfig.build.json` + `npm run build` บน tree ปัจจุบัน — ถ้า baseline แดง หยุดรายงานเจ้าของก่อน (tree มีงานหลายสายตั้งแต่ 6 ก.ค.)
- Working tree แชร์กับ dev server :5200 ของเจ้าของ — ทุก commit ระบุไฟล์เจาะจง (มิใช้ `git add -A`) · ไฟล์ dirty เดิม (`docs/superpowers/specs/2026-07-21-...en.md`) ห้ามแตะ
- E2E ต้องรันผ่าน harness path เลี่ยงวงเล็บ `C:\Users\thai3\pw-monoe2e` (Playwright loader ล้มใต้ path มีวงเล็บ — พิสูจน์ 25 ก.ค.)
- ทุก task: REQUIRED SUB-SKILL `superpowers:test-driven-development` · fresh implementer + fresh reviewer · orchestrator รัน full gate เอง · commit โดย orchestrator หลัง review ผ่าน (ห้าม push)

## ภาพรวม task (Parallel-first · spawn แยก sub-agent ต่อ task)

| T | Slice (TDD) | Can run together | Must wait for |
|---|---|---|---|
| T1 | FLIP guard + flush RED fixture | T7 | S3 baseline |
| G1 | **Two-vendor gate #1** (foundation: drill-map truth) | — | T1 |
| T2 | โมดูล world→panel-local projection (+mirror) | T7, T9 | G1 (ใช้ depth ที่ถูกเป็น golden) |
| T3 | ต่อ projection เข้า OG-DXF path + golden ตู้จริง | — | T2 |
| T4 | สลับปุ่ม: GateToolbar→packet path · ExportPanel fallback→hard-fail · label T จาก material จริง | — | T3 |
| T5 | บันทึก D-2 + แก้ docstring stale + stamp นิยามลง annotation | T7, T9 | T3 |
| T6 | Minifix single-source: กัน duplication landmine (panel-tag หรือ ตัด connector-ops ออกจาก DXF path อย่างประกาศ) | T4, T5 | T3 |
| T7 | gateStore freshness key (drillMapRef identity) + selector | T1, T2 | S3 baseline |
| T8 | O2+O3 wiring: freeze ทุก surface + action re-check (GateToolbar/ExportPanel/AppShell) + auto-run gate | — | T4, T7 (ไฟล์ชน GateToolbar กับ T4 — serialize) |
| G2 | **Two-vendor gate #2** (enforcement seam: export+gate) | — | T4, T6, T8 |
| T9 | Test hygiene: T008 assert จริง · silent skip → fail/annotation · panel-select data-testid + driving · comment "RELEASED-only"→FROZEN · title regex ตัด `iimos` | T1, T2, T7 | S3 baseline |
| T10 | Drift cleanup: `getExpectedDowelDepth(panelRole)` + `gateG11_operationGraph.ts:295,358` hardcode → bore-aware/deprecated | — | G1 |
| G3 | **Two-vendor gate #3** (whole feature) + live realtime demo | — | ทุก task |

Race risks ที่ประกาศ: (ก) GateToolbar.tsx ถูกแตะโดย T4 และ T8 → serialize T4→T8 · (ข) ExportPanel.tsx ถูกแตะโดย T4, T8 → รวมการแก้ ExportPanel ฝั่ง gate ไว้ใน T8 เท่านั้น · (ค) generateDrillMap.ts แตะโดย T1 เท่านั้น · (ง) e2e spec แตะโดย T9 เท่านั้น

## Task slices

### T1 — FLIP guard (P0-A)
**REQUIRED SUB-SKILL: superpowers:test-driven-development**
- **RED:** เพิ่ม flush-INSET case ใน `src/core/manufacturing/drillMap/__tests__/cornerEngineFlip.test.ts` — fixture ตู้ 600×720×560 ที่ `horizontalPanelWidth = W − 2*T = 564` (ตรง store `useCabinetStore.ts:1716`; หมายเหตุจาก S0-verify: fixture เดิมใช้ Z=D/2 ตาม convention ไฟล์ test — คง convention นั้น เพราะ Z-translation มิกระทบ tie) · assert: dowel ทุกจุดบนแผ่น SIDE depth=12 + bore FACE, ทุกจุดบนแผ่น HORIZ depth=18 + bore EDGE, normal คู่ mating dot=−1 · คาดผลบนโค้ดปัจจุบัน: **FAIL** (สลับ) — ต้องเห็น fail จริงก่อนแก้
- **GREEN:** ใน handover block `src/core/manufacturing/drillMap/generateDrillMap.ts` (~:2043-2068): สร้าง `roleById` map จาก `cabinet.panels` · คำนวณ `ptClass` ('VERTICAL' สำหรับ LEFT/RIGHT_SIDE, 'HORIZONTAL' สำหรับ TOP/BOTTOM, `null` อื่น) · เพิ่ม filter หนึ่งบรรทัดหลังเช็ค kind/corner: `if (ptClass !== null && b.panel !== ptClass) continue;` (`SynthesizedBore.panel` มีแล้ว — `worldSynthesis.ts:44`) · **ห้าม**เพิ่ม pairId-suffix/normal-dot เป็นเงื่อนไข match (S0: normal-dot กลับทิศ authority)
- **REFACTOR:** เพิ่ม breakdown per kind×class ใน log mismatch เดิม (:2080)
- **Files:** generateDrillMap.ts · cornerEngineFlip.test.ts
- **Verification (orchestrator รันเอง):** `npx vitest run src/core/manufacturing/drillMap src/core/connector src/gate` แล้วตาม full: `npx vitest run` + `npx tsc -b tsconfig.build.json` — expected: exit 0 ทุกคำสั่ง · แล้วเปิด Browser pane กด Run Gate บนตู้ default — expected เห็นบนจอ: dowel-depth blockers = 0 (จาก 16)

### T2 — โมดูล projection world→panel-local
- **RED:** test ใหม่ `src/core/export/__tests__/panelLocalProjection.test.ts` — สร้าง drill map จริงจากตู้ default (มิ mock `buildOperationGraph`) แล้ว assert: จุดของ LEFT_SIDE ตกใน [0..W]×[0..H] ของแผ่นตัวเอง · จุด TOP อยู่ในกรอบ TOP · **RIGHT_SIDE mirror แล้วมิ byte-เท่ากับ LEFT** โดย groove/feature ห่างขอบหลังเท่ากันทั้งคู่ · edge-bore (normal ขนานผิวแผ่น) ถูกแทนด้วย marker/พิกัดขอบพร้อม H/V ใน layer name
- **GREEN:** ไฟล์ใหม่ `src/core/export/panelLocalProjection.ts` — inverse ของ `panelBasis` (มี forward `getPanelBasisFromAABB`/`panelLocalToWorld` แล้ว — `panelBasis.ts:187,340`) + mirror RIGHT ตาม convention Face-A ในไฟล์ (S0 mirror-convention: DEFECT verdict, spec.md:377/Production.ts:6-7/DXFGenerator.ts:425 เป็นแนวเทียบ)
- **Files:** panelLocalProjection.ts (ใหม่) + test ใหม่ — มิแตะไฟล์ใครอื่น
- **Verification:** scoped + full vitest + tsc — expected: exit 0

### T3 — ต่อ projection เข้า OG-DXF + golden ตู้จริง
- **RED:** golden test ใหม่: build packet จาก store ตู้ default → `exportDxfFromPacket` → parse DXF จริง — assert ต่อแผ่น: SIDE มี CIRCLE Ø8 ≥ 4 (corner dowels) + Ø15 ตามจำนวน cam ใน drill map + Ø5 shelf columns · TOP/BOTTOM มี pattern ฝั่งตรงข้าม mate กับ SIDE (พิกัดตรงกันเมื่อประกอบ) · RIGHT mirror จริง · จุดทุกจุดอยู่ในกรอบ outline ของแผ่นตัวเอง — คาด FAIL บนโค้ดปัจจุบัน (world-coord)
- **GREEN:** แทรก projection stage ระหว่าง packet drill map → `operationGraphToDxf` (จุดต่อใน `dxfExportFromOperationGraph.ts` ~:147-185) · ตัด test เดิมที่ enshrine world-passthrough (`mapDrillMapToOps.drillmap-forward.test.ts:199`) ให้สอดคล้องดีไซน์ใหม่โดยบันทึกเหตุใน commit message
- **Files:** dxfExportFromOperationGraph.ts · operationGraphToDxf.ts (layer naming H/V) · test golden ใหม่ · mapDrillMapToOps.drillmap-forward.test.ts
- **Verification:** full vitest + tsc + build — expected: exit 0

### T4 — สลับปุ่มผู้ใช้ + label ความหนา per-panel
- **RED:** unit/component test: GateToolbar DXF menu → เรียก packet path (spy) · ExportPanel เมื่อ packet ล้ม → error ที่ผู้ใช้เห็น (มิ silent-degrade — เดิม `ExportPanel.tsx:907` console.warn เท่านั้น) · label/filename ของ BACK = 6mm ตาม `panel.computed.realThickness`
- **GREEN:** GateToolbar :99-109 → `generateFactoryPacketFromStores` + `downloadDxfZipFromPacket` (multi-cabinet: loop ต่อ cabinet ตามผล S0-quickdxf; ถ้า packet ต่อ >1 cabinet ยังมิรองรับ ให้แสดงข้อความบอกขอบเขตแทนการเงียบ) · fallback :907 → hard-fail · `cabinetToDxf.ts:745` `cutDim.t` ← per-panel core thickness (dev-preview ก็ถูกไปด้วย)
- **Files:** GateToolbar.tsx · ExportPanel.tsx (เฉพาะจุด fallback/เรียก path — ส่วน gate รอ T8) · cabinetToDxf.ts · tests
- **Verification:** full vitest + tsc + build — expected: exit 0 · Browser pane: Freeze → Export → DXF แล้วอ่านไฟล์จริงนับ Ø8/Ø15 (คำสั่ง grep CIRCLE ตามรายงาน §4A) — expected: มี joinery ครบตาม drill map

### T5 — บันทึกคำตัดสิน D-2 + stamp นิยาม
- docs/config-only exception (มิมี behavior ใหม่นอกจาก annotation): เพิ่มบรรทัดนิยาม "panel cut size (finish − edge-band; premill มิรวม — formula-reference §3, D-2 ruling 2026-07-26)" ใน DXF annotation + manifest ของ path ใหม่ · แก้ docstring stale `Cabinet.ts:754-773` ให้ตรง implementation · เพิ่มข้อ D-2-RESOLVED ใน `docs/SPECS-RECONCILIATION-NOTES.md`
- **Verification:** golden T3 อัปเดต expected annotation · full vitest — expected: exit 0

### T6 — Minifix single-source
- **RED:** test assert ว่า DXF path มิ emit รูซ้ำเมื่อ connector-ops ได้ workpieceContext ในอนาคต (กับระเบิดจาก S0: `mapMinifixToOps.ts:194-238` ไร้ context + filter `dxfExportFromOperationGraph.ts:183-185`)
- **GREEN:** ประกาศ single source = drill-map points สำหรับ DXF path: กรอง connector-sourced ops ออกจาก DXF อย่างชัดเจน (มิใช่ผลข้างเคียงของ context ที่หายไป) + คอมเมนต์อ้าง ADR
- **Files:** dxfExportFromOperationGraph.ts หรือ mapMinifixToOps.ts + test
- **Verification:** full vitest + tsc — expected: exit 0

### T7 — gateStore freshness key
- **RED:** store test: `setResult` เก็บ `drillMapRef` · หลัง `setDrillMap`/regenerate object ใหม่ → `isFresh()` = false · reset/persist migration มิหลอก fresh
- **GREEN:** `gateStore.ts` เพิ่ม drillMapRef (identity ของ object จาก `useDrillMapStore.getState().drillMap`) + selector `useExportGate` เปิดเผย `{hasRun, blockerCount, fresh}`
- **Files:** gateStore.ts + test — มิแตะ UI (รอ T8)
- **Verification:** full vitest + tsc — expected: exit 0

### T8 — O2+O3 wiring (คำตัดสิน Q2)
- **RED:** component/unit tests: (ก) GateToolbar Freeze เมื่อ gate มิ fresh → auto-run gate ก่อน แล้ว block ถ้า blockerCount>0 พร้อมเหตุผลบนจอ (ข) `GateToolbar.handleExport` (:67) / ExportPanel dxf+cnc (:829,:856) / AppShell upload (`App.tsx:722-737`) เมื่อ gate มิ fresh หรือ FAIL → block + ข้อความชี้ไป Run Gate (ค) เมื่อ fresh PASS → เดินตามปกติ
- **GREEN:** เดินสายทุก surface ผ่าน `useExportGate` จาก T7 · ExportPanel ฝั่ง freeze มี logic อยู่แล้ว (:817-821) — เติม freshness เข้าเงื่อนไขเดิม
- **Files:** GateToolbar.tsx · ExportPanel.tsx · App.tsx · tests (serialize หลัง T4 เพราะชนไฟล์)
- **Verification:** full vitest + tsc + build — expected: exit 0 · Browser pane demo: แก้ตู้ → Freeze → เห็น auto-run gate + block/ผ่านตามจริง (screenshot เข้า ledger)

### T9 — Test hygiene (e2e + unit)
- แก้ใน repo spec จริง `e2e/dxf-export.spec.ts`: T008 เปลี่ยนเป็น assert (`expect(opGraphLogs.length).toBeGreaterThan(0)` — path ใหม่ต้อง log source marker; เพิ่ม log ใน exporter ถ้ายังมิมี) · silent `test.skip()` → `test.fail()`/annotation ที่มองเห็น · panel-select: เพิ่ม `data-testid={\`panel-select-${panel.id}\`}` ที่ `ExportPanel.tsx` PanelRow (~:570) + beforeEach ตั้ง role FACTORY + เปิดแท็บ Export + freeze แล้วใช้ selector ขาเดียว · comment :151 "RELEASED-only" → FROZEN-gated · `cabinet.spec.ts:18` ตัด `iimos` ออกจาก title regex (ชื่อเลิกใช้)
- **Race:** แตะ ExportPanel แค่บรรทัด data-testid — ประสานกับ T8 (ทำหลัง T8 merge หรือแจ้ง orchestrator เลือกลำดับ)
- **Verification:** `cd C:\Users\thai3\pw-monoe2e` (sync spec จาก repo ก่อน) → รัน chromium headed — expected: dxf suite เขียวโดยจำนวน skip ลดลงตามที่แก้ · full vitest + tsc — expected: exit 0

### T10 — Drift cleanup (SAT-5)
- **RED:** tests ที่ยืนยันพฤติกรรม bore-aware: `gateG11_operationGraph` ต้อง expect ตาม bore type (มิ hardcode SIDE=18/HORIZ=12 ที่ :295,:358) · `getExpectedDowelDepth(panelRole)` deprecated/ลบ พร้อมแก้ผู้เรียก+test เดิม (:171-179 ใน test เดิม)
- **GREEN:** ปรับสองไฟล์ + index export
- **Verification:** full vitest + tsc — expected: exit 0

### Gates
- **G1 (หลัง T1):** two-vendor — lens: invariant depth/normal ทุก corner ทุก construction (INSET/OVERLAY, tuck/flush), regression B-run, authority direction · vendors: codex GPT-5.6 Sol (read-only, stdin) + Claude multi-lens workflow · orchestrator adjudicate + รัน full gate ซ้ำ
- **G2 (หลัง T4+T6+T8):** lens: export truth-chain end-to-end (store→packet→projection→DXF), gate bypass hunt ทุก surface (รวม header AppShell + `guardedExport` ที่ยังมิ wired — ตัดสินใน gate ว่า in-scope หรือบันทึกเป็น flag), freshness race (แก้ตู้ระหว่าง export)
- **G3 (ก่อนปิด):** whole-feature: cross-layer drift (types/edge/docs), coverage จริงของ goldens, honest bounds + **live realtime demo ครบวงจร** (Run Gate 0 blockers → Freeze auto-gate → Export → เปิดไฟล์นับ entity → ภาพให้เจ้าของ)

## Final gate ของแผน
- ทุก implementation task มี RED ก่อน (T5 = docs/annotation exception ระบุแล้ว) · ทุก task ระบุไฟล์/dependency/race/คำสั่ง verify · ไม่มี task สั่ง push — commit โดย orchestrator เท่านั้น · unresolved: (ก) multi-cabinet packet loop — T4 ตรวจก่อนทำ ถ้าเกิน scope ให้แสดงข้อความขอบเขตแทน (ข) `guardedExport`/`canExportJob` ที่ unwired — ยกเข้า G2 เพื่อวินิจฉัย in-scope/flag
