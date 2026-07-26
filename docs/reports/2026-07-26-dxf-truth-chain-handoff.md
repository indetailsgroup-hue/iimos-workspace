# Handoff — MONOLITH `dxf-truth-chain` (gated-feature-build)

**วันที่:** 2026-07-26 · **Branch:** `fix/dxf-truth-chain` (nested repo `determined-williams/`) · **ฐาน:** `59f61e57` → **HEAD `b38d7f4d`** · **ยังไม่ push, ยังไม่ merge**
**ที่มา:** รายงาน `docs/reports/2026-07-25-monolith-e2e-dxf-dowel-depth-handoff.md` §4A — เจ้าของเปิดไฟล์ DXF ที่ระบบส่งออกแล้วพบว่า **ประกอบตู้ไม่ได้** (มีแต่รู Ø5 ไม่มี joinery)
**Ledger เต็ม (ทุกคำวินิจฉัย/RED/mutation/gate):** `.superpowers/sdd/dxf-truth-chain-progress.md`
**แผน:** `docs/superpowers/plans/2026-07-26-dxf-truth-chain.md`

---

## 1. Executive summary (EN)

This build replaced the user-facing DXF path, corrected the drill-map truth it draws from, and gave the Safety Gate real authority over freeze and export. Five manufacturing defects were found and closed, four of them capable of producing physically wrong holes; a sixth system (B-run) was retired on the owner's ruling after its corrected geometry proved to collide with the Minifix bolt channels.

Every task ran RED-first with a fresh reviewer, and the orchestrator re-ran the whole suite plus typecheck and build before each commit. Two adversarial gates ran: G1 (two vendors, foundation) and G2 (GPT-5.6 Sol, enforcement seam). G2 ruled the "nothing unverified leaves the app" invariant **false** at that point; four of its findings are fixed in `b38d7f4d`, and the remaining unguarded surfaces are listed in §6 as owner-visible debt rather than silently closed.

**Not yet verified:** the end-to-end live demonstration (Run Gate → Freeze → Export → open in AutoCAD) — see §5.

---

## 2. บั๊กการผลิตที่ปิดไปแล้ว (ทั้งหมดพิสูจน์ด้วย RED ก่อนแก้)

| # | บั๊ก | ผลทางกายภาพถ้าไม่แก้ | หลักฐาน / commit |
|---|---|---|---|
| 1 | **FLIP handover สลับความลึก dowel** — matcher จับคู่ด้วยตำแหน่ง 3D อย่างเดียว; ตู้ INSET flush จากสโตร์ทำให้ dowel คู่ mating ทับตำแหน่งกัน → tie → depth/normal ไขว้ | SIDE face bore **18mm บนแผ่นหนา 18mm = เจาะทะลุ**; TOP edge bore 12mm = ข้อต่ออ่อน | `1c2c0ddf` + `c75870cc` · RED เห็น `expected 18 to be 12` · reviewer mutation-check ยืนยัน |
| 2 | **B-run dowel** — เกิดมาผิด (รูอยู่นอกตัวแผ่น side 28mm+, รูซ้ำตำแหน่ง 8 คู่) และเมื่อแก้ตำแหน่งให้ถูกกลับ **ชนช่อง bolt ของ Minifix ทุกมุม** | รูเจาะบนขอบโชว์ที่ไม่ mate กับอะไร + dowel ขวาง bolt | `46f7d2de` (retire ตาม ruling Q6=A) · golden 96→80 จุด |
| 3 | **G11 role-based depth drift** — `getExpectedDowelDepth(panelRole)` ใช้ได้เฉพาะ INSET A-run | gate ตัดสินความลึกผิดสำหรับ OVERLAY/B-run | `c1303030` (ลบทิ้ง, grep-proof ศูนย์ caller) |
| 4 | **Z-normal จำแนก bore ผิด** — `inferBoreTypeFromNormal` ไม่มีเคส BACK และจัดแกน Z ผิดทาง | **22 false blockers** บนตู้ OVERLAY+แผ่นหลังที่ generator ถูก + **trap เงียบ**: bolt ที่เจาะผิดที่กลับผ่าน gate | `256ff700` · empirical reproduction 22 ดอก |
| 5 | **G11.5 cam pocket ผิดฐาน** — gate ใช้ `camDepth/2` (6.75) แต่ช่อง bolt จริงอยู่ที่ dimA (9mm ตาม `CAM_DRILLING_SPECS` ทั้ง 10 แถว) และเช็คเฉพาะ deltaX | false blockers ทุกตู้ OVERLAY/BACK (2.25mm) + dado-INSET (9.00mm) และ **error เดียวกันซ่อนไม่ถูกเช็คในแกน Y** | `60b0a0ff` · reviewer ตรวจมือจาก golden ยืนยันเลขทุกตัว |

**หลังข้อ 3-5:** Safety Gate รายงานศูนย์ blockers บนตู้ที่ generator สร้างถูก **ครบทั้งสามตระกูล** (INSET, OVERLAY, OVERLAY+BACK) — pinned ใน `gateG11_boltCamAlignment.test.ts`

## 3. เส้นทาง DXF ที่เปลี่ยนไป (ต้นเหตุที่เจ้าของจับได้)

- **เดิม:** ปุ่ม DXF ของผู้ใช้เรียก `quickDxfExport` ซึ่งสังเคราะห์รูตาม role โดย**ไม่อ่าน drill map** — เอกสารในโค้ดเองระบุ "NOT for production" และ G10 static scan กักไว้เป็น bypass source
- **ปัจจุบัน:** ปุ่มทุกจุดเดินผ่าน packet → OperationGraph → **panel-local projection ตัวใหม่** (`240ca9b4`) → writer (`9604decf`, `bc1eb974`)
  - รูทุกจุดถูกฉายเข้าเฟรมของแผ่นตัวเอง (เดิมวาดที่พิกัด world ดิบ — รูของ TOP ตกนอกกรอบตัวเอง)
  - **mirror ในไฟล์** ตาม ruling Q5 (RIGHT_SIDE และ TOP) — เดิม RIGHT_SIDE เป็น byte-copy ของ LEFT
  - ป้ายความหนา **ต่อแผ่นตามวัสดุจริง** (แผ่นหลัง mdf-6 สลัก `T=6mm` ไม่ใช่ 18)
  - สลักนิยามขนาดตาม ruling Q3: `panel cut size (finish - edge band, no premill) — formula-reference §3, D-2 ruling 2026-07-26`
  - **fail-closed:** จุดเจาะที่วาดไม่ได้จะถูกรายงาน (`skipped`) และ **ไม่ส่งไฟล์** — บังคับที่ตัว export layer เอง (`b38d7f4d`) ไม่ใช่พึ่ง caller
  - เลิกใช้ fallback เงียบไป legacy; multi-cabinet แจ้งขอบเขตแทนการตัดทิ้งเงียบ

## 4. Safety Gate มีอำนาจจริง (ruling Q2 = O2+O3)

- `canFreeze/canRelease/canExport` ต้องการ verdict ที่ **blockerCount = 0 + สดสำหรับ drill map ปัจจุบัน (object identity) + `isRunning` เป็นเท็จ** (`79dd465a`, `b38d7f4d`) — pinned ใน `gateEnforcement.test.ts` 8 เคส:

```console
$ node node_modules/vitest/vitest.mjs run src/gate/ui/__tests__/gateEnforcement.test.ts
      Tests  8 passed (8)
```
- **vacuous PASS ปิดแล้ว** — validator ทั้งสามคืน PASS เมื่อ drill map เป็น null; verdict แบบนั้นบันทึก ref เป็น null จึงไม่มีวัน fresh
- ปุ่ม Freeze **auto-run gate** เมื่อ verdict ไม่สด แล้วปฏิเสธพร้อมเหตุผลที่แยกกรณี (`f5bb4445`)
- validator crash → บันทึก crash เป็น verdict (fail closed) แทนการคง verdict เก่าไว้ใช้อนุมัติ

**พิสูจน์สดบนแอปจริง 2026-07-26:** โหลดใหม่ → Run Gate ได้ `PASS (0 blockers)` แต่เป็นเคส vacuous (ConnectorOS 0 joints) → กด Freeze → ระบบ auto-run แล้วขึ้น `Cannot freeze — the cabinet changed since the last Safety Gate run.` badge คง `DRAFT` · **เคสเดียวกันนี้ก่อน build จะ freeze ผ่านเงียบ ๆ**

## 5. ขอบเขตการตรวจสอบ — อะไรพิสูจน์แล้ว อะไรยัง

**พิสูจน์ในเครื่องนี้แล้ว:** vitest **273 test files** ผ่าน (รันโดย orchestrator เองก่อนทุก commit) · `tsc -p tsconfig.json --noEmit` exit 0 · `vite build` exit 0 · mutation check ราย task (ปิด guard → เทสต์ต้องแดง → คืน → sha ตรง)

**ยังไม่ได้พิสูจน์ (UNVERIFIED-by-environment) — ห้ามอ้างว่าเสร็จ:**
1. **Live end-to-end ใน AutoCAD** — Browser pane ถูกซ่อนระหว่าง session ทำให้ Three.js ไม่ composite และ effect ที่สร้าง drill map ไม่ทำงาน → drill map ว่าง จึงยัง export ไฟล์จริงที่มี joinery ครบไม่ได้ในรอบนี้ (หลักฐานที่มีคือ golden test ซึ่ง parse เนื้อ DXF จริงจาก packet จริง) — **ต้องทำซ้ำตอนเปิด pane**
2. **CI** — branch ยังไม่ push
3. **E2E Playwright** — รันได้เฉพาะ harness นอก repo (`C:\Users\thai3\pw-monoe2e`) เพราะ path ของ repo มีวงเล็บทำ loader ล้ม; รอบนี้ยังไม่ได้รันซ้ำหลังการเปลี่ยนแปลงทั้งหมด
4. **G3 whole-feature gate** ยังไม่ได้ทำ
5. **ตู้จริงหลายทรง** — เทสต์ครอบ 600×720×560 (INSET/OVERLAY/BACK) เป็นหลัก

## 6. หนี้ที่เปิดไว้ให้เจ้าของเห็น (จาก G2 — ยังไม่แก้)

G2 (GPT-5.6 Sol) ตัดสินว่า invariant "ไม่มีอะไรที่ยังไม่ตรวจหลุดออกจากแอป" **ยังไม่จริง** — 4 ข้อที่เป็นโค้ดของ build นี้แก้แล้วใน `b38d7f4d` ที่เหลือคือ:

| Surface | สภาพ | หมายเหตุ |
|---|---|---|
| `ExportPanel.handleExport` (dxf/cnc/cutlist/bom) | เรียก `useExportGate` แต่ **ไม่ได้เช็คใน handler** | freeze ของ panel นี้ถูกกันแล้ว (กิน canFreeze) แต่ปุ่ม export ยังไม่ |
| ExportPanel factory-packet + cached-preview download | ไม่ผ่าน gate | |
| `App.tsx handleExport` (packet upload) + ปุ่มใน AppShell header | ไม่ผ่าน Safety Gate (ใช้ SpecStore gate เดิม) | |
| **`SketchOverlay.tsx:468-493`** | export DXF ตรงผ่าน `flatPartToDxfR12` + `saveDxfFile` **ไร้ gate ไร้ projection** — ตรวจแล้วว่ามีจริงและ mounted | เป็นคนละ artifact (sketch flat part ไม่ใช่แผ่นตู้ที่มี drill map) → **ต้องการคำตัดสินเจ้าของว่าควรอยู่ในขอบเขต gate หรือไม่** |
| `ReleaseWizardModal` | ถือว่า zero blockers พอ ไม่ดู freshness | ยัง unrouted แต่จะเป็นทางเลี่ยงทันทีที่ mount |
| `exportWorker` / `guardedExport` | ใช้ trust ของ manifest/job เก่า ไม่ผูกกับ drill map ปัจจุบัน | |
| G10 ล้มแต่ยังคืน `ok:true` | Sol รายงานว่า assertion ที่ล้มถูก cast เป็น `SafeDxf` แล้ว exporter คืนสถานะสำเร็จ (`dxfExportFromOperationGraph.ts:436,:493,:541`) จึงส่งไฟล์ได้แม้ provenance ขาด <!-- adversary: orchestrator อ่านโค้ดยืนยันเฉพาะจุด failOnSkipped/preValidated ที่ตัวเองแก้ ส่วนเส้น G10 นี้รับมาจาก Sol โดยยังไม่ตรวจซ้ำ --> | pre-existing |
| Truth-chain ไม่ atomic | freshness ผูกกับ identity ของ drill map เท่านั้น; cut-list/placements อ่านจาก cabinet state สด → artifact แบบผสมรุ่นเป็นไปได้ | เชิงออกแบบ ต้องตัดสินว่าจะผูกทั้ง snapshot หรือไม่ |
| along-axis reach ของ G11.5 | ไม่มีกฎเชิงตัวเลขแล้ว (ของเดิมมี true-positive coverage เป็นศูนย์) | reviewer จัดเป็น debt ที่ต้องออกแบบกฎใหม่ |
| e2e T008 | ยังไม่มี assertion จริงว่า export เดินผ่าน OperationGraph | ค้างจาก T9 |
| `dxfNormalize.ts LAYER_ORDER` | T4 reviewer รายงานว่า list ยังระบุเฉพาะ `CUT_OUT` (`dxfNormalize.ts:41`) จึงจัดลำดับ layer ใหม่ไปท้ายสุดถ้ามีการ canonicalize <!-- adversary: reviewer ตรวจ importer แล้วพบเฉพาะ gate10_1DxfGolden.test.ts — packet path ปัจจุบันจึงยังไม่เดินผ่าน normalizer นี้ --> | inert วันนี้ |

**หมายเหตุความน่าเชื่อถือของ G2:** Sol อ้าง path ที่ resolve ไม่ได้ 2 จุด — ทุก finding จึงถูกตรวจซ้ำกับซอร์สจริงก่อนรับ (ตัว defect ของ SketchOverlay เป็นของจริงที่ path อื่น):

```console
$ grep -rn "flatPartToDxfR12\|saveDxfFile" src --include=*.tsx | grep -v __tests__
src/components/ui/SketchOverlay.tsx:46:import { flatPartToDxfR12 } from '../../core/export/dxf/dxfR12';
src/components/ui/SketchOverlay.tsx:47:import { saveDxfFile } from '../../core/export/saveClient';
src/components/ui/SketchOverlay.tsx:487:    const dxfContent = flatPartToDxfR12(result.flatPart, {
src/components/ui/SketchOverlay.tsx:493:    saveDxfFile(filename, dxfContent);

$ ls src/features/sketch/SketchOverlay.tsx src/components/ui/FieldBridgeButton.tsx
ls: cannot access 'src/features/sketch/SketchOverlay.tsx': No such file or directory
ls: cannot access 'src/components/ui/FieldBridgeButton.tsx': No such file or directory
```

## 7. คำตัดสินของเจ้าของที่บันทึกไว้ (ห้ามเปิดใหม่โดยไม่มีคำสั่ง)

| # | คำถาม | คำตัดสิน |
|---|---|---|
| Q1 | unify DXF อย่างไร | **A** — สร้าง projection stage ให้ OperationGraph path แล้วปลด quickDxf จากปุ่มผู้ใช้ |
| Q2 | Safety Gate ควรกันแค่ไหน | **O2+O3** — fresh PASS ทั้ง freeze และ export/upload + auto-run ตอนกด Freeze |
| Q3 | นิยาม cut-size ของ panel DXF | **A** — panel cut size ตาม formula-reference §3 (ไม่บวก premill) → ปิด decision D-2 |
| Q4 | B-run ที่ผิด | **A** — แก้ใน build นี้ + ปลดล็อก contract test |
| Q5 | mirror แผ่น TOP | **A** — machining-face-view (mirror ซ้าย-ขวา เหมือน RIGHT_SIDE) |
| Q6 | ชะตากรรม B-run หลังพบว่าชน bolt | **A** — retire ทั้งระบบ |
| Q7 | มีใครเลื่อยจาก drilling DXF ไหม | **A** — เจ้าของยืนยันว่าโรงงานเลื่อยจาก cut list (SPEC-08) เท่านั้น <!-- adversary: คำถามถูกตั้งพร้อมทางเลือก B ที่ให้คง outline เป็นขนาด cut บน layer เดิมเผื่อมีเครื่อง nesting อ่านตรง เจ้าของเลือก A --> → เปลี่ยน layer เป็น `PANEL_OUTLINE_FINISH` |

## 8. สภาพ branch และข้อควรระวังก่อน merge

- **16 commits** จาก `59f61e57` ถึง `b38d7f4d` (15 ของงานนี้ + 1 ของ session อื่น)
- ⚠️ **`5ff83514 docs(line): add approved trust foundation design`** เป็นงานของ session อื่น (เอกสาร 4 ไฟล์ สาย line-oa) ที่ commit ลง branch เดียวกันตอน 16:08 — **branch นี้จึงไม่ได้มีแต่งาน dxf-truth-chain** ต้องตัดสินก่อน merge ว่าจะแยกออกหรือไม่
- working tree ยังมีไฟล์ของเจ้าของอื่นค้างอยู่ (`supabase/functions/_shared/order-adapter.ts`, `tests/line-oa-commerce/...` จาก session ชิป flaky-test, `dist/`, `daph-second-brain/`, `desktop.ini` จาก Drive sync) — **ทุก commit ของ build นี้ stage รายไฟล์** ไม่เคยใช้ `git add -A`
- คำสั่ง gate ของ checkout นี้ (เพราะ `node_modules/.bin` ว่าง และ composite build มี error เดิมที่ `vite.config.ts`):
  ```bash
  node node_modules/vitest/vitest.mjs run
  ```
  ```bash
  node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
  ```
  ```bash
  node node_modules/vite/bin/vite.js build
  ```

## 9. ลำดับงานที่แนะนำต่อจากนี้

1. **เปิด Browser pane แล้วทำ live demo ให้ครบวง** (Run Gate → Freeze → Export → เปิดไฟล์ใน AutoCAD นับรู Ø8/Ø15) — นี่คือหลักฐานที่ปิดเรื่องที่เจ้าของเปิดไว้
2. ตัดสิน **SketchOverlay** (§6) ว่าอยู่ในขอบเขต gate หรือไม่
3. ปิด surface ที่เหลือใน §6 (ExportPanel handler, App.tsx upload, ReleaseWizard)
4. **G3 whole-feature gate** สองค่าย แล้วค่อยพิจารณา push/PR
5. พิจารณา **revoke packet ที่ freeze ไว้ก่อน build นี้** — packet เหล่านั้นถือความลึกเจาะที่ผิด (โยงกับ SAFETY content-revocation registry ที่เพิ่งสร้าง)
