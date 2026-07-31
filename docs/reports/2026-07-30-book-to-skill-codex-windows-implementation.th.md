# Book-to-Skill บน Codex/Windows — หลักฐาน Implementation และการ Reconcile

**ฉบับภาษา:** ไทย
**วันที่รายงาน:** 30 กรกฎาคม 2026 เขตเวลา Asia/Bangkok (UTC+7)
**แบบออกแบบที่กำกับ:** [`docs/superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.th.md`](../superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.th.md)
**แผน implementation:** [`docs/superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.th.md`](../superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.th.md)
**รายงานคู่กัน:** [`2026-07-30-book-to-skill-upstream-audit.th.md`](2026-07-30-book-to-skill-upstream-audit.th.md)
**ขอบเขต:** parent governance root `C:\Users\thai3\determined-williams (2)` และ personal Codex skills directory

> **กฎเรื่อง root:** งานนี้ไม่ได้เขียน nested product repository `determined-williams\` worktree ของมันมีการเปลี่ยนแปลงที่ไม่เกี่ยวข้องกันค้างอยู่บน branch `fix/dxf-truth-chain` ทั้งก่อนและหลัง session นี้

---

## 1. สิ่งที่ session นี้ทำจริง

แผนอธิบายการสร้างที่ทำตามลำดับ: vendor runtime ที่ audit แล้ว เขียน overlay เพิ่ม test แล้วจึง deploy และเขียน lock แต่บนเครื่องนี้ deployment มีอยู่แล้วตั้งแต่ session นี้เริ่ม — session Codex ก่อนหน้าเขียน personal installation และ provenance lock ไปแล้ว — ขณะที่ branch ที่ session นี้ทำงานอยู่คือ `guardrails/claim-linters` ยังว่างจาก source, test และรายงานที่แผนเป็นเจ้าของ (commit ของ session ก่อนหน้าอยู่บนอีก branch หนึ่ง ดู §1.3)

Session นี้ปิดช่องว่างนั้น: ตรวจหา byte ของ commit ที่ตรึงไว้ขึ้นมาใหม่โดยอิสระ vendor เข้า repository เขียน test suite ตามที่แผนกำหนด และพิสูจน์ว่า tree ที่ Codex โหลดเท่ากับ tree ที่ repository กำกับอยู่ตอนนี้

### 1.1 ลำดับเวลาที่สังเกตได้ (เวลาท้องถิ่น 30 กรกฎาคม 2026)

| เวลา | เหตุการณ์ | ต้นทาง |
|---|---|---|
| 28 ก.ค. | `book_to_skill/`, `tools/` ถูกเขียนลง personal skills directory | session ก่อนหน้า |
| 14:27 | `LICENSE.md`, `scripts/extract.py` เข้าที่ | session ก่อนหน้า |
| 14:42–14:43 | overlay `SKILL.md` และ `agents/openai.yaml` | session ก่อนหน้า |
| 14:51 | `scripts/install_generated_skill.py` | session ก่อนหน้า |
| 15:21 | provenance lock `~/.codex/skills/.provenance/book-to-skill.json` (`auditedAt` `2026-07-30T08:21:20Z`) | session ก่อนหน้า |
| 19:17–19:42 | governed source `tools/codex-skills/book-to-skill/`, `tests/codex_skills/`, การเทียบ byte, การทำซ้ำข้อบกพร่องที่ patch ไว้ | session นี้ |
| 19:47 | `verify_provenance.py` → `PASS` | session นี้ |
| 20:2x | patch ที่ประกาศไว้จุดที่สอง (`pdftotext -enc UTF-8`) พร้อม fixture และ regression test, sync deployment, เขียน provenance lock ใหม่ | session นี้ |

### 1.2 การแก้คำกล่าวอ้างของ session นี้เอง 1 จุด

ตารางสถานะตอนเปิด session ระบุว่ายังไม่มี provenance lock คุม converter ที่ติดตั้งไว้ ข้อนั้นผิด: lock ถูกเขียนไว้แล้วเมื่อ 15:21 ซึ่งเป็นเวลากว่าสี่ชั่วโมงก่อนการตรวจ และการ list `~/.codex/skills/.provenance/` ซ้ำแสดง `book-to-skill.json` เป็นรายการแรก แถวที่แก้แล้วอยู่ใน §4 ความผิดพลาดนี้ไม่ได้ทำให้ของเดิมถูกเขียนทับ เพราะ `write_provenance.py` ปฏิเสธ output path ที่มีอยู่แล้ว และการปฏิเสธนั้นคือสิ่งที่ทำให้ความผิดพลาดถูกเปิดออกมา

### 1.3 Implementation คู่ขนานบนอีก branch

Session ก่อนหน้า commit งานของตัวเองไว้แล้ว — บน `codex/book-to-skill-codex-windows` ซึ่ง checkout อยู่ที่ `C:\tmp\book-to-skill-codex-windows` branch นั้นกับ branch นี้ออกจาก commit ของแผนเดียวกันคือ `3ba3b8e5` แล้วแยกทางกัน branch นั้นมี skill tree 22 ไฟล์ชุดเดียวกัน มี `tests/codex_skills/` ของตัวเอง และมี report path สี่รายการเดียวกัน

Skill tree ที่ vendor ไว้ทั้งสองฝั่งตรงกันทุกไบต์:

```
$ git diff --name-only HEAD codex/book-to-skill-codex-windows -- tools/codex-skills/book-to-skill
$ echo $?
0
```

การทำงานสองรอบที่เป็นอิสระต่อกันบน commit ที่ตรึงไว้ชุดเดียวกันได้ไฟล์ 22 รายการเหมือนกัน ซึ่งเป็นหลักฐานที่หนักแน่นกว่าการทำรอบเดียว จุดที่สอง branch ต่างกันคือ test suite: installer tests ของ branch นั้นยาวกว่ามาก ส่วน manifest test ของ branch นี้บันทึก digest ต่อ path และ patch ที่ประกาศไว้แทน และ `tools/codex-skills/.gitattributes` มีอยู่เฉพาะบน branch นี้ ดังนั้นความเสี่ยงเรื่อง line ending ใน §2.3 จึงยังเปิดอยู่บน branch นั้น การตัดสินว่า suite ฝั่งไหนจะอยู่ต่อ และจะรวมสอง branch หรือไม่ เป็นการตัดสินใจของเจ้าของงาน ไม่ใช่สิ่งที่การ reconcile นี้ปิดให้

## 2. ไฟล์ที่ session นี้สร้าง

### 2.1 Governed skill source — `tools/codex-skills/book-to-skill/`

22 ไฟล์: 19 upstream paths ที่ audit แล้ว (สองไฟล์มี patch ที่ประกาศไว้) บวก local overlay 3 ไฟล์

| Path | ต้นทาง |
|---|---|
| `book_to_skill/` (17 ไฟล์) | upstream ที่ตรึงไว้ `c6bc1b79`; `utils.py` และ `parsers/pdf.py` มี patch ที่ประกาศไว้ |
| `scripts/extract.py` | upstream ที่ตรึงไว้ |
| `tools/scan_generated_skill.py` | upstream ที่ตรึงไว้ |
| `LICENSE.md` | upstream ที่ตรึงไว้ (MIT) |
| `SKILL.md` | local overlay — workflow แบบ Codex-native |
| `agents/openai.yaml` | local overlay — Codex UI metadata |
| `scripts/install_generated_skill.py` | local overlay — การติดตั้ง generated skill แบบมีการ์ด |

### 2.2 Tests — `tests/codex_skills/`

| ไฟล์ | สิ่งที่ตรึงไว้ |
|---|---|
| `test_upstream_manifest.py` | digest ต่อ path เทียบกับ commit ที่ตรึงไว้, patch ที่ประกาศไว้ทั้งสองจุด (digest ทั้งฝั่ง upstream และในเครื่อง), ชุดไฟล์ที่แน่นอนของ skill tree, การปฏิเสธ symbolic link |
| `test_codex_skill_contract.py` | ข้อความ workflow แบบ Codex/PowerShell-native, frontmatter จำกัดที่ `name` + `description`, ลำดับ gate (แนะนำ scanner ก่อน installer), field ของ UI metadata |
| `test_extraction_smoke.py` | การ extract จาก path ที่มีช่องว่าง, การ extract จาก path ภาษาไทยพร้อมการตรวจพบบทภาษาไทย, regression ของ cp1252, regression ของ pdftotext กับอักขระ non-ASCII, `--check` ที่รายงานครบทุก format |
| `test_generated_skill_installer.py` | การติดตั้งใหม่, การปฏิเสธ target ที่มีอยู่, การแทนที่แบบชัดเจนพร้อม backup ที่กู้คืนได้, การปฏิเสธชื่อที่อาจหลุดออกนอก root, การปฏิเสธ path ที่ไม่คาดหมายใน staging, เนื้อหา injection ที่ scanner บล็อก, การเก็บกวาด snapshot หลังการปฏิเสธ, การปฏิเสธ symbolic link, exit code ของ CLI |
| `test_security_scan.py` | scanner exit code 0/1/2 พร้อม rule id และหมายเลขบรรทัด และ staged skill ที่เดินผ่าน scan → Codex validator → guarded install พร้อมการเทียบ byte |
| `test_installation_evidence.py` | personal installation เท่ากับ governed source เทียบ tree-hash ต่อ tree-hash |
| `fixtures/english-guide.md`, `fixtures/คู่มือ-ตัวอย่าง.md`, `fixtures/non-ascii-winansi.pdf` | input สามไฟล์สำหรับการ extract |

### 2.3 การ์ดเรื่อง line ending ที่แผนยังไม่ได้คาดไว้

การ stage vendored tree เปิดข้อบกพร่องที่จะทำให้การตรึง byte พังตั้งแต่การ clone ครั้งถัดไป blob ที่ตรึงไว้เป็น CRLF และมี 3 บรรทัดใน `book_to_skill/utils.py` ที่ไม่ใช่ ดังนั้น tree นี้จึง normalize ทางใดทางหนึ่งอย่างปลอดภัยไม่ได้ repository นี้ตั้ง `core.autocrlf=true` และยังไม่เคยมี `.gitattributes` Git จึงเก็บสำเนาที่ normalize เป็น LF และจะคืน CRLF ตอน checkout:

```
$ git config core.autocrlf
true
$ git check-attr text eol -- tools/codex-skills/book-to-skill/book_to_skill/utils.py
…: text: unspecified
…: eol: unspecified
```

Clone ใหม่จะขัดกับ digest ทุกค่าที่บันทึกไว้ใน manifest test และการ redeploy จาก clone นั้นจะส่ง byte ที่ต่างจากชุดที่ audit ไว้ ตอนนี้ `tools/codex-skills/.gitattributes` ตรึง tree ด้วย `book-to-skill/** -text` และ index ถูกสร้างใหม่ให้ blob ที่เก็บเป็น byte ชุดที่ audit แล้ว:

```
$ git check-attr text -- tools/codex-skills/book-to-skill/book_to_skill/utils.py
…: text: unset
$ git cat-file blob :tools/codex-skills/book-to-skill/book_to_skill/utils.py | sha256sum
368ef866089300bd…   (digest ของไฟล์ที่ patch แล้วตามที่ประกาศไว้)
$ git cat-file blob :tools/codex-skills/book-to-skill/tools/scan_generated_skill.py | sha256sum
1c075d1de29e4c15…   (digest ของ upstream ที่ตรึงไว้)
```

## 3. หลักฐานการทดสอบ

คำสั่งและ summary ที่ครบถ้วน รันจาก parent root:

```
$ export BOOK_TO_SKILL_INSTALLED_DIR="C:/Users/thai3/.codex/skills/book-to-skill"
$ python -m pytest tests/codex_skills -v --basetemp="<scratch>/pytest-tmp"

platform win32 -- Python 3.14.2, pytest-8.4.2, pluggy-1.6.0
rootdir: C:\Users\thai3\determined-williams (2)
configfile: pyproject.toml
collected 30 items
... 30 PASSED ...
============================== 30 passed in 2.43s ==============================
EXIT=0
```

การรันนี้ทำงานครบ 29 จาก 29 รายการ (skipped = 0): Codex validator ถูกพบที่ `~/.codex/skills/.system/skill-creator/scripts/quick_validate.py`, บัญชีผู้ใช้นี้สร้าง symbolic link ได้ และมีการส่ง `BOOK_TO_SKILL_INSTALLED_DIR` เข้าไป ดังนั้น test แบบมีเงื่อนไขทั้งสามรายการจึงทำงานจริง

Red ก่อน green ถูกบันทึกไว้สำหรับสองคำกล่าวอ้างที่ test ผ่านอาจว่างเปล่าได้ถ้าไม่ทำ

| Test | ความล้มเหลวที่บันทึกไว้ก่อนแก้ |
|---|---|
| `test_upstream_manifest.py` (5 จาก 6 tests) | รันตอน target directory ยังว่าง ก่อนการ vendor |
| `test_thai_metadata_survives_a_non_utf8_locale` | รันกับ `utils.py` ของ upstream ที่ตรึงไว้; `UnicodeEncodeError: 'charmap' codec` ที่ `utils.py:686`, returncode 1 |
| `test_pdftotext_path_preserves_non_ascii_characters` | รันกับ `parsers/pdf.py` ของ upstream ที่ตรึงไว้; ข้อความที่ถอดได้กลายเป็น `H\ufffdfele Minifix\ufffd`, `Drill hole \ufffd 15 mm` |

## 4. Provenance และความเท่ากันของ deployment

| หัวข้อ | ค่า |
|---|---|
| Path ของ lock | `C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json` |
| `auditedAt` | เขียนใหม่เมื่อ 30 กรกฎาคม 2026 หลัง patch ที่สอง; lock แรกบันทึก `2026-07-30T08:21:20.191044Z` |
| Revision | `c6bc1b7927822e563aae6212c07670f5a3d95ea7` |
| License | MIT |
| จำนวนไฟล์ที่บันทึก | 22 |
| `treeSha256` | `c1a55b520642d9a83bb8a09dc4da18ed58c3abf976bbf2a6758dee8008b06d63` (ก่อน patch ที่สองคือ `0abcf03b…`) |
| Local modification ที่บันทึก | 5 รายการ (overlay 3 ไฟล์ และ patch ที่ประกาศไว้ทั้งสอง พร้อม upstream digest ที่แต่ละจุดต่างออกไป) |
| Risk note ที่บันทึก | 5 รายการ (process, filesystem-write, network เมื่อได้อนุมัติ, destructive replacement, การเปิดรับของ parser) |

```
$ python ~/.codex/skills/skill-installer/scripts/verify_provenance.py \
    'C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json'
PASS book-to-skill files=22 tree=c1a55b520642d9a83bb8a09dc4da18ed58c3abf976bbf2a6758dee8008b06d63
EXIT=0
```

ข้อเท็จจริงสองข้อที่เป็นอิสระต่อกันประกอบกันแล้วในตอนนี้: lock ตรงกับ installed tree (`verify_provenance.py`) และ installed tree ตรงกับ governed source (`test_personal_installation_matches_governed_source`) lock ถูกเขียนก่อนที่ test ใดจะเกิดขึ้น ดังนั้นบรรทัดสรุปของมัน — "Pinned upstream runtime audited; Codex/Windows overlay reviewed and tested" — ล้ำหน้าหลักฐานของตัวเองในเวลานั้น และ test suite ใน §3 คือสิ่งที่ตอนนี้ยืนอยู่หลังคำว่า "tested"

Lock ของ session ก่อนหน้าถูกคงไว้ทุกตัวอักษร จนกระทั่ง patch ที่ประกาศไว้จุดที่สองเปลี่ยน byte ของ installation แล้ว `test_personal_installation_matches_governed_source` กลายเป็นแดง ซึ่งคือการ์ดทำงานตามที่ออกแบบไว้ จากนั้น lock จึงถูกเขียนใหม่ด้วย `--replace` และตอนนี้บันทึก patch ทั้งสองจุดพร้อม upstream digest ที่แต่ละจุดต่างออกไป ซึ่งเป็นข้อมูลที่ lock ฉบับแรกยังไม่ได้บันทึก

## 5. จุดที่ทำต่างจากแผน

| ขั้นในแผน | สิ่งที่ทำแทน | เหตุผล |
|---|---|---|
| รัน test ด้วย interpreter ของ Codex runtime (`…\codex-primary-runtime\dependencies\python\python.exe`) | รันด้วย system interpreter Python 3.14.2 | pytest ยังไม่ได้ติดตั้งใน Codex runtime และการติดตั้งเพิ่มถือเป็นการเปลี่ยน dependency ที่ยังไม่ได้รับอนุมัติ ส่วน system interpreter มี pytest 8.4.2 อยู่แล้ว และ locale codec ของมันคือ cp1252 ซึ่งเป็นเงื่อนไขเดียวกับที่ regression test ต้องใช้ |
| ใช้ temporary directory ค่าเริ่มต้นของ pytest | ส่ง `--basetemp` ไปที่ scratch directory ของ session | sandbox ปฏิเสธการเข้าถึง `%LOCALAPPDATA%\Temp\pytest-of-thai3` ซึ่งทำให้ collection ตายก่อนที่ test ใดจะได้รัน |
| ลำดับ Task 1–5 (test → source → deploy) | source และ test ถูกเขียนหลัง deployment ที่มีอยู่ก่อนแล้ว | เป็นการ reconcile การติดตั้งที่มีอยู่เดิม โดยยังบันทึก red ก่อน green ให้ทั้งสองคำกล่าวอ้างใน §3 |
| Task 6 ขั้น 5 — เขียน provenance lock | ตรวจ lock ที่มีอยู่แล้วและคงไว้ที่เดิม จากนั้นเขียนใหม่หลัง patch ที่สอง | ตอนที่ byte ยังตรงกัน การเขียนทับบันทึก audit ของอีก session จะทำลายหลักฐานโดยไม่ได้อะไรกลับมา แต่เมื่อ `parsers/pdf.py` เปลี่ยน digest ที่บันทึกไว้ก็ล้าสมัย การเขียนใหม่จึงเป็นทางเลือกเดียวที่ตรงความจริง |
| Commit ทุก task | ยังไม่ commit staged เฉพาะ path ที่เกี่ยวข้อง | การ commit เป็นการตัดสินใจของเจ้าของงาน |

## 6. เกณฑ์สำเร็จจากแบบออกแบบ

| ข้อ | เกณฑ์ | สถานะ |
|---|---|---|
| 1 | Codex ค้นพบ converter จาก `~/.codex/skills/book-to-skill` | layout ครบ — 22 ไฟล์เข้าที่พร้อม frontmatter ของ `SKILL.md` และ `agents/openai.yaml`; การค้นพบภายใน Codex UI ยังไม่ได้ทดลองจาก session นี้ |
| 2 | `SKILL.md` ให้ Codex-native paths และคำสั่งที่ใช้กับ PowerShell ได้ | ครอบคลุมด้วย `test_codex_skill_contract.py` (4 tests) |
| 3 | การ extract PDF/EPUB/DOCX/TXT/Markdown/HTML/RTF ใช้ implementation ที่ตรึงไว้ | ครอบคลุมบางส่วน — Markdown ทั้งสองภาษา และ PDF (fixture 699 ไบต์ กับแคตตาล็อก Häfele 17 หน้า) ถูกรันครบวงจร ส่วน EPUB, DOCX, RTF และ MOBI ถูก audit ในระดับ source เท่านั้น |
| 4 | Technical PDF ใช้ Docling เมื่อมีการติดตั้ง และ optional dependency ที่ยังไม่ติดตั้งต้องถูกรายงาน ไม่ติดตั้งอัตโนมัติ | ครอบคลุมครึ่งที่เป็นการรายงาน (`--check`, exit 0, Docling แสดงเป็น fallback); เส้นทาง Docling เองยังไม่ถูกรัน เพราะ package ยังไม่ติดตั้ง |
| 5 | Path บน Windows ที่มีช่องว่างและอักษรไทยถูกจัดการเป็น literal path | ครอบคลุมด้วย extraction test 3 รายการ และ installer test เส้นทางภาษาไทย |
| 6 | Generated skill ต้องผ่าน staging, scan และ validate ก่อนติดตั้ง | ครอบคลุมด้วย `test_security_scan.py` รวมถึง Codex validator ที่คืน `Skill is valid!` |
| 7 | ห้ามเขียนทับเงียบ การแทนที่ต้องได้รับอนุมัติและเหลือ backup ที่กู้คืนได้ | ครอบคลุมด้วย installer test 2 รายการ ส่วนตัวการอนุมัติเองเป็น instruction ใน workflow ไม่ใช่ประตูในโค้ด |
| 8 | Converter ที่ติดตั้งต้องตรงกับ provenance lock | ครอบคลุมแล้ว — `PASS`, 22 ไฟล์, tree `0abcf03b…` |
| 9 | Contract, security, extraction, installation และ end-to-end tests ต้องผ่านพร้อม output ครบ | ครอบคลุมแล้ว — 30 tests, exit code 0, summary อยู่ใน §3 |
| 10 | เอกสารภาษาอังกฤษและไทย ทั้ง Markdown และ standalone HTML | ส่งมอบแล้ว — รายงานฉบับนี้ รายงาน audit และคู่ภาษา/คู่ HTML ของทั้งสอง |

## 7. สถานะ repository

```
$ git status --short --branch        # parent governance root
## guardrails/claim-linters
 M docs/superpowers/specs/2026-07-21-monolith-controlled-complete-document-set-design.en.md
?? tools/codex-skills/
?? tests/codex_skills/
… (ตัดรายการ untracked ที่มีอยู่ก่อนแล้วออก)

$ git -C determined-williams status --short --branch    # nested product root
## fix/dxf-truth-chain...origin/fix/dxf-truth-chain
 M daph-second-brain/_inventory.json
… (การเปลี่ยนแปลงที่มีอยู่ก่อน งานนี้ไม่ได้แตะ)
```

การเปลี่ยนแปลงใน nested root มีอยู่ก่อน session นี้ และ path ทุกรายการที่ session นี้เขียนอยู่นอก root นั้น

## 8. สิ่งที่ยังไม่ได้พิสูจน์

- **การค้นพบและการใช้งานจริงผ่าน Codex UI** — skill directory มีรูปร่างถูกต้องและผ่าน validator แต่ยังไม่มีใครรันการแปลงจริงผ่าน Codex Desktop บนเครื่องนี้
- **Format นอกเหนือจาก Markdown และ PDF** — เส้นทาง EPUB, DOCX, RTF และ MOBI ถูกอ่านและตรึง hash ไว้ ยังไม่ถูกรันกับเอกสารจริง ส่วนเส้นทาง PDF ถูกรันกับแคตตาล็อกจริง 17 หน้าแล้วเฉพาะสาย `pdftotext` ขณะที่ `pypdf` และ `pdfminer` ยังเป็นทางถอยที่ test ชุดนี้ยังไม่ได้ขับ
- **เส้นทาง Docling และ Calibre** — ทั้งสองยังไม่ติดตั้ง ดังนั้น `--mode technical` และการแปลง MOBI/AZW จึงยังไม่ได้ทดสอบที่นี่
- **ความเที่ยงตรงของ generated skill** — การที่ skill ที่ generate ออกมาแทนหนังสือต้นทางได้ตรงเพียงใดเป็นคุณสมบัติของโมเดลที่ทำสรุป และ test ใน suite นี้ยังไม่วัดสิ่งนั้น
- **ความพอร์ตข้ามเครื่อง** — ผลทุกข้อข้างต้นเกิดบน Windows 11 กับ Python 3.14.2 และ locale codec cp1252
- **การเผยแพร่ต่อบุคคลภายนอก** — generated skill จากหนังสือลิขสิทธิ์เป็น private โดยปริยาย และไม่มีข้อใดในรายงานนี้อนุญาตการเผยแพร่
