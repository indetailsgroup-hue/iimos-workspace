# Global Connector Registry — บัญชีความคืบหน้า SDD

## งานที่ 1: Worktree แบบคู่และ baseline gate

**บันทึกเมื่อ:** 26 กรกฎาคม 2026
**สถานะ:** BLOCKED
**ฉบับ:** ภาษาไทย
**ไฟล์คู่กัน:** `global-connector-registry-progress.md` (Markdown ภาษาอังกฤษ), `global-connector-registry-progress.en.html`, `global-connector-registry-progress.th.html`
**เงื่อนไขที่ทำให้หยุด:** baseline แรกของ parent ที่แผนกำหนดจบด้วยสถานะไม่เป็นศูนย์ เพราะไม่มี test input ที่ tracked อยู่ใน isolated baseline ตามแผน implementation จึงไม่ได้รันคำสั่ง baseline หลังจากนั้น

## Isolated worktree แบบคู่

### Worktree ของ parent governance/bootstrap

- พาธแบบเต็ม: `C:\tmp\monolith-global-connector-registry-parent`
- Branch: `codex/global-connector-registry`
- `git rev-parse HEAD`: `9597ce6924b14ec71fe311160a7dfe927f449b13`
- Approved-design ancestor: `92d67571`
- `git status --short` ก่อน baseline: ว่าง
- Git directory: `C:/Users/thai3/determined-williams (2)/.git/worktrees/monolith-global-connector-registry-parent`
- Common Git directory: `C:/Users/thai3/determined-williams (2)/.git`
- Superproject working tree: ว่าง (ไม่ใช่ submodule)
- ผลการตรวจ isolation: ยืนยันว่าเป็น linked worktree

### Worktree ของ nested MONOLITH runtime

- พาธแบบเต็ม: `C:\tmp\monolith-global-connector-registry-runtime`
- Branch: `codex/global-connector-runtime`
- `git rev-parse HEAD`: `ed036a2ceebc8c3c9fa71edd3fc85ff67ca53b97`
- Minifix provenance baseline: คง `ed036a2c` ไว้โดยไม่เปลี่ยนแปลง
- `git status --short` ก่อน baseline: ว่าง
- Git directory: `C:/Users/thai3/determined-williams (2)/determined-williams/.git/worktrees/monolith-global-connector-registry-runtime`
- Common Git directory: `C:/Users/thai3/determined-williams (2)/determined-williams/.git`
- Superproject working tree: ว่าง (ไม่ใช่ submodule)
- ผลการตรวจ isolation: ยืนยันว่าเป็น linked worktree

## Toolchain

- Python: `Python 3.14.2`
- Node.js: `v22.21.1`
- npm: `11.6.2`

## ความพร้อมของเนื้อหาใน tracked baseline

- ที่ parent baseline `9597ce6924b14ec71fe311160a7dfe927f449b13` คำสั่ง `git ls-tree` รายงานว่าไม่มี tracked entry ใต้พาธต่อไปนี้:
  - `tests/component_master/`
  - `packages/component-master/`
  - `data/component-master/`
- ทั้งสามพาธไม่มีอยู่ใน isolated parent worktree
- พาธเดียวกันมีอยู่เฉพาะในรูปแบบเนื้อหา untracked (`??`) ใน governance checkout เดิม
- ไม่มีการคัดลอก stage หรือแก้ไขเนื้อหา untracked ใน checkout เดิม การนำเนื้อหาดังกล่าวมารวมกับ isolated baseline ต้องได้รับอนุญาตแยกต่างหากและอยู่นอกขอบเขตงานที่ 1

## สถานะ NOT-FOR-PRODUCTION

- สถานะ: ทำงานอยู่
- หลักฐานจาก source: `src/core/config/shadowMode.ts:16` ใน runtime worktree ประกาศ `SHADOW_MODE_NOT_FOR_PRODUCTION = true`
- พาธหลักฐานของ packet: `src/factory/packet/buildFactoryPacket.ts` เพิ่ม `NOT_FOR_PRODUCTION.txt` และ `src/factory/packet/zipBundle.ts` ใช้คำนำหน้า `NFP-` ขณะที่ shadow mode ทำงาน
- หมายเหตุการตรวจสอบ: ตรวจ source state แล้ว แต่ไม่ได้รัน runtime targeted baseline เพราะแผนกำหนดให้หยุดเมื่อ parent baseline แรกล้มเหลว

## คำสั่ง baseline ที่กำหนด

### 1. Parent component-master unit tests — FAIL

คำสั่ง:

```powershell
python -m unittest discover -s tests/component_master -v
```

Exit status: `1`

Output ที่บันทึกได้ครบถ้วน:

```text
Traceback (most recent call last):
  File "<frozen runpy>", line 198, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\__main__.py", line 18, in <module>
    main(module=None)
    ~~~~^^^^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 103, in __init__
    self.parseArgs(argv)
    ~~~~~~~~~~~~~~^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 119, in parseArgs
    self._do_discovery(argv[2:])
    ~~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 242, in _do_discovery
    self.createTests(from_discovery=True, Loader=Loader)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\main.py", line 149, in createTests
    self.test = loader.discover(self.start, self.pattern, self.top)
                ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\thai3\AppData\Local\Programs\Python\Python314\Lib\unittest\loader.py", line 334, in discover
    raise ImportError('Start directory is not importable: %r' % start_dir)
ImportError: Start directory is not importable: 'tests/component_master'
```

สรุปผลที่พบ: unittest discovery ไม่เริ่มทำงาน เพราะ `tests/component_master/` ไม่มีอยู่ใน tracked isolated baseline ดังนั้น Python จึงรายงานว่า start directory ที่ระบุไม่สามารถ import ได้ และไม่มีจำนวน test หรือสรุปผลผ่าน

สิ่งที่ทำให้งานติดขัด: test, implementation package และ seed data ที่ต้องใช้ไม่มีอยู่ใน tracked isolated baseline และมีอยู่เฉพาะในรูปแบบเนื้อหา untracked ของ checkout เดิม ต้องมีการเปลี่ยนแปลงเพื่อรวม baseline ที่ได้รับอนุญาตแยกต่างหากก่อนที่คำสั่งนี้จะตรวจ component-master baseline ตามเจตนาได้

### 2. Parent kitchen-kernel verifier — NOT RUN

คำสั่ง:

```powershell
python tools/verify_kitchen_kernel.py
```

Exit status: ไม่ได้รันหลังถึงเงื่อนไขที่กำหนดให้หยุด

### 3. Runtime targeted tests — NOT RUN

คำสั่ง:

```powershell
npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet
```

Exit status: ไม่ได้รันหลังถึงเงื่อนไขที่กำหนดให้หยุด

ข้อกำหนด Minifix targeted test: **ยังไม่ผ่านข้อกำหนด — ไม่ได้รัน / ไม่สามารถยืนยันได้**

งานนี้ไม่ได้ประเมินสถานะ provenance ของ Minifix live recipe ซ้ำ Runtime commit `ed036a2c` คงเดิมโดยไม่เปลี่ยนแปลง แต่การไม่เปลี่ยนแปลงเพียงอย่างเดียวไม่ทำให้ข้อกำหนด targeted test สำเร็จ

### 4. Runtime typecheck — NOT RUN

คำสั่ง:

```powershell
npm.cmd run typecheck:all
```

Exit status: ไม่ได้รันหลังถึงเงื่อนไขที่กำหนดให้หยุด

## ประเด็นที่ยังคงเหลือ

- `tests/component_master/`, `packages/component-master/` และ `data/component-master/` ไม่มีอยู่ใน tracked isolated baseline สำเนาที่พบมีเฉพาะเนื้อหา untracked ใน checkout เดิม การนำมารวมต้องได้รับอนุญาตแยกต่างหาก
- `CONTEXT.md` และเอกสารแก้ไขขอบเขต repository วันที่ 21 กรกฎาคมไม่มีอยู่ใน parent commit `9597ce69` จึงอ่านจาก governance checkout เดิมเพื่อปฏิบัติตามข้อกำหนดการกำหนดเส้นทาง repository เท่านั้น และไม่ได้แก้ไขไฟล์ใดใน checkout นั้น
- Controller ติดตั้ง runtime dependencies ก่อนเริ่มงานนี้ งานนี้ไม่ได้สร้างหรือพบ npm installation/audit output จึงไม่มีการกล่าวอ้างเกี่ยวกับ npm audit
- ไม่ได้รัน Minifix targeted tests และ runtime typecheck ดังนั้นข้อกำหนดเหล่านี้ยังไม่สำเร็จและไม่สามารถยืนยันได้จากงานที่ 1
- ไม่มีการเปลี่ยน production source ส่วน runtime worktree ยังคงเป็น read/test-only และไม่เปลี่ยนแปลง
