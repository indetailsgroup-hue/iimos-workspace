# MONOLITH — DXF truth chain / F-07 / hardware provenance · session handover
**วันที่:** 2026-07-26 · **branch:** `fix/dxf-truth-chain` (repo `determined-williams/`) · **ยังไม่ push อะไรทั้งสิ้น**

---

## 0. เส้นแดงที่ยังบังคับใช้ (จาก handover เดิมของเจ้าของงาน — ห้ามละเมิด)

- ไม่แก้ผิด repository · ไม่ทับการเปลี่ยนแปลงเดิมของผู้ใช้ · ไม่รันแผนที่ดำเนินการเสร็จแล้วซ้ำ
- **ห้ามสร้างพิกัด CNC หรือตัวเลขทางวิศวกรรมขึ้นเอง**
- **ห้ามทำให้ Inspection CAD ไหลเข้าสู่ CNC/G-code**
- แยก "มีเอกสาร" / "มี implementation" / "ผ่านการรับรองผลิตจริง" ออกจากกันเสมอ
- ห้าม `git reset --hard` · ห้ามลบ untracked files · ห้าม restore/clean การเปลี่ยนแปลงที่ไม่ใช่งานของตัวเอง
- ห้ามบันทึกหรือแสดง API key / token / ความลับใน repo, log หรือคำตอบ
- ห้ามลด generic 8 mm free-edge safety margin เพียงเพื่อให้รูผ่าน
- **แผงหลัง 6 mm ห้ามรับ blind bore ลึก 17.5 mm หรือ 11 mm**
- ถ้าตัวยึดใช้กับแผง 6 mm ไม่ได้ ต้อง **BLOCK พร้อมเหตุผล** ห้ามลดความลึกให้ดูเหมือนผ่าน
- ห้าม clamp, relabel, relocate หรือสร้างพิกัดสมมติเพื่อทำให้ผ่าน gate
- ทุกจุดที่ยังรอพิกัด ต้องออกเป็นสถานะ `UNPLACED` และ geometry ออกได้เฉพาะจุดที่มีพิกัดครบแล้ว
  <!-- adversary: บรรทัดนี้คัดมาจาก handover เดิมของเจ้าของงาน = ข้อกำหนด สถานะการตรวจของ session นี้คือ UNVERIFIED และเป็น open item: ยังต้องเดินตรวจทุกเส้นทางว่าโค้ดทำตามครบ -->
- **ห้าม `git add .`** — stage เฉพาะไฟล์ที่ได้รับอนุมัติทีละไฟล์
- **ห้าม push, merge หรือเปิด PR จนเจ้าของงานอนุมัติชัดเจน**
- Daph เป็นเพียง tenant หนึ่งของ MONOLITH ไม่ใช่เจ้าของ platform truth
- Perplexity = discovery/synthesis เท่านั้น ไม่ใช่ production authority

**Tenet ถาวรของเจ้าของงาน:** *หน้าบ้านง่าย หลังบ้านเข้มงวด* — ทุก "ไม่" ที่ระบบพูด ต้องมีทางไปต่อในคลิกเดียว

---

## 1. commit ที่ลงวันนี้ (ทั้งหมด local, ไม่ push)

| commit | เรื่อง |
|---|---|
| `b24aaeef` | ป้าย NOT-FOR-PRODUCTION ใน DXF ZIP + refusal บอกสาเหตุจริง (`describeGateRefusal`) |
| `babf5eeb` | F-07 สามชั้น: pre-flight / universal sweep / G11 rule + refusal เข้า factory packet |
| `ce0fe3b0` | คลื่นแก้จาก two-vendor gate (ดู §3) |
| `d33d9257` | catalog Häfele Minifix แบบผูก SKU + citation |
| `ed036a2c` | provenance audit ของ recipe ที่ใช้ผลิตจริง |

**สถานะ gate ล่าสุด (รันเอง ไม่ใช่คำอ้างของ subagent):**

```console
$ node node_modules/vitest/vitest.mjs run
 Test Files  281 passed (281)
      Tests  4723 passed (4723)
VITEST_EXIT=0

$ node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
TSC_EXIT=0

$ node node_modules/vite/bin/vite.js build
✓ built in 17.72s
BUILD_EXIT=0
```

---

## 2. เรื่องที่ต้องรู้ก่อนแตะโค้ด (สภาพแวดล้อม — เสียเวลาไปหลายชั่วโมงกับเรื่องพวกนี้)

- `node_modules/.bin` ว่าง → เรียก binary ตรง: `node node_modules/vitest/vitest.mjs run`, `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`, `node node_modules/vite/bin/vite.js build`
- **`tsc -b` แดงที่ `vite.config.ts` มาก่อนแล้ว** ใช้ `-p tsconfig.json --noEmit` แทน
- **vitest path filter เป็น substring ไม่ใช่ path** — เคยทำให้วินิจฉัยผิดทั้งเรื่อง (ดู §5)
- `vite.config.ts` ตัด `**/.worktrees/**` ออกจาก test run แล้ว **นี่เปลี่ยนขอบเขต gate**: ตัด 275 ไฟล์ (273 เป็นสำเนา path เดียวกับ main) เหลือ 4 ไฟล์ที่ไม่มีคู่ใน main และ **ต้องรันจากใน worktree นั้นเอง**: `e2e/cabinet.spec.ts`, `e2e/dxf-export.spec.ts`, `scripts/__tests__/lineTrustBaseline.test.ts`, `supabase/functions/_shared/trust-kernel/policy.test.ts`
  <!-- adversary: ตัวเลข 275/273/4 มาจากรายงานของ subagent ที่แก้ vite.config.ts ผมยืนยันเองแค่ผลรวม (before 553 files → after 279-281 files) และยืนยันว่า failure ใน main คือ selector ของผมเอง ไม่ใช่ null-dispatcher — การแยก 273-vs-4 ยังไม่ได้ตรวจซ้ำทีละไฟล์ -->
- **มี session อื่นทำงานในทรีเดียวกัน** — เจอ commit `77d4c67b` (.gitignore) แทรกเข้ามากลางทาง ถ้าเห็นไฟล์แปลก **ให้เปิดอ่านก่อน อย่าลบ**
- Playwright ใช้ใน path ที่มีวงเล็บไม่ได้ → harness อยู่ที่ `C:\Users\thai3\pw-monoe2e`
- Browser preview: `.claude/launch.json` ชื่อ `monolith` port 5200 · **ต้องเปิด Browser pane ค้างไว้** ไม่งั้น screenshot ใช้ไม่ได้ (หน้าไม่ composite — เจอเองใน session นี้: `screenshot failed: the Browser pane is not displayed`)
- PDF: Read tool render ไม่ได้ (ตอบ `pdftoppm is not installed`) แต่มีเครื่องมือสกัดข้อความครบ:

```console
$ command -v pdftotext qpdf mutool gs
/mingw64/bin/pdftotext

$ python -c "import pypdf, fitz; print('OK')"
OK
```
  **เขียนไฟล์ต้องบังคับ UTF-8** เพราะ stdout เป็น cp1252 → เจอ `UnicodeEncodeError: 'charmap' codec can't encode character '►'` แล้วสคริปต์ตายกลางทาง
- **ระวัง heredoc + escape ใน bash/python** — ทำสตริงพังไป 3 ครั้งใน session นี้ (`'0\nEOF\n'` กลายเป็น newline จริง, `join('\n')` แตกบรรทัด, apostrophe ไม่ escape) สำหรับข้อความที่มี `\n` หรือ `'` ให้ใช้ Edit tool

---

## 3. two-vendor gate ที่รันไปแล้ว (อย่ารันซ้ำ — ผลอยู่นี่)

**codex GPT-5.6 Sol @ xhigh** + **Claude 5-lens Workflow + รอบ refute** (39 agents, 34 finding, 9 รอดการหักล้าง)

ทั้งสองค่ายชี้ตรงกันที่ P0 สองข้อ **แก้แล้วใน `ce0fe3b0`**:

1. **sweep ถอนรูออกแต่ไม่ถอนข้อต่อ** (dowel ใช้ pairId ลูก `-dowel-side` / `-dowel-horiz` / `-dowel-shelf` / `-dowel-back`) — วัดได้ 32 จุด orphan บนวัสดุ 16mm · 12mm: รูขอบ Ø8 D18 ของ TOP รอดมาโดยไม่มีอะไรมารับ dowel · 15/16mm: เหลือมุมที่มี dowel แต่ cam-bolt ถูกถอนไปหมด → แก้ด้วย `pairJointRoot` (จับด้วย root ไม่ใช่ string prefix เพื่อไม่ให้ `pair-TOP_LEFT-1` กลืน `pair-TOP_LEFT-10`)
   <!-- adversary: ยืนยันเองด้วยการ restore generateDrillMap.ts เวอร์ชัน commit ก่อนแก้มารัน sweepHardening.test.ts แล้วได้ 4 failed พร้อมข้อความ "expected [ …(32) ] to deeply equal []" จากนั้น restore ไฟล์ที่แก้กลับ — ตัวเลข 32 เป็นผลรันจริงไม่ใช่คำอ้างของ reviewer -->
2. **ไม่มีอะไรกันไม่ให้ map ที่ถูกปฏิเสธส่งออก** — `exportDxfFromPacket` ไม่เคยอ่านคำตัดสิน (grep `gateResult` ในไฟล์นั้นได้ 0 บรรทัด) และ `ExportPanel.handleExport` (บรรทัด 837) อ่าน gate มาแค่ render status → guard ย้ายไปอยู่ที่ exporter ซึ่งเป็นจุดที่ทุก caller ผ่าน + ExportPanel ปรึกษา gate ก่อนส่งมอบ

อย่างอื่นที่ปิดในคลื่นเดียวกัน:
- ทิ้ง heuristic face/edge แทนด้วย **กฎเดียว = ความลึก vs ระยะแผ่นตามแนวแกนของรูนั้น** ปิด DIVIDER false-refuse + DIVIDER wave-through + BOLT_ENTRY 24mm ทะลุท็อป filler ช่องว่าง 24mm พร้อมกัน
- fail-closed เพิ่ม: normal ศูนย์/ทแยง/ไม่ finite · extent ไม่ finite (NaN thickness) · `throughHole` ที่ทะลุเกินแผ่นโดยไม่ประกาศ overtravel · แผ่นเจ้าของไม่อยู่ใน `cabinet.panels` · `refusalKey` ที่ลืม `corner` (เคยลบ junction BACK_RIGHT ออกจาก blocker list เงียบ ๆ)
- drill map ว่าง `{panels: []}` ไม่ authorize freeze/export ได้แล้ว (เดิมอ่านว่า FRESH เพราะ identity ตรงกับตัวเอง)
- `waivable:false` + measured/expected เดินทางเข้า packet แล้ว

---

## 4. งานที่ยังค้าง

### 4.1 ต้องให้เจ้าของงานตัดสิน (ห้ามตัดสินเอง)

1. **ที่มาของ `boltBoreDepth 17.5`** — หาไม่พบในแคตตาล็อก Häfele เล่มนี้ ทางเลือก: หา CAD/CAM dataset เพิ่ม / ถาม Häfele / หรือประกาศเป็น DERIVED จากเรขาคณิตของเราเอง

```console
# ค้นทั้งเล่ม 2768 หน้า หา 17.5 ที่อยู่ใกล้คำ depth/deep/drill/bore ในระยะ 70 ตัวอักษร
$ python (fitz scan, all pages)
--- pages where 17.5 sits near 'depth' or 'drill' ---
p364   40 Screw q mm 2.5 3.0 3.5 3.5 4.0 4.5 Length L mm 11.0 13.5 15.5 16.5 17.5 25.0 Drill bit q mm 10.0 12.0 14.0 16.0 18.0 24.0 Drilling depth T mm

# หมวด connector (หน้า 16-52) — ไม่มี hit เลย
$ for p in 16..52; do grep -E "17[.,]5" p$p.txt; done
(no output)

# หมวด sleeve/T-nut MB 14.60-14.65 ที่ตัวขุดสงสัยว่าอาจซ่อนอยู่
p2756  17.5=no | Fixing Screws / Cover caps
p2757  17.5=no | Fixing Screws / Sleeves and T-nuts
p2758  17.5=no | Fixing Screws / Sleeves and T-nuts
p2759  17.5=no | Fixing Screws / Sleeves and T-nuts
p2760  17.5=no | Fixing Material / Sleeves and T-nuts
p2761  17.5=no | Wall Fixings
```
  hit เดียวที่รอดคือหน้า 364 ซึ่ง 17.5 เป็น**ความยาวสกรู**คู่กับดอก 18.0mm — คนละตระกูลสินค้า วิธีค้นทั้งหมดบันทึกไว้ในฟิลด์ `absenceEvidence` ของ `minifixConfigProvenance.ts` เพื่อให้รันซ้ำได้

2. **`sleeveDia 10` ขัดกับผู้ผลิต** — น.23 ระบุ `> Bolt hole: Ø 5, 7 or 8 mm, depending on choice of connecting bolt` และทุกบรรทัด "Bolt hole" ในหน้า 16–52 อ่านได้ 5/7/8/9 จะเปลี่ยนตามผู้ผลิต (= เปลี่ยนเรขาคณิตการผลิต ต้องอนุมัติ) หรือยืนยันเหตุผลอื่น
3. **จะให้ provenance audit เป็น blocker ไหม** — ตอนนี้เป็นรายงาน ไม่ใช่ gate โดยเจตนา
4. **จะผูก recipe ต่อความหนาเข้ากับการปล่อยจริงไหม** — catalog + selector พร้อมแล้ว แต่ใช้แค่ในข้อความปฏิเสธ การสลับให้ปล่อยความลึกตามตาราง Häfele = เปลี่ยน manufacturing geometry
5. **ผนังเหลือ 0.5mm ที่ 17.5-ใน-18 พอไหม** — Häfele พิมพ์ความลึกต่อความหนา แต่หน้า 22–24 ไม่ได้พิมพ์ ligament ขั้นต่ำ (ค้นแล้วในหน้าเหล่านั้น) จึงยังตัดสินไม่ได้

### 4.2 งานทางเทคนิคที่ทำต่อได้เลย

- **เก็บ Hettich / Italiana Ferramenta / Blum ลง repo** — สกัดและผ่าน verifier แล้วแต่ยังไม่เข้าระบบ (Rastex 15 มีรุ่นแยกตามความหนา 12/15/16/18/19/22/29 · cam "16 mm min." · cross dowel "12 mm min.")
- **edge-bore breakthrough ที่ชั้น G11** — ยังไม่ implement ตัวคำนวณต้องรู้ว่ารูวิ่งไปตามมิติใดในระนาบ ซึ่ง input ของ G11 ไม่ได้พา panel-local basis มาด้วย (exporter มีตัวคำนวณอยู่แล้วที่ `src/core/export/panelLocalProjection.ts` — ใช้ซ้ำได้)
  <!-- adversary: ยืนยันโดยอ่าน G11DrillPoint/G11Panel ใน gateG11_types.ts โดยตรง ชุดฟิลด์ที่ type นี้พาไปคือ panelThickness, throughHole, normal เท่านั้น การส่ง panel-local basis เข้าไปด้วยจึงเป็นงานที่ยังต้องทำ และยังไม่ได้ทดลองว่าเพียงพอ -->
- **`F-06`** — เอา `connector-ops.json` ออกจาก packet
- **acceptance test 12 ครึ่งหลัง** — ป้าย NFP มีแล้ว แต่ยังไม่มีตัวกันไม่ให้คนเอา artifact ยัดเข้า post/CNC
- **`mine:hafele-minifix-core` lane ตายเพราะชน 32k output limit** — ถ้าจะขุดซ้ำต้องซอยเป็นกลุ่มหน้าเล็กลง
- **E2E / CI ยัง UNVERIFIED** เพราะยังไม่ push (CI workflow เขียนไว้แล้วแต่ไม่เคยรันบน runner)

---

## 5. บทเรียนที่ห้ามทำซ้ำ (เกิดขึ้นจริงในรอบนี้)

1. **สรุปว่า "ไม่มี" จากการค้นที่ไม่ครบ — เกิด 3 ครั้งใน session เดียว**
   - อ้างว่าเทสต์ component พังมาก่อนงานเรา → **ผิด** กลไก: vitest substring filter เลือกทั้งไฟล์ใน main และสำเนาที่อยู่ใต้ `.worktrees` แล้วแสดงผลของสำเนา ซึ่งอ่านโค้ดของ branch ตัวเองเสมอ ดังนั้นผล "พังเหมือนกัน" จึงถูกการันตีไว้ล่วงหน้าไม่ว่าจะ revert ไฟล์ใน main อย่างไร · ของจริงคือ `Unable to find role="button" and name /DXF Files/` = การเปลี่ยนชื่อปุ่มของเราเอง
   - อ้างว่าแหล่งอ้างอิง Häfele หาไม่ได้ → **ผิด** เจ้าของงานต้องชี้ที่ตั้งให้
     ที่ตั้งจริงคือโฟลเดอร์ `Documents/` ซึ่งมีแคตตาล็อกอยู่ครบมาตลอด
   - บอกว่า 7.5 ไม่ปรากฏในแคตตาล็อก → **ผิด** อยู่อย่างน้อย 6 หน้า รวม MB 4.121 "For 5 mm / 7 mm / 7.5 mm series drilled holes"
   → **กฎ: probe ที่แยกสองสมมติฐานออกจากกันไม่ได้ ไม่ได้พิสูจน์อะไร · ทุกคำกล่าวว่าไม่มี ต้องแนบขอบเขตที่ค้นไว้ข้าง ๆ**
2. **verification แบบ scoped ไม่ใช่ verification** — commit `b24aaeef` ยืนยันด้วย suite แค่ 2 โฟลเดอร์ แล้ว full gate จับ regression ได้ทีหลัง
3. **รายงานของ subagent = ข้ออ้างที่ยังไม่พิสูจน์** — ต้องอ่าน diff เอง reproduce RED เอง รัน full gate เอง ก่อนเชื่อ (วิธีนี้จับได้ว่า implementer ไม่ได้แตะ `buildDrillMapData` ซึ่งทิ้ง refusal ทั้งก้อน ทำให้ `drillmap.json` แยกไม่ออกระหว่าง "ไม่ต้องเจาะ" กับ "ถูกปฏิเสธ")
4. **RED ต้องเห็นแดงก่อนแก้** — มีครั้งหนึ่งเขียนเทสต์แล้วแก้เลย ต้องย้อนพิสูจน์ด้วยการ restore ไฟล์เวอร์ชัน commit มารันใหม่
5. **รัน full gate ตอน tree นิ่งเท่านั้น** — subagent ที่กำลัง RED จะทำให้ gate แดงปลอม

---

## 6. หลักฐานอยู่ที่ไหน

- **แคตตาล็อกตัวจริง:** `C:\Users\thai3\determined-williams (2)\Documents\` (~300 ไฟล์, 197 PDF) — ไฟล์เหล่านี้ไม่ได้ถูก commit เข้า repo โดยเจตนา (ดูนโยบายลิขสิทธิ์ท้ายหัวข้อ)
  <!-- adversary: ยืนยันด้วย `git status --porcelain` ที่แสดง Documents/ เป็น untracked มาตลอด และ .gitignore ที่ session อื่นเพิ่ม (77d4c67b) ไม่ได้ track มันเข้ามา -->
  - `blaetterkatalog (1).pdf` = **Häfele Ixconnect/Minifix** rev `DGH-M 2021, HDE-en, 11/20` · น.22 = "The Minifix® system is suitable for wood thicknesses from 12 mm and above" · **น.24 = ตาราง housing ต่อความหนา + เลขแคตตาล็อก 262.26.032–038** · น.23 = bolt hole Ø5/7/8 + นิยาม dim B ("Distance from centre of Minifix® housing to shelf front edge") · น.27 = S200/S300 (page stamp `21.02.2024 / WS 577`)
  - `Connecting_technology_2016_16359_HUS.pdf` = Hettich Rastex · `Cams_and_dowels.pdf` / `Cross_dowels.pdf` / `Insert_Nuts.pdf` = Italiana Ferramenta · `Catalogue and technical manual 2024-2025.pdf` = Blum
- **หน้าที่สกัดเป็น text แล้ว 1,709 หน้า** อยู่ใน scratchpad ของ session เดิม ซึ่ง session ใหม่จะได้ scratchpad ใหม่ → ต้องสกัดใหม่ (วิธี: `fitz` เปิดไฟล์ + กรองหน้าด้วย regex `minifix|maxifix|rafix|rastex|dowel|panel thickness|material thickness|drilling|bore|system 32` + เขียนไฟล์ต่อหน้าแบบบังคับ UTF-8)
- **นโยบายลิขสิทธิ์ที่ตั้งไว้:** เก็บลง repo ได้เฉพาะ **พารามิเตอร์ + citation (ไฟล์/หน้า/revision/snippet สั้น)** · ห้ามดัมป์หน้าแคตตาล็อกเชิงพาณิชย์ลง repo — การถอดตัวเลขและเลขอาร์ติเคิลพร้อมอ้างอิงคือการบันทึกข้อเท็จจริง แต่ commit หน้าแคตตาล็อกคือการเผยแพร่สิ่งพิมพ์เชิงพาณิชย์ซ้ำ
- **ledger:** `.superpowers/sdd/dxf-truth-chain-progress.md` (gitignored) — append-only บันทึกทุก ruling/delta/commit/บทเรียน
- **โค้ดที่เป็นแหล่งความจริงใหม่:** `src/core/hardware/catalog/` → `hardwareCatalogTypes.ts` (schema + citation ที่บังคับ), `hafeleMinifix.ts` (ตาราง + `selectMinifixHousing` fail-closed), `minifixConfigProvenance.ts` (บัญชีที่มา 4 tier: CITED / DERIVED / CONTRADICTED / UNSOURCED)
