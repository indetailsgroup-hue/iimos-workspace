# Global Connector Registry — บัญชีความคืบหน้า SDD

## งานที่ 1: Worktree แบบคู่และ baseline gate

**บันทึกเมื่อ:** 26–27 กรกฎาคม 2026
**สถานะ:** COMPLETE
**ฉบับ:** ภาษาไทย
**ไฟล์คู่กัน:** `global-connector-registry-progress.md` (Markdown ภาษาอังกฤษ), `global-connector-registry-progress.en.html`, `global-connector-registry-progress.th.html`
**เงื่อนไขที่ทำให้หยุดในอดีต (ถูกแทนที่แล้ว):** baseline แรกของ parent ที่แผนกำหนดจบด้วยสถานะไม่เป็นศูนย์ เพราะไม่มี test input ที่ tracked อยู่ใน isolated baseline ตามแผน implementation จึงไม่ได้รันคำสั่ง baseline หลังจากนั้นในการทำงานรอบแรก
**การปิดงาน:** การ adopt baseline และ migrate verifier ที่เจ้าของอนุมัติได้แก้ช่องว่าง baseline สองรายการแล้ว Gate ของ parent และ isolated runtime สำหรับงานที่ 1 ผ่านใหม่เมื่อ 27 กรกฎาคม 2026 งานที่ 2 COMPLETE แล้ว และยังไม่ได้เริ่มงานที่ 3

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

## ประเด็นคงเหลือในอดีต ณ จุดหยุดครั้งแรก

- `tests/component_master/`, `packages/component-master/` และ `data/component-master/` ไม่มีอยู่ใน tracked isolated baseline สำเนาที่พบมีเฉพาะเนื้อหา untracked ใน checkout เดิม การนำมารวมต้องได้รับอนุญาตแยกต่างหาก
- `CONTEXT.md` และเอกสารแก้ไขขอบเขต repository วันที่ 21 กรกฎาคมไม่มีอยู่ใน parent commit `9597ce69` จึงอ่านจาก governance checkout เดิมเพื่อปฏิบัติตามข้อกำหนดการกำหนดเส้นทาง repository เท่านั้น และไม่ได้แก้ไขไฟล์ใดใน checkout นั้น
- Controller ติดตั้ง runtime dependencies ก่อนเริ่มงานนี้ งานนี้ไม่ได้สร้างหรือพบ npm installation/audit output จึงไม่มีการกล่าวอ้างเกี่ยวกับ npm audit
- ไม่ได้รัน Minifix targeted tests และ runtime typecheck ดังนั้นข้อกำหนดเหล่านี้ยังไม่สำเร็จและไม่สามารถยืนยันได้จากงานที่ 1
- ไม่มีการเปลี่ยน production source ส่วน runtime worktree ยังคงเป็น read/test-only และไม่เปลี่ยนแปลง

## การแก้ไขที่ได้รับอนุมัติและสถานะปัจจุบันของงานที่ 1

การอนุมัติของเจ้าของคือ `อนุมัติ baseline adoption + verifier migration` หลักฐานสถานะ BLOCKED ด้านบนยังคงอยู่เป็นประวัติของการทำงานรอบแรก และถูกแทนที่เฉพาะสำหรับสถานะปัจจุบันของงานที่ 1 ด้วยการแก้ไขที่ผ่าน review และ gate ปิดงานใหม่ด้านล่าง

สถานะปัจจุบันของงานที่ 1 คือ **COMPLETE** หมายถึง baseline แบบคู่และ verifier gate ถูกจัดตั้งสำหรับ cohort ที่มี governance ใน parent และ baseline runtime แบบ isolated ที่ pin ไว้ ไม่ได้หมายถึงเริ่มงานที่ 2, รวม runtime branch, ยืนยัน production/manufacturing readiness หรือยกเลิก NOT-FOR-PRODUCTION

## ลำดับการแก้ไขที่ยอมรับแล้ว

| ขั้น | Commit | ผลที่บันทึก |
| --- | --- | --- |
| Adoption manifest | `a3f6216977c2f6e595c11654a13f7be441bb8dd7` | สร้าง manifest ที่ tracked จำนวนห้า artifact/edition สำหรับ allowlist แบบ exact จำนวน 77 ไฟล์ รวม 712,400 ไบต์ |
| การแก้ manifest | `a6a8d8bd18a871784e806cf54c3a2d6836a540fa` | จัดแนวฉบับ EN/TH, purpose group, migration ที่ยังไม่จบ และ execution contract แบบ ADD-only ค่า SHA-256 สุดท้ายของ manifest JSON คือ `7987272b4b9828574d5244e5a99ef31f423b5546425a643358d2f30ebcc846ee` และ SHA-256 ของ compact inventory คือ `1d25a3fdc6bb008d227fcfc80e865dd244396f8842778135e5afa833bbabb2db` |
| Guardrail ของ excluded root | `929bb9413ee1f49a7f057dbf4b6911195423cca2` | ทำให้ claim linter ทั้งสองปฏิเสธ excluded path ก่อนตรวจการมีอยู่ของ path |
| Adopt governed cohort | `6dd9937295ba3838bfa57d2610dfb5d0cf316e9d` | เพิ่มพาธตาม manifest ครบ 77 พาธ โดยไม่พบบันทึก manifest collision, พาธขาด หรือพาธเกิน |
| Migrate verifier สำหรับ established state | `11f42a052b48479ba20cda54dd9e85da6f5af7a7` | เพิ่มหลักฐาน governed suite แบบ exact, ยอมรับ Git repository ที่จัดตั้งแล้วและสะอาด และย้าย schema ของ summary เป็น `1.1.0` |
| แก้ remote query ให้ fail closed | `01bf7b51051a520d77b0e9b510d89a0e611ad295` | กำหนดให้ query `git remote` ต้องสำเร็จ และป้องกันไม่ให้ตีความ stderr เป็นชื่อ remote |

ไบต์ source ที่ adopt แล้วยังมีคำเตือน advisory ที่รับต่อมา: `git diff --cached --check` รายงาน 21 ไฟล์ที่ยอมรับแล้วว่ามี `new blank line at EOF` เนื่องจาก manifest pin ไบต์เหล่านั้น การ adopt จึงไม่เขียนทับใหม่

## ลำดับคำตัดสินของ reviewer

| Review | คำตัดสิน | การจัดการ |
| --- | --- | --- |
| Review แรกของ adoption manifest | `NEEDS_FIXES` | แก้ด้วย `a6a8d8bd` และไม่ได้อ้างว่าได้รับการยอมรับตั้งแต่รอบแรก |
| Rereview manifest ที่แก้แล้ว | `ACCEPTED` | ยอมรับหลังแก้ความสอดคล้องของ edition และ execution contract |
| Review excluded-root guardrail | `ACCEPTED` | ยอมรับที่ `929bb941` |
| Review baseline adoption | `ACCEPTED` | ยอมรับที่ `6dd99372` |
| Review แรกของ verifier migration | `NEEDS_FIXES` | พบ defect ที่ remote query เปิดให้ผ่านเมื่อผิดพลาด และไม่ได้อ้างว่าได้รับการยอมรับตั้งแต่รอบแรก |
| Rereview verifier ที่แก้แล้ว | `ACCEPTED` | ยอมรับหลังแก้ให้ fail closed ที่ `01bf7b51` |

## หลักฐาน verifier migration

**PRE-MIGRATION:** การรันบน commit ที่ adopt แล้ว `6dd99372` ในสภาพสะอาดจบด้วย exit `1`, schema `1.0.0`, 12 checks, ผ่าน 10 และล้มเหลวตรงสองรายการ:

1. `unittest_full_suite` ปฏิเสธ ambient run ที่สำเร็จ 258 tests เพราะ verifier เก่า encode เงื่อนไข `test_count == 27`
2. `git_bootstrap_state` ปฏิเสธ linked worktree ที่จัดตั้งแล้วและสะอาด เพราะ verifier เก่ากำหนดให้เป็น repository ที่ยังไม่มี HEAD, index และ remote

สองรายการนี้คือ failure ที่อนุมัติให้ migrate ส่วนอีก 10 checks ผ่าน

**POST-MIGRATION:** verifier ที่แก้แล้วที่ `01bf7b51` ใช้ schema `1.1.0`, กำหนด ambient suite ที่สำเร็จและมากกว่าค่าขั้นต่ำโดยไม่ encode จำนวนรวมทั้งหมด, กำหนด governed suite แบบ exact 20 tests สำหรับ Component Master บวก 7 tests สำหรับ identity-tenancy และตรวจ Git state ที่จัดตั้งแล้วและสะอาด Regression ของ remote query ล้มเหลวแบบ fail closed ส่วน closeout run ใหม่ด้านล่างให้ผลผ่าน 13/13 checks

## Gate สุดท้ายที่รันใหม่ — 27 กรกฎาคม 2026

### Isolated worktree ของ parent governance/bootstrap

| Gate | Exit | หลักฐานใหม่ |
| --- | ---: | --- |
| `python -B -m unittest discover -s tests/component_master -v` | `0` | รัน 20 tests แบบ exact และจบด้วย `OK` |
| `python -B tools/verify_kitchen_kernel.py` | `0` | Schema `1.1.0`; 13 checks, ผ่าน 13, ล้มเหลว 0 Ambient discovery รัน 269 tests พร้อม `OK` จริง จำนวนรวมนี้เป็น observation ไม่ใช่ requirement ถาวร Governed suites เท่ากับ 20 + 7 แบบ exact |
| หลักฐาน Git ของ verifier | `0` | `HEAD` `01bf7b51051a520d77b0e9b510d89a0e611ad295`, branch `codex/global-connector-registry`, สถานะ porcelain/cached/unstaged/unmerged ว่าง, remote query exit `0`, มี remote เชิงข้อมูลหนึ่งรายการ (`origin`) และไม่มีการอ้างว่า push |

Summary ที่สร้างใหม่ก่อน cleanup ตามที่อนุมัติ: 57,552 ไบต์; SHA-256 `1edaba16a0aab0ff6dca8521cebdba11d473ef7c92154a3cd527bdc5853e5877` จากนั้นลบ summary ที่ ignored แบบ exact และไดเรกทอรี `__pycache__` ที่สร้างขึ้นแปดรายการ และไม่เหลือไดเรกทอรี cache

### Isolated worktree ของ nested MONOLITH runtime

| Gate | Exit | หลักฐานใหม่ |
| --- | ---: | --- |
| การรักษา T1b | `0` | `src/core/connector/worldSynthesis.ts` มีทั้ง `opts.connectorCount` และ `opts.excludeCorners` ไฟล์มีขนาด 15,694 ไบต์ และ SHA-256 `99ee18918f60ea815cf2c718513ef90d025ad862cde88562df1efa447f4e56c8` ตรงกันระดับไบต์กับสำเนาของ owner แบบ read-only ทั้งตอนสังเกต gate ที่ `b361fb5e` และตอนสังเกตสุดท้ายที่ `a1e9006a` |
| `npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet` | `0` | ผ่าน 19 test files และผ่าน 207 tests |
| `npm.cmd run typecheck:all` | `0` | `tsc -b tsconfig.build.json` จบสำเร็จ |

Toolchain ที่บันทึกสำหรับ closeout นี้: Git `2.52.0.windows.1`, Python `3.14.2`, Node.js `v22.21.1`, npm `11.6.2`, TypeScript `5.9.3`, Vitest `3.0.0` และ runtime package `monolith-workspace@2.1.0`

## NOT-FOR-PRODUCTION และขีดจำกัดของหลักฐาน

- NOT-FOR-PRODUCTION ยังทำงานอยู่: `SHADOW_MODE_NOT_FOR_PRODUCTION = true`; targeted run ผ่าน NFP tests ทั้งสี่ที่ครอบคลุม notice file, การรวมใน manifest/hash และคำนำหน้า ZIP `NFP-`
- Live Minifix recipe ยังคงไม่ได้มี source ครบโดยเจตนา: provenance tests ที่ผ่านบันทึกค่าหนึ่งรายการเป็น `CONTRADICTED` (เส้นผ่านศูนย์กลาง sleeve Ø10) และสองรายการเป็น `UNSOURCED` (ความลึก bolt-bore 17.5 มม. และการใช้ทางเข้า Ø7.5)
- Software gate ไม่ได้ยืนยัน production, manufacturing, machine/coupon/first-article, security, field หรือ operational readiness
- Daph ยังคงเป็นหนึ่ง tenant/pilot ไม่ใช่ขอบเขตของระบบและไม่ได้เป็นเจ้าของข้อมูล canonical ที่ใช้ร่วมกัน

## Snapshot การกำหนดเส้นทางสี่ root

| Root และขอบเขตคำกล่าวอ้าง | HEAD / branch | สถานะที่สังเกต |
| --- | --- | --- |
| Original parent governance/bootstrap root — ใช้รองรับคำกล่าวอ้างของ parent เท่านั้น: `C:\Users\thai3\determined-williams (2)` | `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4` / `guardrails/claim-linters` | Checkout ภายนอกไม่สะอาด: 8,342 entries (tracked change 1, untracked 8,341) เมื่อสังเกตตอน closeout; งานนี้ไม่เคยแก้ไข |
| Original nested product runtime — ใช้รองรับคำกล่าวอ้างของ runtime เท่านั้น: `C:\Users\thai3\determined-williams (2)\determined-williams` | `a1e9006add32fe3ce5346eb6ca94e8bdce1d13ab` / `fix/dxf-truth-chain` | Lane ภายนอกไม่สะอาด: 67 entries (tracked changes 18, untracked 49) เมื่อสังเกตสุดท้ายตอน closeout; งานนี้ไม่เคยแก้ไข และ lane เดินหน้าพร้อมกันจากจุดสังเกต gate `b361fb5e` |
| Isolated parent closeout lane: `C:\tmp\monolith-global-connector-registry-parent` | Evidence base `01bf7b51051a520d77b0e9b510d89a0e611ad295` / `codex/global-connector-registry` | สะอาดก่อนแก้ ledger และหลัง cleanup artifact ที่สร้าง |
| Isolated runtime baseline lane: `C:\tmp\monolith-global-connector-registry-runtime` | `ed036a2ceebc8c3c9fa71edd3fc85ff67ca53b97` / `codex/global-connector-runtime` | สะอาด; read/test-only; ไม่มีการเปลี่ยน runtime source |

Owner runtime แตกต่างจาก isolated baseline เนื่องจาก lane ภายนอกที่ทำงานพร้อมกัน งานนี้ไม่ได้ sync หรือ integrate operation การตรวจ overlap และ stable-tree gate ใหม่แบบ exact ยังเป็นข้อบังคับทันทีก่อนงานที่ 14

## ขอบเขตงานและประเด็นคงเหลือ

- ปิดงานที่ 1 เฉพาะการจัดตั้ง paired baseline และการแก้ไขที่ยอมรับแล้ว
- งานที่ 2 COMPLETE แล้ว และยังไม่ได้เริ่มงานที่ 3
- ไม่ได้เปลี่ยน runtime/source product code และไม่ได้รวม runtime branch
- ไม่ได้ push หรือ merge
- รายงาน manifest คงสถานะ `DONE_WITH_CONCERNS` เพราะ migration สองรายการยังไม่จบ ณ เวลานั้น Closeout นี้รักษาประวัติดังกล่าวและบันทึกการแก้ไขที่ยอมรับในภายหลัง
- คำเตือน EOF ที่รับต่อมา 21 รายการยังเป็น advisory debt ในไบต์ source ที่ยอมรับแล้ว
- Production readiness อยู่นอกขอบเขตงานนี้ และต้องมี physical qualification พร้อม owner ratification

## การปิดงานที่ 2 — 27 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 2:** `e048ec3fb765ab53ae0f3778dfbe3a3483129711`
**Implementation commit:** `84e9b16141fad33be2921cbfcd4796120ac7260b`
**ขอบเขตถัดไป:** ยังไม่ได้เริ่มงานที่ 3

### การแก้ compatibility ของ verifier ที่ยอมรับแล้ว

ก่อนงานที่ 2 commit `e048ec3fb765ab53ae0f3778dfbe3a3483129711` ที่ยอมรับแล้วได้แก้ verifier ให้เลือก cohort เดิมที่มี governance และถูก freeze ไว้ด้วยชื่อ module แบบ explicit:

- Component Master: `tests.component_master.test_boring_standard`, `tests.component_master.test_catalog_baseline`, `tests.component_master.test_finish_taxonomy` และ `tests.component_master.test_seed_integrity`
- Identity-tenancy: `tests.identity_tenancy.test_contracts`

จำนวน governed ยังคง exact ที่ 20 + 7 ขณะที่ full repository suite ยังคงเป็นแบบ dynamic หลักฐานใหม่ที่ยอมรับ ณ การแก้นี้คือ focused verifier-contract tests 12 รายการ, dynamic full-suite tests 270 รายการ และผล verifier จาก clean HEAD ด้วย schema `1.1.0` ผ่าน 13/13 checks โดย governed suites ยังคง exact ที่ 20 + 7 คำตัดสินใหม่ของ reviewer คือ `ACCEPTED` การแก้นี้จำเป็นเพื่อให้ registry tests ใหม่ยังถูกพบใน full discovery โดยไม่เปลี่ยนจำนวน legacy governed ที่ freeze ไว้

### พาธที่อนุญาตสำหรับงานที่ 2

Implementation commit `84e9b16141fad33be2921cbfcd4796120ac7260b` เปลี่ยนพาธที่อนุญาต exactly สี่รายการต่อไปนี้:

1. `packages/component-master/src/monolith_component_master/registry_models.py`
2. `packages/component-master/src/monolith_component_master/__init__.py`
3. `tests/component_master/registry/test_registry_models.py`
4. `tests/component_master/registry/__init__.py` — package marker สำหรับ discovery ที่อนุญาตเฉพาะเพื่อให้ `unittest discover` มาตรฐานลงไปพบ registry tests

ไม่มีการเปลี่ยนไฟล์ใน owner root หรือ runtime ส่วน `catalog.py` และ interface เดิม `SupplierSKU` ยังคงไม่เปลี่ยนแปลง

### Contract ของ public identity model แบบ exact

Package export interface ใหม่ exactly หกรายการ ได้แก่ `VerificationDimension`, `VerificationState`, `LifecycleState`, `CommercialSku`, `ProductModel` และ `Registry`

- `VerificationDimension` มี exactly `IDENTITY=identity`, `GEOMETRY=geometry`, `BOM=bom`, `TOOLING=tooling`, `MATERIAL_THICKNESS=material_thickness`, `STRUCTURAL=structural`, `COMMERCIAL=commercial`, `FIELD=field`, `LIFECYCLE=lifecycle` และ `RIGHTS=rights`
- `VerificationState` มี exactly `VERIFIED`, `PENDING`, `REGION_ONLY`, `DISCONTINUED` และ `BLOCKED` โดย value เป็นตัวพิมพ์ใหญ่ตรงกับชื่อ
- `LifecycleState` มี exactly `PENDING`, `ACTIVE`, `REGION_ONLY`, `SUPERSEDED`, `DISCONTINUED` และ `SOURCE_BLOCKED` โดย value เป็นตัวพิมพ์ใหญ่ตรงกับชื่อ
- `CommercialSku` แบบ immutable มี field exactly `global_id`, `brand_id`, `model_id`, `oem_order_code`, `region`, `pack_qty` และ `verification` ID ต้องมี prefix `sku:`, `brand:` และ `model:` พร้อมเนื้อหาที่ไม่ว่าง order code และ region ต้องไม่ว่าง pack quantity ต้องเป็น integer บวกที่ไม่ใช่ boolean และ map ต้องมี typed verification dimension ทุกมิติ exactly หนึ่งครั้งพร้อม typed state ระบบทำ defensive copy ให้ map เป็น read-only และตรวจแยกตามมิติด้วย `is_verified`
- `ProductModel` แบบ immutable มี field exactly `model_id`, `brand_id`, `name` และ `lifecycle` ID ต้องมี prefix `model:` และ `brand:` พร้อมเนื้อหาที่ไม่ว่าง name ต้องไม่ว่าง และ lifecycle ต้องเป็น `LifecycleState` ที่มี type ถูกต้อง
- `Registry` แบบ immutable ทำ defensive copy ของ model และ SKU ลงใน read-only exact-ID map ปฏิเสธ entry ที่ไม่ใช่ model/SKU, ค่า `model_id` ซ้ำ, ค่า `global_id` ของ SKU ซ้ำก่อนที่ mapping จะยุบ record ที่ต่างกัน และ SKU ที่อ้างถึง model ที่ไม่รู้จัก `get_model(model_id)` และ `get_sku(global_id)` เป็น exact lookup ที่กำหนดผลได้แน่นอน และคืน `None` เมื่อไม่พบ

### หลักฐาน TDD และการตรวจสอบ

| Gate | ผลที่ยอมรับแล้ว |
| --- | --- |
| RED ก่อนแก้ production | `python -m unittest tests.component_master.registry.test_registry_models -v` จบด้วย exit `1` เพราะยังไม่มี `monolith_component_master.registry_models` |
| Targeted + legacy GREEN | ผ่าน 34/34 tests: registry contracts ใหม่ 24 + seed-integrity contracts เดิม 10; `OK` |
| Dynamic full discovery | ผ่าน 294/294 tests: dynamic เดิม 270 + Task 2 tests exactly 24; `OK` |
| Focused verifier contracts | ผ่าน 12/12 tests; `OK` |
| Verifier ครั้งเดียวจาก clean HEAD | Schema `1.1.0`; ผ่าน 13/13 checks; governed suites exact 20 + 7; dynamic suite 294; Python compile และหลักฐาน Git ผ่าน |
| Review | คำตัดสินใหม่ของ reviewer คือ `ACCEPTED` |

### ความสมบูรณ์ของหลักฐานและ cleanup

- รายงานงานที่ 2 ที่ยอมรับแล้ว: `.superpowers/sdd/task-2-identity-models-report.md`; 5,907 ไบต์; SHA-256 `a6075621f56218d3ad42fbba6934c736694fc2e68f4f7cb64e3fb70092fd7599`
- Native full-index binary review package ที่ยอมรับแล้ว: `.superpowers/sdd/task-2-identity-models-review-package.diff`; 22,760 ไบต์; SHA-256 `5e1c9bd0c49a34dccf3a84308dad7f2ebe15d00e776e7bd167e2b611bf731fea`
- Verifier summary ที่สร้างจาก clean HEAD ก่อน cleanup: 61,845 ไบต์; SHA-256 `6ab7d67b41e8540fd74cc6b7fc0d0d8bf8101183aaaeeec8139d21269d5a9e7f`
- ลบ verifier summary ที่ ignored และ cache ที่สร้างแล้วหลังบันทึกหลักฐาน

### ขอบเขตอำนาจของงานที่ 2

- งานที่ 2 สร้างเฉพาะรากฐาน identity ของ domain ไม่ใช่ living registry ที่มีข้อมูลแล้ว
- งานนี้ไม่ได้สร้าง evidence vault, ingestion pipeline, การ resolve BOM, qualification workflow, release authority หรือ runtime integration
- งานนี้ไม่ได้สร้าง production หรือ manufacturing authority และ NOT-FOR-PRODUCTION ยังคงไม่เปลี่ยนแปลง
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push หรือ merge
- งานที่ 3 เป็นงานถัดไปและยังไม่ได้เริ่ม
