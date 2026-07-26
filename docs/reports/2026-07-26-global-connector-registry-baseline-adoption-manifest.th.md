# Manifest สำหรับรับ baseline ที่อยู่ภายใต้การกำกับดูแล

**ฉบับ:** ภาษาไทย  
**วันที่:** 26 กรกฎาคม 2026  
**สถานะ:** Allowlist เชิงกลที่เสนอไว้ งานนี้ยังไม่คัดลอกไฟล์ baseline ต้นทาง  
**ต้นทาง:** `C:\Users\thai3\determined-williams (2)` ที่ `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4`  
**เป้าหมาย:** `C:\tmp\monolith-global-connector-registry-parent` ที่ base `13bcf5149570feb6ec5c7b15dbefd1fb88ef4161`

## สรุป

- ไฟล์ที่รวม: **77**
- จำนวนไบต์ต้นทางรวม: **712400**
- Inventory SHA-256: `1d25a3fdc6bb008d227fcfc80e865dd244396f8842778135e5afa833bbabb2db`
- ข้อตกลง digest: ใช้ **SHA-256** กับ **compact JSON ของ `/files` ที่เข้ารหัส UTF-8** โดยรักษาลำดับ array และลำดับ key ตาม manifest และกำหนด **`trailing_newline=false`** (`ConvertTo-Json -Depth 20 -Compress`)
- การดำเนินการ: **77 ADD**, **0 REPLACE**
- สถานะ Git ต้นทาง: **77 untracked**, **0 tracked**, **0 modified**

ไฟล์ JSON เป็นหลักฐานแบบ machine-readable ที่มีอำนาจกำกับ แต่ละรายการตรึง path แบบ POSIX ที่สัมพันธ์กับ repository, จำนวนไบต์ที่แน่นอน, SHA-256, กลุ่มวัตถุประสงค์, สถานะ Git ต้นทาง, การดำเนินการต่อเป้าหมาย และเหตุผลที่ต้องใช้

## กลุ่มวัตถุประสงค์

| กลุ่มวัตถุประสงค์ | ไฟล์ | ไบต์ |
| --- | ---: | ---: |
| bootstrap-configuration | 2 | 859 |
| bounded-context-skeleton | 13 | 598 |
| component-master-engine | 6 | 31243 |
| component-master-seed | 6 | 34035 |
| identity-tenancy-contracts | 2 | 7706 |
| identity-tenancy-documentation | 4 | 19098 |
| intended-27-test-suite | 7 | 24573 |
| repository-context | 8 | 42279 |
| verification-entrypoint | 1 | 20150 |
| verifier-required-adrs | 16 | 154669 |
| verifier-required-bootstrap-plan | 4 | 95589 |
| verifier-required-bootstrap-report | 4 | 64133 |
| verifier-required-research | 4 | 217468 |
| **รวม** | **77** | **712400** |

## ขอบเขตการดำเนินการ

Allowlist นี้ครอบคลุมเฉพาะ baseline ของ kitchen kernel ใน parent ที่อยู่ภายใต้การกำกับดูแล งานที่ได้รับการทบทวนในภายหลังจึงจะคัดลอกรายการได้เมื่อไบต์ต้นทางยังตรงกับขนาดและ hash ที่ตรึงไว้ และ path เป้าหมายที่ resolve แล้วยังอยู่ภายใน isolated parent worktree เท่านั้น Nested runtime และ noise root ที่ห้ามทั้งหมดอยู่นอกขอบเขต Manifest นี้ไม่อ้างความพร้อมด้าน runtime, deployment, manufacturing หรือ production

## การยกเว้น

Allowlist ไม่รวม nested repository `determined-williams/`, `Documents/`, `All aboute kitchen/`, `artifacts/`, `tmp/`, `.tmp.driveupload/`, `worktrees/`, downloads, archives, ระบบผลิตภัณฑ์ที่ถูกคัดลอก, ไดเรกทอรี PDF/catalog ต้นทาง, `desktop.ini`, bytecode/cache, ผล verification ที่สร้างขึ้น, dependency/build output, credentials, secret values และเอกสารหรือเครื่องมือข้างเคียงที่ไม่เกี่ยวข้อง จำนวนการยกเว้นใน JSON คือจำนวนคลาสของกฎ ไม่ใช่ผลจากการ scan หรือ hash dirty tree แบบกว้าง

## Dependency ที่มีอยู่แล้วในเป้าหมาย

เป้าหมาย track ชุดทดสอบ agent guardrail และ render-doc อยู่แล้ว รวมถึง governance tools/hooks, allowlist และ `.github/workflows/claim-guardrails.yml` รายการเหล่านี้ถูกบันทึกเป็น existing target dependencies ใน JSON และอยู่นอกชุดรายการ ADD โดยตั้งใจ

## ประเด็น migration ของ verifier ที่ยังต้องดำเนินการ

- `VERIFIER-TEST-COUNT-MIGRATION` — `tools/verify_kitchen_kernel.py` กำหนดจำนวนที่คาดไว้เป็น 27 tests โดย baseline kitchen-kernel ที่ตั้งใจไว้คือ 20 Component Master tests และ 7 identity-tenancy tests ส่วนการ discover ทั้ง source root ปัจจุบันรัน 258 tests เพราะชุดทดสอบ agent guardrail และ render-doc ที่มีอยู่แล้วเข้าร่วมด้วย งาน TDD ที่ได้รับอนุญาตถัดไปต้อง migrate assertion นี้
- `VERIFIER-GIT-BOOTSTRAP-MIGRATION` — `check_git` กำหนด assertion เป็น `head_exists == false`, staged path เท่ากับศูนย์ และ remote เท่ากับศูนย์ ขณะที่ isolated adoption target เป็น linked worktree ที่จัดตั้งแล้ว งาน TDD ที่ได้รับอนุญาตถัดไปต้อง migrate assertion สำหรับ bootstrap นี้

## Gate เชิงกลสำหรับงานภายหลัง

ก่อนคัดลอก ต้อง parse JSON, อ่านไฟล์ต้นทางทุกไฟล์ใหม่, ตรวจจำนวนไบต์และ SHA-256 ที่แน่นอน, ปฏิเสธ path ที่ห้าม, resolve ทุกเป้าหมายให้อยู่ใต้ isolated target root และปฏิเสธเป้าหมายที่สถานะปัจจุบันขัดกับการดำเนินการ ADD ที่บันทึกไว้
