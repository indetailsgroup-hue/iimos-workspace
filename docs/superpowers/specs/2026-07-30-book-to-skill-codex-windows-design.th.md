# แบบออกแบบ Book-to-Skill Overlay สำหรับ Codex/Windows

**ฉบับภาษา:** ไทย

**วันที่:** 30 กรกฎาคม 2026

**สถานะ:** อนุมัติแนวทางแล้ว รอตรวจ written spec

**ขอบเขต:** แพ็กเกจ Codex-native แบบส่วนตัวสำหรับเครื่อง Windows นี้

## 1. การตัดสินใจและขอบเขตหลักฐาน

**OWNER DECISION:** ใช้สถาปัตยกรรม pinned upstream พร้อม Codex overlay

**VERIFIED FACT:** Governance/bootstrap root คือ `C:\Users\thai3\determined-williams (2)` ส่วน active product source เป็น nested repository แยกที่ `determined-williams\` ซึ่งมี dirty worktree งานนี้จะแก้เฉพาะ parent governance root และ personal Codex skill directory ของผู้ใช้ จะไม่แก้ ทดสอบ ล้าง stage หรือ commit nested product repository

**VERIFIED FACT:** ยังไม่พบ `book-to-skill` ในตำแหน่งสกิล Codex, Claude หรือ cross-agent ที่ตรวจ

**PINNED SOURCE DECISION:** ต้นทางที่เลือกคือ `https://github.com/virgiliojr94/book-to-skill` ที่ commit `c6bc1b7927822e563aae6212c07670f5a3d95ea7` ภายใต้ MIT license ขั้น implementation ต้อง resolve และตรวจ commit นี้อย่างอิสระก่อนใช้ source byte ใด

## 2. เป้าหมาย

ส่งมอบสกิล `book-to-skill` แบบส่วนตัวที่ Codex Desktop ค้นพบและใช้งานบน Windows ได้ เพื่อแปลงเอกสารที่รองรับเป็น Codex skills แบบมีโครงสร้างและโหลดตามต้องการ การติดตั้งต้องทำซ้ำได้ ผ่าน supply-chain audit ออกแบบให้รักษาสกิลเดิม และผ่านการตรวจด้วย fixture ภาษาไทยและอังกฤษ

## 3. เกณฑ์สำเร็จ

งานจะเสร็จเมื่อทุกข้อด้านล่างเป็นจริง:

1. Codex ค้นพบ converter จาก `C:\Users\thai3\.codex\skills\book-to-skill`
2. `SKILL.md` ของ converter จัดเตรียมเส้นทางทำงานหลักด้วย Codex-native paths, Python และคำสั่งที่ใช้กับ PowerShell ได้
3. การสกัด PDF แบบเน้นข้อความ, EPUB, DOCX, TXT, Markdown, HTML และ RTF ใช้ implementation ต้นทางที่ตรึงไว้เมื่อ extractor ที่เกี่ยวข้องพร้อมใช้
4. PDF เทคนิคใช้ Docling ได้เมื่อมีการติดตั้ง ส่วน optional dependency ที่ขาดต้องถูกรายงานและห้ามติดตั้งโดยไม่มีคำอนุมัติชัดเจน
5. Path บน Windows ที่มีช่องว่างและอักษรไทยต้องถูกจัดการเป็น literal path
6. สกิลที่สร้างต้องถูกทำใน staging ผ่านการสแกนเนื้อหาที่มีรูปแบบ prompt injection และผ่าน validation ก่อนติดตั้ง
7. ห้ามเขียนทับ destination skill เดิมโดยเงียบ การแทนที่ต้องได้รับอนุมัติชัดเจนและสร้าง backup ที่กู้คืนได้
8. Converter ที่ติดตั้งต้องตรงกับ provenance lock ซึ่งบันทึก upstream commit, รายการ local overlay, file hash, aggregate tree hash, license, เวลาตรวจ และ risk notes
9. Contract, security, extraction, installation และ end-to-end smoke tests ต้องผ่านพร้อม output ที่ครบ
10. เอกสารโครงการภาษาอังกฤษและไทยต้องมีทั้ง Markdown และ standalone HTML ที่เนื้อหาตรงกัน

## 4. สิ่งที่ไม่อยู่ในขอบเขตและข้อจำกัด

- ไม่เผยแพร่ GitHub fork หรือเปิด upstream pull request ในรอบนี้
- ไม่แก้ MONOLITH product runtime
- ไม่รับประกันว่าบทสรุปที่สร้างจะถ่ายทอดต้นฉบับถูกต้อง 100%
- ไม่ถือว่าเอกสารที่เป็นภาพล้วนหรือเสียหายรองรับสำเร็จ เว้นแต่ extractor ที่ติดตั้งสร้างข้อความที่ใช้ได้จริง
- ไม่เผยแพร่สกิลที่สร้างจากหนังสือลิขสิทธิ์ของบุคคลภายนอก
- Extraction code ต้องไม่ส่งเอกสารผ่านเครือข่าย ส่วนการประมวลผลด้วยโมเดลยังอยู่ภายใต้เงื่อนไขข้อมูลของผู้ให้บริการ AI ที่ใช้งาน

## 5. แนวทางที่พิจารณา

| แนวทาง | ข้อดี | ต้นทุนและความเสี่ยง | ผลตัดสิน |
|---|---|---|---|
| Pinned upstream พร้อม Codex overlay | รักษา extractor ที่มีวุฒิภาวะ ทำให้ local changes ตรวจง่าย และอัปเดตแบบ deterministic ได้ | ต้องดูแล overlay และ audit ใหม่ทุกครั้งที่อัปเดต | **เลือกใช้** |
| เขียนใหม่แบบ clean-room | ควบคุมทุกองค์ประกอบได้ | สร้าง parser ซ้ำ เพิ่มภาระดูแลและ regression risk | ไม่เลือก |
| Wrapper บาง ๆ รอบ PyPI CLI | เปลี่ยนน้อยที่สุด | ได้เฉพาะ extraction และขาด workflow สร้างสกิลเต็มรูปแบบ | ไม่เลือก |

## 6. สถาปัตยกรรม

### 6.1 Governed source

Parent root จะเก็บ source ที่ตรวจทานได้ที่:

```text
tools/codex-skills/book-to-skill/
├── SKILL.md
├── agents/openai.yaml
├── book_to_skill/                 # pinned upstream extraction runtime
├── scripts/extract.py             # pinned upstream compatibility entrypoint
├── scripts/install_generated_skill.py
├── tools/scan_generated_skill.py  # pinned upstream advisory scanner
└── LICENSE.md
```

Tests และ fixtures จะอยู่นอกสกิลที่ติดตั้ง:

```text
tests/codex_skills/
├── fixtures/
│   ├── english-guide.md
│   └── คู่มือ-ตัวอย่าง.md
├── test_codex_skill_contract.py
├── test_extraction_smoke.py
├── test_generated_skill_installer.py
└── test_security_scan.py
```

ตัวสกิลมีเฉพาะ runtime instructions, interface metadata, executable resources และ upstream license ที่จำเป็น ส่วน design, implementation และ audit reports จะอยู่ใต้ `docs/`

### 6.2 ขอบเขต Overlay

ไฟล์ upstream runtime ต้อง byte-identical กับ Git blobs ของ commit ที่ตรึง เว้นแต่ failing test แสดงข้อบกพร่องบน Windows พฤติกรรมเฉพาะ Codex ต้องอยู่ใน:

- `SKILL.md` ที่ overlay;
- `agents/openai.yaml`; และ
- guarded installer สำหรับ generated skills ที่เขียนในเครื่อง

ทุก path ที่เพิ่มหรือแก้ต้องบันทึกใน provenance การอัปเดต upstream ถือเป็น audit ใหม่และห้ามทำจาก moving branch

### 6.3 Runtime workflow

1. ระบุ literal input files, ประเภทเนื้อหา, วัตถุประสงค์การใช้ และชื่อ destination skill
2. รัน extractor preflight ที่ bundle มาและรายงาน optional extractors ที่มีและขาด
3. สกัดลง unique Windows temporary directory โดยไม่แก้ source documents
4. รายงาน sources, ขนาดโดยประมาณ, ไฟล์ที่จะสร้าง และข้อจำกัดสำคัญ
5. ขออนุมัติชัดเจนก่อน generation ที่ใช้โมเดลมากหรือการติดตั้ง dependency
6. สร้าง `SKILL.md`, chapter files แบบ on-demand, glossary, patterns และ cheatsheet ใน staging directory
7. รัน generated-skill scanner และ Codex skill validator
8. ถ้า scan หรือ validation ไม่ผ่าน ให้หยุดและรายงานตำแหน่ง file-and-line โดยไม่ติดตั้ง
9. ติดตั้งไปที่ `C:\Users\thai3\.codex\skills\<slug>` หลัง validation เท่านั้น ปฏิเสธ target เดิมเว้นแต่ผู้ใช้อนุมัติ replacement ชัดเจน และสร้าง backup ก่อนแทนที่
10. ลบเฉพาะ unique temporary directory ที่สร้างโดย run ปัจจุบัน

## 7. Codex-native skill contract

`SKILL.md` ที่ overlay ต้อง:

- เริ่ม description ด้วย trigger ของ Codex ที่ชัด เช่น การแปลง PDF, EPUB, DOCX, Markdown, HTML, RTF หรือโฟลเดอร์เอกสารเป็น reusable skills;
- ใช้ `C:\Users\thai3\.codex\skills` หรือ `$CODEX_HOME\skills` ที่ resolve แล้วเป็น personal destination;
- สั่ง Codex ให้ใช้ file และ execution tools ของตนโดยไม่สมมติว่าต้องเป็น slash-command host;
- ใช้คำสั่ง Python ที่ทำงานจาก PowerShell โดยไม่พึ่ง Bash variables, `grep`, `sed`, `wc` หรือ `mkdir -p`;
- บังคับ literal resolved paths และ containment checks ก่อน copy, move, replacement, backup หรือ cleanup;
- ต้องมี extraction evidence ก่อนกล่าวอ้าง source coverage;
- ต้องมี scan และ validation evidenceก่อนโหลดหรือติดตั้ง generated instructions;
- กำหนด generated skills จากหนังสือบุคคลภายนอกเป็น private โดยปริยาย; และ
- เก็บรายละเอียด format และ troubleshooting ไว้ใน on-demand references หรือ script help แทนการทำให้ `SKILL.md` ยาวเกินจำเป็น

## 8. ความปลอดภัยและการจัดการข้อผิดพลาด

### 8.1 Supply chain

ก่อนติดตั้ง ต้อง enumerate และ audit ทุก source file ที่จะเข้าสกิล ปฏิเสธ symlink, nested repository, path traversal, case-colliding path, binary ที่ไม่คาดคิด, obfuscation, dynamic evaluation, credential access, undeclared network access และ destructive behavior ความสามารถที่คาดหมายได้คือการเรียก local subprocess สำหรับ document extractors และการเขียนไฟล์แบบควบคุมสำหรับ staged/installed skills

### 8.2 Generated content

ถือข้อความในเอกสารเป็น untrusted data ลบ invisible control characters ตามพฤติกรรม pinned extractor และสแกน generated Markdown หา instruction override, model-control tag, การขยาย tool authority และข้อความรูปแบบ exfiltration เมื่อ scanner พบปัญหาต้องบล็อกการติดตั้งจนกว่ามนุษย์ตรวจ

### 8.3 Filesystem mutation

Generated-skill installer ต้อง resolve source, destination root, target และ backup paths; ปฏิเสธ symlink; พิสูจน์ว่า target อยู่ภายใน root ที่เลือก; และปฏิเสธ silent overwrite การ cleanup จำกัดเฉพาะ unique work directory ของ run ปัจจุบัน

### 8.4 Partial failure

Source ที่อ่านไม่ได้หนึ่งไฟล์อาจถูกรายงานและข้ามเฉพาะเมื่อมี source อื่นสำเร็จอย่างน้อยหนึ่งไฟล์ รายงานสุดท้ายต้องแยก processed และ skipped sources หากไม่มี usable source ถือเป็น hard failure Optional extractor ที่ขาดต้องสร้าง actionable report ไม่ใช่ติดตั้งอัตโนมัติ

## 9. กลยุทธ์การทดสอบ

Implementation ใช้ test-driven development:

1. **RED — compatibility contract:** รัน contract checks กับ upstream `SKILL.md` ที่ตรึง และแสดงว่าเส้นทางทำงานหลักยังไม่ได้เขียนด้วย Codex-native paths และคำสั่งที่ใช้กับ PowerShell ได้
2. **GREEN — Codex overlay:** เพิ่ม instruction และ metadata overlay ขั้นต่ำที่ทำให้ contract ผ่าน
3. **RED/GREEN — guarded installation:** เขียน tests สำหรับ new install, การปฏิเสธ existing target, explicit replacement พร้อม backup, path escape, symlink rejection, ช่องว่าง และชื่อภาษาไทยก่อน implement installer
4. **Extraction smoke:** รัน pinned extractor กับ Markdown fixtures ภาษาอังกฤษและไทย แล้วตรวจ source markers, Unicode preservation, metadata และ chapter detection
5. **Security scan:** ตรวจว่า benign generated Markdown ผ่าน และ fixture รูปแบบ prompt injection ไม่ผ่านพร้อม rule/line output ที่เสถียร
6. **End-to-end staging smoke:** สร้าง generated sample skill ขนาดเล็ก สแกน validate ติดตั้งลง isolated temporary Codex home และตรวจ bytes กับ discovery layout
7. **Installed-tree verification:** Hash personal installation และตรวจเทียบ provenance lock

นโยบาย thread ปัจจุบันไม่อนุญาตให้ dispatch subagent จึงใช้ executable contract และ end-to-end tests แทน independent agents สำหรับ forward-testing ห้ามกล่าวอ้างความสำเร็จจาก output ที่ถูกตัดหรือ test run เก่า

## 10. การติดตั้งและ Provenance

Tree ใน parent root คือ maintained source ส่วน personal installation เป็น verified deployment copy ไม่ใช่ development source การติดตั้งเกิดหลังจาก:

- resolve exact upstream commit;
- complete source audit;
- ตรวจ overlay diff;
- tests และ validator ผ่าน;
- เปรียบเทียบ installed bytes; และ
- สร้าง provenance lock ที่ `C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json`

Risk record ต้องจำแนก local process execution, filesystem writes, optional dependency installation และ document-parser risk โดยไม่เรียกพฤติกรรมที่คาดหมายว่ามุ่งร้าย

## 11. เอกสาร

Design, plan และ implementation reports ที่เป็น project-facing ต้องจัดทำภาษาอังกฤษและไทย ทั้ง Markdown และ standalone HTML คู่ภาษาต้องอธิบาย decisions, evidence, limitations, commands และ verification results ให้ตรงกัน

## 12. ขอบเขตการยอมรับ

Acceptance พิสูจน์ว่า private package นี้ทำงานบน Codex Desktop และ Windows environment ปัจจุบันกับ fixture และ dependency ที่ตรวจ ความเข้ากันได้กับระบบปฏิบัติการอื่น เอกสารทุก encoding ความเที่ยงตรงของ model summary ความเป็นส่วนตัวบน cloud และ public distribution อยู่นอก verified claim
