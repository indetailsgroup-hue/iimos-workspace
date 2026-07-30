# รายงาน Audit ต้นทาง Book-to-Skill — Commit ที่ตรึงไว้ `c6bc1b79`

**ฉบับภาษา:** ไทย
**วันที่ audit:** 30 กรกฎาคม 2026 เขตเวลา Asia/Bangkok (UTC+7)
**แบบออกแบบที่กำกับ:** [`docs/superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.th.md`](../superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.th.md)
**แผน implementation:** [`docs/superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.th.md`](../superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.th.md)
**รายงานคู่กัน:** [`2026-07-30-book-to-skill-codex-windows-implementation.th.md`](2026-07-30-book-to-skill-codex-windows-implementation.th.md)
**ขอบเขต:** 19 upstream runtime paths ที่ vendor เข้า `tools/codex-skills/book-to-skill/` ใน parent governance root และ personal deployment ที่ `C:\Users\thai3\.codex\skills\book-to-skill`

> **กฎเรื่อง root:** ทุกข้อความในรายงานนี้ใช้กับ parent governance root `C:\Users\thai3\determined-williams (2)` และ personal Codex skills directory ของผู้ใช้ ส่วน nested product repository `determined-williams\` ทั้งไม่ถูกอ่านเพื่อ audit นี้และไม่ถูกเขียนโดย audit นี้

---

## 1. เหตุผลที่ต้องมี audit นี้

Converter ถูกติดตั้งลง personal Codex skills directory ก่อนที่ governed source, test หรือ byte comparison จะเกิดขึ้นใน repository ดังนั้นการติดตั้งนั้นทำงานอยู่บนคำกล่าวอ้างที่ยังไม่ได้ตรวจ คือคำกล่าวอ้างว่า byte ที่ใช้งานอยู่คือ byte ของ commit ที่ design ตรึงไว้ audit นี้ปิดคำกล่าวอ้างนั้นด้วยการ refetch commit ที่ตรึงไว้ลง repository แยก แล้วเปรียบเทียบ governed byte ทุกไฟล์

## 2. อัตลักษณ์ของต้นทางที่ตรึงไว้

| หัวข้อ | ค่า |
|---|---|
| Repository | `https://github.com/virgiliojr94/book-to-skill` |
| Commit | `c6bc1b7927822e563aae6212c07670f5a3d95ea7` |
| หัวเรื่อง commit | `ci: bump the github-actions group with 2 updates (#80)` |
| ผู้เขียน / วันที่ commit | `dependabot[bot]` — จันทร์ 27 ก.ค. 2026 18:42:26 -0400 |
| License | MIT (`LICENSE.md`, sha256 `be9b04bc…`) |
| วิธี fetch | `git fetch --depth 1 origin <commit>` ลง repository ชั่วคราวที่อยู่นอก root ทั้งสอง |

Commit ถูก resolve ด้วยอัตลักษณ์ ไม่ใช่ด้วย branch: `git rev-parse FETCH_HEAD` คืนค่า 40 ตัวอักษรเดียวกับที่ design ตรึงไว้ จึงยืนยันได้ว่า moving reference ไม่ได้เข้ามามีส่วนใน audit นี้

## 3. การเลือก path

Upstream ที่ commit นั้นมี tracked paths 49 รายการ ในจำนวนนั้น 19 รายการคือ governed runtime และ license byte ส่วนที่เหลือเป็นองค์ประกอบระดับโปรเจกต์ที่ personal skill installation ไม่มีเหตุผลต้องพามาด้วย

| กลุ่ม | Paths | ผลตัดสิน |
|---|---|---|
| Extraction runtime | `book_to_skill/` (17 ไฟล์ รวม `parsers/`) | vendor |
| Entrypoint | `scripts/extract.py` | vendor |
| Advisory scanner | `tools/scan_generated_skill.py` | vendor |
| License | `LICENSE.md` | vendor |
| Instruction ของ upstream | `SKILL.md` | แทนด้วย Codex overlay |
| องค์ประกอบระดับโปรเจกต์ | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `BACKERS.md`, `mkdocs.yml`, `pyproject.toml`, `docs/`, `.github/` | ตัดออก |
| Test suite ของ upstream | `tests/` (4 ไฟล์) | ตัดออก — repository นี้ใช้ suite ของตัวเองใต้ `tests/codex_skills/` |
| Tools อื่น | `tools/discovery_tax.py`, `tools/validate_skill.py` | ตัดออก — ใช้ Codex validator แทน |
| Build residue | `scripts/__pycache__/extract.cpython-313.pyc` | ตัดออก — compiled artifact ไม่ควรอยู่ใน tree ที่ audit แล้ว |
| Banner asset | `scripts/banner.txt` | ตัดออก — ดู §6.4 |

## 4. ผลการเปรียบเทียบ byte

ทุก governed path ถูก hash จาก blob ของ commit ที่ตรึงไว้ (`git show FETCH_HEAD:<path>`) และจาก installed tree จากนั้น hash จาก vendored tree อีกครั้งหลัง copy

**17 จาก 19 governed paths มี byte ตรงกับ commit ที่ตรึงไว้ทุกไบต์** เหลือ 2 paths ที่มีความต่างซึ่งประกาศไว้แล้ว และแต่ละจุดถูกตรึงด้วย regression test ของตัวเอง (§5)

| Path | SHA-256 (commit ที่ตรึงไว้) | ผล |
|---|---|---|
| `LICENSE.md` | `be9b04bccfb4bdab…` | ตรงกัน |
| `book_to_skill/__init__.py` | `9d18b99b2c417557…` | ตรงกัน |
| `book_to_skill/__main__.py` | `2207592e7bad6433…` | ตรงกัน |
| `book_to_skill/cli.py` | `936285510c1dfa25…` | ตรงกัน |
| `book_to_skill/config.py` | `99ff3fd1cb86d77b…` | ตรงกัน |
| `book_to_skill/dependencies.py` | `119b3c9635d8b83a…` | ตรงกัน |
| `book_to_skill/exceptions.py` | `bf9417993e577cea…` | ตรงกัน |
| `book_to_skill/sanitize.py` | `d26f20c01af1b6e8…` | ตรงกัน |
| `book_to_skill/utils.py` | `4b9236d8c074510e…` | **patch ที่ประกาศไว้** — sha256 ในเครื่อง `368ef866089300bd…` |
| `book_to_skill/parsers/__init__.py` | `a8f740712820f872…` | ตรงกัน |
| `book_to_skill/parsers/calibre.py` | `d9e23513e9dadc78…` | ตรงกัน |
| `book_to_skill/parsers/docx.py` | `15741ae148c50a01…` | ตรงกัน |
| `book_to_skill/parsers/epub.py` | `d0a2d1e3aae5b8f2…` | ตรงกัน |
| `book_to_skill/parsers/html.py` | `86ebb15647b2b8ae…` | ตรงกัน |
| `book_to_skill/parsers/pdf.py` | `857e90f9d20b1da1…` | **patch ที่ประกาศไว้** — sha256 ในเครื่อง `f9d15459e4e0dd01…` |
| `book_to_skill/parsers/rtf.py` | `12837a5ded9bf0c7…` | ตรงกัน |
| `book_to_skill/parsers/text.py` | `d355f499d3184f2b…` | ตรงกัน |
| `scripts/extract.py` | `541ed846d5aa5d5f…` | ตรงกัน |
| `tools/scan_generated_skill.py` | `1c075d1de29e4c15…` | ตรงกัน |

Digest เต็มของทั้ง 19 paths บันทึกไว้ใน [`tests/codex_skills/test_upstream_manifest.py`](../../tests/codex_skills/test_upstream_manifest.py) ซึ่งจะ fail เมื่อ upstream byte เปลี่ยนโดยยังไม่ประกาศ เมื่อมีไฟล์ที่ยังไม่ประกาศอยู่ใน skill tree และเมื่อมี symbolic link อยู่ที่ใดก็ตามใน tree นั้น

## 5. Patch สองจุดที่ประกาศไว้

### 5.1 Patch 1 — `book_to_skill/utils.py`: ตัวการเปลี่ยนแปลง

```diff
--- book_to_skill/utils.py   (commit ที่ตรึงไว้ c6bc1b79)
+++ book_to_skill/utils.py   (vendored + installed)
@@ -683,7 +683,10 @@
-    OUTPUT_META.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
+    OUTPUT_META.write_text(
+        json.dumps(metadata, indent=2, ensure_ascii=False),
+        encoding="utf-8",
+    )
```

### 5.2 เหตุผลที่ byte เดิมใช้งานบนเครื่องนี้ไม่ได้

`metadata.json` ฝังชื่อไฟล์ต้นทางตามตัวอักษรจริงและ serialize ด้วย `ensure_ascii=False` เมื่อไม่ระบุ encoding `Path.write_text` จะ encode ด้วย locale codec ของ process ซึ่งบนเครื่องนี้คือ cp1252:

```
$ python -c "import sys,locale; print(locale.getpreferredencoding(False), sys.flags.utf8_mode)"
cp1252 0
```

การเขียน text ที่อยู่เหนือขึ้นไปหนึ่งบรรทัด (`OUTPUT_TEXT.write_text(consolidated_text, encoding="utf-8")`) มี argument นี้อยู่แล้วใน upstream ดังนั้นความต่างนี้จึงเป็นการเรียกที่ไม่สอดคล้องกันหนึ่งจุด ไม่ใช่ความต่างเชิงออกแบบ

### 5.3 การทำซ้ำที่บันทึกไว้ ไม่ใช่แค่กล่าวอ้าง

Byte ของ commit ที่ตรึงไว้ถูกวางกลับทับไฟล์ที่ vendor แล้วรัน regression test ใหม่ ผลคือ extraction ทำงานจบ แล้ว process ตายตอนเขียน metadata:

```
$ python -m pytest tests/codex_skills/test_extraction_smoke.py::test_thai_metadata_survives_a_non_utf8_locale -v
tests/codex_skills/test_extraction_smoke.py::test_thai_metadata_survives_a_non_utf8_locale FAILED [100%]

  File "...\tools\codex-skills\book-to-skill\book_to_skill\utils.py", line 686, in main
    OUTPUT_META.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
  File "...\Lib\encodings\cp1252.py", line 19, in encode
    return codecs.charmap_encode(input,self.errors,encoding_table)[0]
UnicodeEncodeError: 'charmap' codec can't encode characters in position 205-210: character maps to <undefined>

returncode=1
============================== 1 failed in 0.41s ==============================
```

หลังจากนั้นไฟล์ที่ patch แล้วถูกวางกลับและตรวจ digest ซ้ำ (`368ef866089300bd…`) รูปแบบความล้มเหลวสำคัญเท่ากับตัวแก้: extraction สำเร็จ ผู้ใช้เห็น output ความคืบหน้า แล้ว run ตายที่การเขียนไฟล์สุดท้าย ดังนั้นผู้เรียกที่ตรวจเฉพาะ `full_text.txt` จะสรุปว่าการแปลงสำเร็จ

### 5.4 ข้อผูกพันถาวรของ patch ทั้งสอง

แต่ละ patch ถูกบันทึกใน 3 ที่ซึ่งการอัปเดต upstream ในอนาคตต้องผ่าน: `PATCHED_FILES` ใน manifest test (พร้อม digest ทั้งสองฝั่ง), regression test ที่อ้างถึงข้างต้น และรายการ `localModifications` ใน provenance lock หาก upstream commit ภายหลังแก้การเรียกจุดเดียวกันนี้ `test_every_patch_is_declared_and_still_differs_from_upstream` จะ fail และบังคับให้ถอด patch ออก แทนที่จะแบกมันต่อไปแบบเงียบ ๆ


### 5.5 Patch 2 — `book_to_skill/parsers/pdf.py`: encoding ขาออกของ pdftotext

พบเมื่อ 30 กรกฎาคม 2026 ระหว่างแปลงแคตตาล็อกฮาร์ดแวร์ Häfele หลังจากเผยแพร่ audit ฉบับนี้รอบแรกแล้ว

```diff
--- book_to_skill/parsers/pdf.py   (commit ที่ตรึงไว้ c6bc1b79)
+++ book_to_skill/parsers/pdf.py   (vendored + installed)
@@ -14,7 +14,7 @@
-            ["pdftotext", "-layout", pdf_path, "-"],
+            ["pdftotext", "-enc", "UTF-8", "-layout", pdf_path, "-"],
```

`pdftotext` เขียนออกเป็น Latin-1 ถ้าไม่สั่ง `-enc` ขณะที่ฝั่งผู้เรียก decode stdout เป็น UTF-8 ด้วย `errors="replace"` ทุกไบต์นอก ASCII จึงมาถึงในรูป U+FFFD ภายใต้ exit code 0 และ `full_text.txt` ที่ดูเหมือนครบ วัดจากแคตตาล็อก Häfele 17 หน้า:

| ตัวถอด | `Häfele` | `Ø` | U+FFFD |
|---|---|---|---|
| `pdftotext` ก่อน patch | 0 | 0 | 221 |
| `pdftotext` หลัง patch | 48 | 15 | 0 |
| `pypdf` ลำดับถัดไปในสาย | 48 | 15 | 0 |

ความเสียหายแปรผันตามสัดส่วนอักขระที่ไม่ใช่ ASCII: แคตตาล็อกภาษาเยอรมันหรือสแกนดิเนเวียเสียเครื่องหมายกำกับเสียงและเสีย `Ø` ทุกตัวที่นำหน้าเส้นผ่านศูนย์กลางรูเจาะ ส่วนเอกสารภาษาไทยเสียข้อความแทบทั้งฉบับ และเพราะ `pdftotext` เป็นตัวแรกที่สายการถอดเรียกเสมอเมื่อเครื่องมี poppler องค์ประกอบถัดจากนั้นจึงไม่เคยเห็นข้อความที่สมบูรณ์เลย

`tests/codex_skills/fixtures/non-ascii-winansi.pdf` เป็น PDF แบบ WinAnsi ขนาด 699 ไบต์ที่เขียนขึ้นเอง ทำให้ `test_pdftotext_path_preserves_non_ascii_characters` ทำซ้ำความล้มเหลวได้โดยไม่ต้องใช้เอกสารของบุคคลภายนอก และ test นี้ยังตรวจด้วยว่าเส้นทางที่ถูกใช้จริงคือ pdftotext จึงผ่านด้วยการตกไปใช้ `pypdf` ไม่ได้

## 6. บัญชีความสามารถของ runtime ที่ vendor มา

ไฟล์ `.py` ที่ governed ทุกไฟล์ถูกอ่านเต็ม (2,121 บรรทัด ใน 19 paths) ความสามารถด้านล่างคือสิ่งที่ audit พบ และทุกข้อเป็นสิ่งที่คาดหมายได้สำหรับ document converter ที่ต้องเรียก extractor ภายนอกและเขียน skill directory

### 6.1 การใช้ subprocess — 4 จุดเรียก

| จุด | คำสั่ง | หมายเหตุ |
|---|---|---|
| `book_to_skill/dependencies.py:89` | `sys.executable -m pip install …` | คุมด้วย `BOOK_SKILL_INSTALL_MISSING` (ค่าเริ่มต้น `ask`); Codex workflow ตรึง `--install-missing no` |
| `book_to_skill/parsers/pdf.py:14,87` | `pdftotext` (poppler) | argument array ไม่ผ่าน shell |
| `book_to_skill/parsers/calibre.py:16` | `ebook-convert` (Calibre) | argument array ไม่ผ่าน shell |
| `scripts/install_generated_skill.py:97` | `sys.executable tools/scan_generated_skill.py <snapshot>` | timeout 30 วินาที, `check=False` |

จุดเรียกทั้งหมดสร้าง argument array และการค้นหา `shell=True` บน governed paths ได้ผล 0 รายการ ดังนั้นชื่อไฟล์เอกสารจึงกลายเป็น shell syntax ไม่ได้

### 6.2 การเขียนไฟล์

| จุด | เป้าหมาย |
|---|---|
| `book_to_skill/config.py` | work directory จาก `BOOK_SKILL_WORKDIR` หรือ system temporary directory เป็นค่าสำรอง |
| `book_to_skill/utils.py` | `full_text.txt` และ `metadata.json` ภายใน work directory นั้น |
| `scripts/install_generated_skill.py` | snapshot ชื่อไม่ซ้ำภายใน skills root ที่เลือก แล้ว `replace` แบบ atomic ไปที่ target โดยย้าย tree เดิมไปเก็บใต้ `.backups/` |

ระยะการทำลายของ installer ถูกจำกัดไว้ที่ snapshot ที่ตัวมันสร้างเอง: `shutil.rmtree` ถูกเรียกกับ path นั้นเท่านั้น อยู่ภายใน failure handler และจะ rollback backup กลับเมื่อ target ลงเอยว่างเปล่า

### 6.3 ผลการค้นหาความสามารถที่จะเปลี่ยนโปรไฟล์ความเสี่ยง

การค้นหาความสามารถบน 19 governed paths ได้จำนวนดังนี้

| ความสามารถที่ค้นหา | Pattern | จำนวนที่พบ |
|---|---|---|
| Network egress | `requests`, `urllib`, `httpx`, `socket` | 0 |
| Dynamic evaluation | `eval(`, `exec(`, `compile(`, `__import__` | 0 |
| Deserialization | `pickle`, `yaml.load` | 0 |
| การเข้าถึง credential หรือ key | การอ่าน `os.environ` นอกเหนือจากตัวแปร `BOOK_SKILL_*` สองตัว | 0 |
| การตั้ง permission หรือสร้าง link | `chmod`, `symlink(` | 0 |

ความสามารถเดียวใน tree ที่ใกล้เคียงกับเครือข่ายคือการเรียก pip ใน §6.1 ซึ่งจะเข้าถึง package index หลังได้รับอนุมัติชัดเจนเท่านั้น และถูกปิดด้วย flag ค่าเริ่มต้นของ workflow

### 6.4 Asset ของ upstream หนึ่งรายการที่ตัดออกอย่างตั้งใจ

`scripts/banner.txt` บรรจุงาน art สำหรับ attribution ของ upstream ที่ `print_banner()` เขียนไปที่ stderr ไฟล์นี้ถูกตัดออกจาก vendored tree ส่วน `print_banner()` ห่อการอ่านไว้ใน `try/except Exception` แล้วทำงานต่อ ดังนั้นการตัดออกมีต้นทุนเท่ากับ banner เชิงตกแต่งหนึ่งชิ้นเท่านั้น การให้เครดิตยังคงอยู่ผ่าน `LICENSE.md` ที่ vendor มาโดยไม่แก้ไข และผ่านรายงานฉบับนี้

## 7. เมทริกซ์ dependency ของ extractor บนเครื่องนี้

บันทึกจาก `scripts/extract.py --check` exit code 0:

```
  PDF (text-heavy)
      ✓ python: pypdf
      ✗ python: pdfminer.six
      ✓ system: pdftotext (poppler-utils)
      → ready — any one of pdftotext / pypdf / pdfminer is enough
  PDF (technical: tables, code, formulas)
      ✗ python: docling
      → fallback available (install for best quality)
  EPUB      ✗ ebooklib, ✗ beautifulsoup4  → stdlib zipfile fallback
  DOCX      ✗ python-docx                 → stdlib ZIP/XML fallback
  HTML      ✗ beautifulsoup4              → stdlib html.parser fallback
  RTF       ✗ striprtf                    → regex cleanup fallback
  MOBI / AZW / AZW3
      ✗ system: ebook-convert (Calibre)
      → MISSING — required, no fallback
```

| Format | สถานะ ณ 30 กรกฎาคม 2026 |
|---|---|
| PDF (text) | พร้อมใช้ — ติดตั้ง `pdftotext` และ `pypdf` แล้วทั้งคู่ |
| PDF (technical) | ได้เฉพาะ fallback — Docling ยังไม่ติดตั้ง ดังนั้น `--mode technical` จะถอยไปใช้สาย text และเนื้อหาที่อ่อนไหวต่อ layout จะเสียโครงสร้าง |
| EPUB, DOCX, HTML, RTF | ได้เฉพาะ fallback — stdlib parser รับงานไปก่อนจนกว่าจะติดตั้ง optional package |
| Markdown, TXT, RST, AsciiDoc | พร้อมใช้ — stdlib |
| MOBI, AZW, AZW3 | ยังใช้งานบนเครื่องนี้ไม่ได้ — `--check` รายงาน Calibre `ebook-convert` เป็น `MISSING — required, no fallback` (ดู output ใน §7) |

ระหว่าง audit นี้ยังไม่มีการติดตั้ง package ใด

## 8. บันทึกความเสี่ยง

| ประเภท | การประเมิน |
|---|---|
| การรัน process ในเครื่อง | คาดหมายได้ 4 จุดเรียก ทุกจุดเป็น argument array และไม่ผ่าน shell |
| การเปลี่ยนแปลง filesystem | คาดหมายได้และมีขอบเขต การเขียนลงที่ work directory, staging snapshot หรือ skill target ที่อนุมัติชัดเจนพร้อม backup ที่กู้คืนได้ |
| การติดตั้ง optional dependency | คาดหมายได้ และมีประตูสองชั้น: ค่าเริ่มต้น `ask` ของ environment variable และ `--install-missing no` ของ workflow |
| การเปิดรับของ document parser | เป็นธรรมชาติของงาน parser ประมวลผล input ที่ไม่น่าเชื่อถือ เอกสารที่ผิดรูปทำให้ parser พังได้ ซึ่ง extractor จะรายงานเป็น source ที่ถูกข้าม |
| Injection จากเนื้อหาที่ generate | ลดความเสี่ยงได้ แต่ยังไม่หมด scanner จับรูปแบบ injection ที่รู้จัก การเรียบเรียงแบบใหม่ผ่านมันไปได้ ด้วยเหตุนี้การติดตั้งจึงยังอยู่หลังการอนุมัติของมนุษย์ |
| Supply-chain drift | คุมด้วย manifest test และ provenance lock การอัปเดต upstream ต้องทำ audit ใหม่ ไม่ใช่ merge |

## 9. สิ่งที่ audit นี้ยังไม่ได้พิสูจน์

- ไม่พูดถึง upstream commit อื่นนอกจาก `c6bc1b79` และไม่พูดถึง release ในอนาคตของโปรเจกต์
- ไม่รับรอง *พฤติกรรม* ของ parser กับเอกสารนอกเหนือจาก fixture Markdown สองไฟล์ที่ test suite ใช้ ส่วนเส้นทาง PDF, EPUB, DOCX, RTF และ MOBI ถูกอ่านในฐานะ source ไม่ได้ถูกรันกับไฟล์จริงของ format เหล่านั้น
- ไม่ประเมินคุณภาพหรือความเที่ยงตรงของ skill ที่ generate ออกมา ซึ่งขึ้นกับโมเดลที่ทำสรุป ไม่ใช่ขึ้นกับ byte ชุดนี้
- ไม่ครอบคลุม nested product repository เครื่องอื่น หรือการเผยแพร่ generated skill ในช่องทางใด
