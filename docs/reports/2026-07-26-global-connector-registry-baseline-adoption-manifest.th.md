# Manifest สำหรับรับ baseline ที่อยู่ภายใต้การกำกับดูแล

**ฉบับ:** ภาษาไทย  
**วันที่:** 26 กรกฎาคม 2026  
**สถานะ:** Allowlist เชิงกลที่เสนอไว้ งานนี้ยังไม่คัดลอกไฟล์ baseline ต้นทาง  
**ต้นทาง:** `C:\Users\thai3\determined-williams (2)` ที่ `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4`  
**เป้าหมาย:** `C:\tmp\monolith-global-connector-registry-parent` ที่ base `13bcf5149570feb6ec5c7b15dbefd1fb88ef4161`

## สรุป

- ไฟล์ที่รวม: **77**
- จำนวนไบต์ต้นทางรวม: **712400**
- Inventory SHA-256: `e423bf6192e7009da3c0654ec3afebe5923324abd80ef8797f9640821177f4cc`
- ข้อตกลง digest: ใช้ **SHA-256** กับ **compact JSON ของ `/files` ที่เข้ารหัส UTF-8** โดยรักษาลำดับ array และลำดับ key ตาม manifest และกำหนด **`trailing_newline=false`** (`ConvertTo-Json -Depth 20 -Compress`)
- การดำเนินการ: **77 ADD**, **0 REPLACE**
- สถานะ Git ต้นทาง: **77 untracked**, **0 tracked**, **0 modified**

ไฟล์ JSON เป็นหลักฐานแบบ machine-readable ที่มีอำนาจกำกับ แต่ละรายการตรึง path แบบ POSIX ที่สัมพันธ์กับ repository, จำนวนไบต์ที่แน่นอน, SHA-256, กลุ่มวัตถุประสงค์, สถานะ Git ต้นทาง, การดำเนินการต่อเป้าหมาย และเหตุผลที่ต้องใช้

## กลุ่มวัตถุประสงค์

| กลุ่มวัตถุประสงค์ | ไฟล์ | ไบต์ |
| --- | ---: | ---: |
|  | 78 | 712438 |

## ขอบเขตการดำเนินการ

Allowlist นี้ครอบคลุมเฉพาะ baseline ของ kitchen kernel ใน parent ที่อยู่ภายใต้การกำกับดูแล งานที่ได้รับการทบทวนในภายหลังจึงจะคัดลอกรายการได้เมื่อไบต์ต้นทางยังตรงกับขนาดและ hash ที่ตรึงไว้ และ path เป้าหมายที่ resolve แล้วยังอยู่ภายใน isolated parent worktree เท่านั้น Nested runtime และ noise root ที่ห้ามทั้งหมดอยู่นอกขอบเขต Manifest นี้ไม่อ้างความพร้อมด้าน runtime, deployment, manufacturing หรือ production

## การยกเว้น

Allowlist ไม่รวม nested repository `determined-williams/`, `Documents/`, `All aboute kitchen/`, `artifacts/`, `tmp/`, `.tmp.driveupload/`, `worktrees/`, downloads, archives, ระบบผลิตภัณฑ์ที่ถูกคัดลอก, ไดเรกทอรี PDF/catalog ต้นทาง, `desktop.ini`, bytecode/cache, ผล verification ที่สร้างขึ้น, dependency/build output, credentials, secret values และเอกสารหรือเครื่องมือข้างเคียงที่ไม่เกี่ยวข้อง จำนวนการยกเว้นใน JSON คือจำนวนคลาสของกฎ ไม่ใช่ผลจากการ scan หรือ hash dirty tree แบบกว้าง

## Dependency ที่มีอยู่แล้วในเป้าหมาย

เป้าหมาย track ชุดทดสอบ agent guardrail และ render-doc อยู่แล้ว รวมถึง governance tools/hooks, allowlist และ `.github/workflows/claim-guardrails.yml` รายการเหล่านี้ถูกบันทึกเป็น existing target dependencies ใน JSON และไม่อยู่ในรายการ ADD/REPLACE โดยตั้งใจ

## ประเด็น migration ของ verifier ที่ยังไม่ปิด

`tools/verify_kitchen_kernel.py` กำหนดจำนวนที่คาดไว้เป็น 27 tests โดย baseline kitchen-kernel ที่ตั้งใจไว้คือ 20 Component Master tests และ 7 identity-tenancy tests แต่การ discover ทั้ง source root ปัจจุบันรัน 258 tests เพราะชุดทดสอบ agent guardrail และ render-doc ที่มีอยู่แล้วเข้าร่วมด้วย ประเด็นนี้เป็นหลักฐานที่คาดไว้สำหรับงาน verifier migration แบบ TDD ที่จะได้รับอนุญาตถัดไป ไม่ใช่อำนาจให้แก้พฤติกรรม verifier ในงานนี้

## Gate เชิงกลสำหรับงานภายหลัง

ก่อนคัดลอก ต้อง parse JSON, อ่านไฟล์ต้นทางทุกไฟล์ใหม่, ตรวจจำนวนไบต์และ SHA-256 ที่แน่นอน, ปฏิเสธ path ที่ห้าม, resolve ทุกเป้าหมายให้อยู่ใต้ isolated target root และปฏิเสธเป้าหมายที่สถานะปัจจุบันขัดกับการดำเนินการ ADD หรือ REPLACE ที่บันทึกไว้
