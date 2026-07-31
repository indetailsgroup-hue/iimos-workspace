# Global Connector Registry — บัญชีความคืบหน้า SDD

## งานที่ 1: Worktree แบบคู่และ baseline gate

**บันทึกเมื่อ:** 26–27 กรกฎาคม 2026
**สถานะ:** COMPLETE
**ฉบับ:** ภาษาไทย
**ไฟล์คู่กัน:** `global-connector-registry-progress.md` (Markdown ภาษาอังกฤษ), `global-connector-registry-progress.en.html`, `global-connector-registry-progress.th.html`
**เงื่อนไขที่ทำให้หยุดในอดีต (ถูกแทนที่แล้ว):** baseline แรกของ parent ที่แผนกำหนดจบด้วยสถานะไม่เป็นศูนย์ เพราะไม่มี test input ที่ tracked อยู่ใน isolated baseline ตามแผน implementation จึงไม่ได้รันคำสั่ง baseline หลังจากนั้นในการทำงานรอบแรก
**การปิดงาน:** การ adopt baseline และ migrate verifier ที่เจ้าของอนุมัติได้แก้ช่องว่าง baseline สองรายการแล้ว Gate ของ parent และ isolated runtime สำหรับงานที่ 1 ผ่านใหม่เมื่อ 27 กรกฎาคม 2026 งานที่ 2 และงานที่ 3 COMPLETE แล้ว และยังไม่ได้เริ่มงานที่ 4

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
- งานที่ 2 และงานที่ 3 COMPLETE แล้ว และยังไม่ได้เริ่มงานที่ 4
- ไม่ได้เปลี่ยน runtime/source product code และไม่ได้รวม runtime branch
- ไม่ได้ push หรือ merge
- รายงาน manifest คงสถานะ `DONE_WITH_CONCERNS` เพราะ migration สองรายการยังไม่จบ ณ เวลานั้น Closeout นี้รักษาประวัติดังกล่าวและบันทึกการแก้ไขที่ยอมรับในภายหลัง
- คำเตือน EOF ที่รับต่อมา 21 รายการยังเป็น advisory debt ในไบต์ source ที่ยอมรับแล้ว
- Production readiness อยู่นอกขอบเขตงานนี้ และต้องมี physical qualification พร้อม owner ratification

## การปิดงานที่ 2 — 27 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 2:** `e048ec3fb765ab53ae0f3778dfbe3a3483129711`
**Implementation commit:** `84e9b16141fad33be2921cbfcd4796120ac7260b`
**ขอบเขตถัดไปในอดีตเมื่อปิดงานที่ 2:** ณ เวลานั้นยังไม่ได้เริ่มงานที่ 3
**ขอบเขตปัจจุบัน:** งานที่ 3 COMPLETE แล้ว และยังไม่ได้เริ่มงานที่ 4

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
- งานที่ 3 COMPLETE แล้ว งานที่ 4 เป็นงานถัดไปและยังไม่ได้เริ่ม

## การปิดงานที่ 3 — 27 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 3:** `3a29be5ecb69ecb99dac1d2500b57ace9c9b572a`
**Implementation commit:** `24c83de030013e8fde7d9240de4ea5f116dc1d92`
**ขอบเขตถัดไป:** งานที่ 4 เป็นงานถัดไปและยังไม่ได้เริ่ม

### พาธที่อนุญาตสำหรับงานที่ 3

Implementation commit `24c83de030013e8fde7d9240de4ea5f116dc1d92` เปลี่ยนพาธ exactly สี่รายการต่อไปนี้:

1. `packages/component-master/src/monolith_component_master/evidence.py`
2. `tests/component_master/registry/test_evidence.py`
3. `data/component-master/registry/v1/.gitignore`
4. `data/component-master/registry/v1/evidence-manifest.jsonl`

ไม่มีการเปลี่ยนไฟล์ใน owner root หรือ nested runtime

### Contract ของรากฐาน evidence vault แบบ exact

- Record `SourceSnapshot` และ `FieldAssertion` แบบ immutable มี frozen field shape แบบ exact โดย `SourceSnapshot` บันทึก metadata ของ source และ digest SHA-256 ตัวพิมพ์เล็กแบบ exact ส่วน `FieldAssertion` บันทึก field ของ entity, value, source, locator, reviewer และ literal review state
- `verify_source_hash` คำนวณ SHA-256 จาก bytes-like content ที่รับมาแบบ exact โดยไม่เปลี่ยน caller input
- `EvidenceVault.register` เป็น registration boundary ที่แยกตาม type และ fail closed การ register source ต้องมีไบต์ที่ hash ตรงกันและเก็บ defensive immutable copy ส่วน ID ซ้ำของ source และ assertion ถูกปฏิเสธก่อน mapping replacement
- Assertion สถานะ `VERIFIED` ต้องมี source ที่ register แล้ว, locator และ reviewer ที่ไม่ว่าง และไบต์ source ที่เก็บไว้ยังต้องตรงกับ digest ที่ register ส่วน candidate ที่อ้าง remote source ซึ่งยังไม่ register สามารถ register ได้เฉพาะเมื่อคงสถานะ literal `PENDING` เท่านั้น และไม่มี promotion หรือ deletion API
- การ lookup source และ assertion ให้ผลแน่นอน และคืน `None` เมื่อไม่มี exact ID
- กฎ `/_source-cache/` ที่ anchored จะ ignore เฉพาะ source cache ข้างเคียง ส่วน evidence manifest ที่ tracked ยังมองเห็นได้และมีศูนย์ record ดังนั้นงานที่ 3 ไม่สร้างหลักฐาน OEM ปลอม

### หลักฐาน TDD การตรวจสอบ และ review

| Gate | ผลที่ยอมรับแล้ว |
| --- | --- |
| RED ก่อนมี production code | `python -m unittest tests.component_master.registry.test_evidence -v` จบด้วย exit `1` พร้อม `ModuleNotFoundError` ที่คาดไว้ เพราะยังไม่มี `monolith_component_master.evidence` |
| Targeted evidence GREEN | ผ่าน evidence tests 24/24; `OK` |
| Registry ของงานที่ 2 + legacy seed | ผ่าน 34/34 tests: registry contracts 24 + seed-integrity contracts 10; `OK` |
| Focused verifier contracts | ผ่าน 12/12 tests; `OK` |
| Dynamic full discovery | ผ่าน 318/318 tests: จำนวนเดิมจากงานที่ 2 คือ 294 + Task 3 evidence tests exactly 24; `OK` |
| Verifier ครั้งเดียวจาก clean HEAD | Schema `1.1.0`; ผ่าน 13/13 checks; governed suites exact 20 + 7; dynamic suite 318; Python compile และหลักฐาน Git ผ่าน |
| Review ใหม่ | Spec `ACCEPTED`; Quality `ACCEPTED`; คำตัดสินรวม `ACCEPTED`; ไม่มี finding |

### ความสมบูรณ์ของหลักฐานและ cleanup

- รายงานงานที่ 3 ที่ยอมรับแล้ว: `.superpowers/sdd/task-3-evidence-vault-report.md`; 7,144 ไบต์; SHA-256 `42e45e1d69e8c81bd801b86197cfdd4b0603d7527469670c7f082cd5059ea224`
- Native full-index binary review package ที่ยอมรับแล้ว: `.superpowers/sdd/task-3-evidence-vault-review-package.diff`; 22,541 ไบต์; SHA-256 `15ab2f449c402652ccd36a57c10811d165e8c785ac1bf3cf83e670a0daff2ca2`; ผ่านการตรวจ reverse apply ที่ implementation HEAD
- Verifier summary ที่สร้างจาก clean HEAD ก่อน cleanup: 66,350 ไบต์; SHA-256 `d7c5211f98eb2bd24094eda8f9f65a4c4e897bc8e6292faf203def4448b2dff4`
- ลบ verifier summary ที่ ignored และ cache ที่สร้างทั้งหมดหลังบันทึกหลักฐานแล้ว Implementation worktree จบในสภาพสะอาด

### ขอบเขตอำนาจของงานที่ 3

- งานที่ 3 สร้างเฉพาะรากฐาน evidence vault แบบ in-memory
- งานนี้ไม่ได้เพิ่ม network fetching, filesystem vault service, signature, release authority, ingestion หรือ promotion, หลักฐาน OEM ที่มีข้อมูล, runtime integration หรือ behavior ของงานที่ 4
- งานนี้ไม่ได้สร้าง manufacturing หรือ production authority และ NOT-FOR-PRODUCTION ยังคงไม่เปลี่ยนแปลง
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push หรือ merge
- งานที่ 4 เป็นงานถัดไปและยังไม่ได้เริ่ม

## การปิดงานที่ 4 — 27 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 4:** `3f09a8b40a9bffe64c0bcd2cda5e2c054592d7e1`
**Implementation commit:** `a715943995b308dff5e8d9bb71f260687b2680d5`
**Review-fix commit:** `30403137cef216ce373f8fba76d90ef5f03f3285`
**ขอบเขตปัจจุบัน:** งานที่ 5 เป็นงานถัดไปและยังไม่ได้เริ่ม การปิดงานปัจจุบันนี้แทนที่เฉพาะข้อความขอบเขตเดิมในงานที่ 1–3 ที่บันทึกว่างานที่ 4 เป็นงานถัดไปหรือยังไม่ได้เริ่ม โดยยังรักษาข้อความเหล่านั้นไว้เป็น snapshot ทางประวัติศาสตร์

### ขอบเขต tracked ของงานที่ 4 แบบ exact

ช่วงรวมสอง commit จาก base ของงานที่ 4 เปลี่ยนพาธของงานที่ 4 exactly สี่รายการ:

1. `packages/component-master/src/monolith_component_master/compatibility.py`
2. `tests/component_master/registry/test_compatibility.py`
3. `data/component-master/registry/v1/bom-edges.jsonl`
4. `data/component-master/registry/v1/compatibility-edges.jsonl`

Implementation commit สร้างทั้งสี่พาธ ส่วน review-fix commit เปลี่ยนเฉพาะ `compatibility.py` และ `test_compatibility.py` โดยไฟล์ seed แบบศูนย์ record ทั้งสองไม่เปลี่ยนแปลง ไม่มีการเปลี่ยนไฟล์ใน owner root หรือ nested runtime

### รากฐาน BOM และ compatibility graph แบบ exact

- `EdgeType` มี literal value exactly 13 ค่า ได้แก่ `REQUIRES`, `OPTIONALLY_USES`, `COMPATIBLE_WITH`, `INCOMPATIBLE_WITH`, `REPLACES`, `SUPERSEDES`, `REGION_VARIANT_OF`, `GEOMETRY_VARIANT_OF`, `TOOLED_BY`, `MACHINED_BY`, `INSTALLED_WITH`, `QUALIFIED_WITH` และ `REQUIRES_MATERIAL_CONDITION`
- `BomEdge` แบบ frozen มี exactly `assembly_sku_id`, `component_id`, `edge_type`, `quantity`, `region` และ `evidence_assertion_ids` ส่วน `CompatibilityEdge` แบบ frozen มี exactly `source_id`, `target_id`, `edge_type`, `region` และ `evidence_assertion_ids` และ `GraphIssue` แบบ frozen มี exactly `code`, `entity_id`, `related_id` และ `message`
- `CompatibilityGraph` รับ `Registry` ที่มี type ถูกต้อง, snapshot แบบ immutable ของ iterable สำหรับ BOM edge และ compatibility edge และ registered non-SKU extras แบบ optional ชุด registered entity คือ SKU ID ใน registry รวมกับ canonical extra ใน namespace `tool`, `machine`, `material` และ `qualification` แบบ exact โดย ID ผิดรูปแบบ, type ผิด และ exact edge record ซ้ำจะ fail closed
- การ validate release คืน tuple แบบ immutable ของ structured issue ที่เรียงอย่าง deterministic ตาม code, entity, related entity และ message โดยมี issue code แบบ exact คือ `UNKNOWN_ASSEMBLY`, `ASSEMBLY_REGION_MISMATCH`, `ASSEMBLY_LIFECYCLE_INVALID`, `EMPTY_RELEASE_BOM`, `UNREGISTERED_REQUIRED_TARGET`, `TARGET_REGION_MISMATCH`, `TARGET_LIFECYCLE_INVALID`, `INCOMPATIBLE_BOM_TARGET` และ `COMPATIBILITY_CONTRADICTION` ระบบจึงปฏิเสธ assembly ที่ไม่รู้จัก, region ของ assembly หรือ target ที่ผิด, lifecycle ที่ release ไม่ได้, release BOM ใน exact region ที่ว่าง, required target ที่ไม่ได้ register, incompatibility แบบ explicit ระหว่าง release entity แบบ non-optional ที่มีอยู่จริงทุกคู่ และ contradiction แบบ directed ที่คู่เดียวกันทั้ง compatible และ incompatible
- Target ของ `REQUIRES`, `TOOLED_BY`, `MACHINED_BY`, `INSTALLED_WITH`, `QUALIFIED_WITH` และ `REQUIRES_MATERIAL_CONDITION` ต้องถูก register ส่วน candidate แบบ `OPTIONALLY_USES` จะไม่เติม release BOM ที่ว่าง และจะไม่ block จาก registration, region, lifecycle, incompatibility หรือ contradiction จนกว่าจะมี contract การเลือกแบบ explicit ในอนาคต
- Fixture cam + bolt + cap ใน exact region ที่ครบถ้วนคืนศูนย์ issue Declaration incompatibility แบบ symmetric สร้าง canonical component-pair issue หนึ่งรายการ และตรวจ component pair ได้ทั้งสองทิศทาง
- `REPLACES`, `SUPERSEDES`, `REGION_VARIANT_OF` และ `GEOMETRY_VARIANT_OF` เป็นความสัมพันธ์ด้านหลักฐานเท่านั้น Required target แบบ exact ที่หายไปจะไม่ถูก auto-substitute หรือ auto-resolve และ graph ไม่มี API สำหรับ resolve, substitute, auto-select, mutation, add-edge หรือ remove-edge
- `bom-edges.jsonl` และ `compatibility-edges.jsonl` เป็น tracked JSONL seed ที่ valid และมีศูนย์ record งานที่ 4 ไม่สร้าง BOM หรือ compatibility catalog ที่มีข้อมูลขึ้นมาเอง

### ลำดับ review และ TDD ตามจริง

| ขั้น | คำตัดสิน / ผล | การจัดการ |
| --- | --- | --- |
| TDD รอบแรก | RED: ไม่พบ module `compatibility` ตามที่คาด; GREEN: ผ่าน test เดิมของงานที่ 4 จำนวน 36/36 | สร้าง implementation รอบแรกโดยไม่ได้อ้างว่า review ยอมรับแล้ว |
| Review แรก | `NEEDS_FIXES` | P1: incompatibility ระหว่าง required component pair อาจหลุดผ่าน release validation; P1: optional candidate อาจทำให้ graph ที่ release BOM ว่างดูเหมือนไม่ว่างและ overblock จาก region, lifecycle, incompatibility หรือ contradiction; P2: namespaced ID ยอมรับ segment ว่าง เครื่องหมายที่ไม่รองรับ รูปแบบชิด whitespace และอักขระนอก ASCII |
| RED สำหรับ review fix | รัน focused regression 11 รายการ; ล้มเหลว 10 รายการ | Production code ยังไม่เปลี่ยนตอนรัน RED Control สองรายการยังผ่าน และจำนวน failure ที่รายงานยังเป็น 10 เพราะการตรวจคู่สองทิศทางใช้ subtest ภายใน test method เดียว |
| Review fix แบบน้อยที่สุด | เปลี่ยนเฉพาะ code + test | บังคับ grammar ของ ASCII namespaced ID หนึ่งแบบ; ตัด optional candidate ออกจาก release validation; ตรวจ incompatibility ของ present non-optional entity ทุกคู่ทั้งสองทิศทาง; คงการรายงาน assembly ก่อน, เรียง component pair แบบ lexical และ deduplicate structured issue |
| GREEN สำหรับ review fix | focused regression ผ่าน 11/11; module งานที่ 4 ทั้งหมดผ่าน 46/46 | Fix เพิ่ม regression test ของงานที่ 4 exactly 10 รายการจากเดิม 36 |
| Rereview ใหม่ | Spec `ACCEPTED`; Quality `ACCEPTED`; คำตัดสินรวม `ACCEPTED` | ไม่เหลือ finding |

### Gate สุดท้ายที่ยอมรับแล้ว

รายการต่อไปนี้คือ gate ของ implementation/fix งานที่ 4 ที่ยอมรับและบันทึกในรายงานที่ refresh แล้ว การปิด ledger แบบ docs-only นี้ไม่ได้รัน product test ซ้ำ

| Gate | ผลที่ยอมรับแล้ว |
| --- | --- |
| Compatibility module ของงานที่ 4 ทั้งหมด | ผ่าน 46/46 tests; `OK` |
| Compatibility กับงานที่ 2 + งานที่ 3 + legacy | ผ่าน 58/58 tests: identity-model 24 + evidence-vault 24 + seed-integrity 10; `OK` |
| Focused verifier contracts | ผ่าน 12/12 tests; `OK` |
| Full dynamic discovery | ผ่าน 364/364 tests; `OK` |
| Verifier ครั้งเดียวจาก clean HEAD | Schema `1.1.0`; ผ่าน 13/13 checks; governed suites exact ที่ Component Master 20 + identity-tenancy 7; dynamic suite 364; Python compile, การ parse JSON/JSONL และหลักฐาน Git ที่สะอาดผ่าน |

### ความสมบูรณ์ของหลักฐานและ cleanup

- รายงานงานที่ 4 ที่ refresh แล้ว: `.superpowers/sdd/task-4-bom-graph-report.md`; 10,491 ไบต์; SHA-256 `03dd372d0dd30bf2b9312221be832f98647ec8325511747b1c89ede3bf35b8fa`
- Native full-index binary review package ที่ refresh แล้ว: `.superpowers/sdd/task-4-bom-graph-review-package.diff`; 63,106 ไบต์; SHA-256 `f15d4405e125d16cde47af751e5b06086c05963b9b774bbbe74f6d2cb3463f7b`; มี exactly สี่พาธของงานที่ 4 และตรวจ reverse apply ผ่านที่ review-fix HEAD
- บันทึก verifier summary ที่สร้างแล้วจึงลบออก และลบไดเรกทอรี cache ที่สร้างทั้งหมด Worktree ของ implementation/fix สะอาดที่ `30403137cef216ce373f8fba76d90ef5f03f3285`

### ขอบเขตอำนาจของงานที่ 4

- งานที่ 4 สร้างเฉพาะรากฐาน graph แบบ immutable และ seed ว่างสองไฟล์
- งานนี้ไม่ได้สร้าง BOM ที่มีข้อมูล, automatic substitution, material/thickness qualification, ingestion, release signing, runtime integration หรือ production/manufacturing authority
- NOT-FOR-PRODUCTION ยังทำงานอยู่ Software test ไม่ได้ยืนยัน machine, coupon, first-article, field, security, operational หรือ production readiness
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push, merge, rebase หรือเปลี่ยน branch
- งานที่ 5 เป็นงานถัดไปและยังไม่ได้เริ่ม

## การปิดงานที่ 5 — 27 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 5:** `ea161d00011d369aa48e19d752fb9036a63a1a3b`
**Implementation commit:** `ba033d0f701cac732e7e27c107e1d5806f6d8b69`
**Review-fix commit:** `33c48582ecef65e081c949435d82a660ce16529c`
**ขอบเขตปัจจุบัน:** งานที่ 6 เป็นงานถัดไปและยังไม่ได้เริ่ม การปิดงานปัจจุบันนี้แทนที่เฉพาะข้อความขอบเขตเดิมในงานที่ 4 ที่บันทึกว่างานที่ 5 เป็นงานถัดไปหรือยังไม่ได้เริ่ม โดยยังรักษาข้อความของงานที่ 1–4 ไว้เป็น snapshot ทางประวัติศาสตร์

### ขอบเขต tracked ของงานที่ 5 แบบ exact

ช่วงรวมสอง commit จาก base ของงานที่ 5 เปลี่ยนพาธของงานที่ 5 exactly สี่รายการ:

1. `packages/component-master/src/monolith_component_master/qualification.py`
2. `tests/component_master/registry/test_qualification.py`
3. `data/component-master/registry/v1/materials.jsonl`
4. `data/component-master/registry/v1/qualification-envelopes.jsonl`

Implementation commit สร้างทั้งสี่พาธ ส่วน review-fix commit เปลี่ยนเฉพาะ `qualification.py` และ `test_qualification.py` โดยไฟล์ seed แบบศูนย์ record ทั้งสองไม่เปลี่ยนแปลง ไม่มีการเปลี่ยนไฟล์ใน owner root หรือ nested runtime

### รากฐาน material และ joint qualification แบบ exact

- `Verdict` มีสมาชิก exactly ห้าค่าพร้อม value ตัวพิมพ์ใหญ่ตรงกับชื่อ ได้แก่ `QUALIFIED`, `CONDITIONALLY_QUALIFIED`, `UNQUALIFIED`, `INSUFFICIENT_EVIDENCE` และ `DISCONTINUED_OR_UNORDERABLE` ส่วน `ThicknessEvidenceKind` มีสมาชิก exactly สามค่าพร้อม value ตัวพิมพ์ใหญ่ตรงกับชื่อ ได้แก่ `EXACT_POINT`, `DECLARED_RANGE` และ `APPROVED_INTERPOLATION` โดยไม่มี evidence kind แบบ inferred หรือ nearest-neighbour
- `MaterialInstance` แบบ frozen มี exactly `substrate`, `core`, `density_kg_m3`, `moisture_pct`, `orientation`, `nominal_thickness_mm`, `measured_thickness_mm` และ `facing_thickness_mm`
- `MaterialConstraint` แบบ frozen มี exactly `substrate`, `core`, `density_min_kg_m3`, `density_max_kg_m3`, `moisture_min_pct`, `moisture_max_pct`, `orientation`, `nominal_thickness_min_mm`, `nominal_thickness_max_mm`, `measured_thickness_min_mm`, `measured_thickness_max_mm`, `facing_thickness_min_mm`, `facing_thickness_max_mm` และ `thickness_evidence_kind`
- `JointConfiguration` แบบ frozen มี exactly `connector_sku_id`, `panel_a` และ `panel_b` ส่วน `QualificationEnvelope` แบบ frozen มี exactly `envelope_id`, `connector_sku_id`, `panel_a`, `panel_b`, `verdict` และ `evidence_assertion_ids` และ `QualificationResult` แบบ frozen มี exactly `verdict`, `envelope_id` และ `reason_codes`
- Panel A และ Panel B เป็นอิสระต่อกันและไม่ถูกสลับ แต่ละด้านต้องตรงกับ constraint ของตนเองสำหรับ substrate, core, density, moisture, orientation, nominal thickness, measured thickness และ facing thickness ภายใน envelope เดียวกัน
- `EXACT_POINT` กำหนดให้ขอบเขต nominal และ measured ยุบเป็นจุดเดียว `DECLARED_RANGE` อนุมัติเฉพาะภายในขอบเขต inclusive ที่ประกาศอย่าง explicit ส่วน `APPROVED_INTERPOLATION` อนุมัติเฉพาะภายในช่วงที่มีหลักฐาน explicit และทุก envelope ต้องมี canonical evidence ID ที่ขึ้นต้นด้วย `assertion:` อย่างน้อยหนึ่งรายการ หลักฐาน exact แยกกันที่ 15 มม. และ 18 มม. ไม่อนุมัติ 16 มม. ระบบไม่มี extrapolation, nearest substitute, การสลับ panel หรือการใช้ nominal แทน measured
- เมื่อไม่ match ระบบคืน `INSUFFICIENT_EVIDENCE` พร้อม `NO_EXACT_CONFIGURATION_EVIDENCE` ส่วนการ match หลายรายการทุกแบบ รวมถึง qualified หนึ่งรายการร่วมกับ record ที่ขัดแย้ง และการ match record เดียวที่ไม่ qualified จะ fail closed เป็น `UNQUALIFIED` พร้อม `AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE` มีเพียงการ match qualified exactly หนึ่งรายการเท่านั้นที่คืน exact envelope ID
- `materials.jsonl` และ `qualification-envelopes.jsonl` เป็น tracked JSONL seed ที่ valid และมีศูนย์ record งานที่ 5 ไม่สร้างหลักฐาน material หรือ qualification ขึ้นมาเอง

### ลำดับ review และ TDD ตามจริง

| ขั้น | คำตัดสิน / ผล | การจัดการ |
| --- | --- | --- |
| TDD รอบแรก | RED: ไม่พบ module `qualification` ตามที่คาด; GREEN: ผ่าน test เดิมของงานที่ 5 จำนวน 48/48 | สร้าง implementation รอบแรกโดยไม่ได้อ้างว่า review ยอมรับแล้ว |
| Review แรก | `NEEDS_FIXES` | P1: `MaterialConstraint` ยอมรับ `moisture_max_pct > 100` และ P1: สามารถสร้าง public `QualificationResult` ที่ขัดแย้งกันได้ เพราะ verdict, envelope และ reasons ไม่มี cross-field invariant |
| RED สำหรับ review fix | รัน focused regression methods 3 รายการ; subtests ล้มเหลว 12 รายการ | Production code ยังไม่เปลี่ยนตอนรัน RED ส่วน control ของ boundary และ result shape ที่ valid ผ่าน |
| Review fix แบบน้อยที่สุด | เปลี่ยนเฉพาะ `qualification.py` + test | บังคับ `moisture_max_pct <= 100`; กำหนดให้ `QUALIFIED` มี envelope และ reasons ว่างแบบ exact; กำหนดให้ `CONDITIONALLY_QUALIFIED` มี envelope และ nonblank reason อย่างน้อยหนึ่งรายการ; กำหนดให้ refusal verdict ทั้งสามไม่มี envelope และมี nonblank reason อย่างน้อยหนึ่งรายการ; ทำ defensive snapshot ของ reasons ก่อน validate |
| GREEN สำหรับ review fix | Focused regressions ผ่าน 3/3; module งานที่ 5 ทั้งหมดผ่าน 51/51 | Fix เพิ่ม regression methods ของงานที่ 5 exactly สามรายการจากเดิม 48 |
| Rereview ใหม่ | Spec `ACCEPTED`; Quality `ACCEPTED`; คำตัดสินรวม `ACCEPTED` | ไม่เหลือ finding |

### Gate สุดท้ายที่ยอมรับแล้ว

รายการต่อไปนี้คือ gate ของ implementation/fix งานที่ 5 ที่ยอมรับและบันทึกในรายงานที่ refresh แล้ว การปิด ledger แบบ docs-only นี้ไม่ได้รัน product test ซ้ำ

| Gate | ผลที่ยอมรับแล้ว |
| --- | --- |
| Qualification module ของงานที่ 5 ทั้งหมด | ผ่าน 51/51 tests; `OK` |
| Regression cohort ของงานที่ 2 + งานที่ 3 + งานที่ 4 + legacy | ผ่าน 104/104 tests; `OK` |
| Focused verifier contracts | ผ่าน 12/12 tests; `OK` |
| Full dynamic discovery | ผ่าน 415/415 tests; `OK` |
| Verifier ครั้งเดียวจาก clean HEAD | Schema `1.1.0`; ผ่าน 13/13 checks; governed suites exact ที่ Component Master 20 + identity-tenancy 7; dynamic suite 415; Python compile, การ parse JSON/JSONL และหลักฐาน Git ที่สะอาดผ่าน |

### ความสมบูรณ์ของหลักฐานและ cleanup

- รายงานงานที่ 5 ที่ refresh แล้ว: `.superpowers/sdd/task-5-qualification-report.md`; 12,269 ไบต์; SHA-256 `d819894ef49ad1ad3cc2d7a99a6a7948b22383e914b4f98ad9aa48d3ccb17ac5`
- Native full-index binary review package ที่ refresh แล้ว: `.superpowers/sdd/task-5-qualification-review-package.diff`; 59,874 ไบต์; SHA-256 `84ff64c4267b236865cb2c755edfcc00a5a6842054b7b0af8fbcc3114f7eed3d`; มี exactly สี่พาธของงานที่ 5 และตรวจ reverse apply ผ่านที่ review-fix HEAD
- บันทึก verifier summary ที่สร้างแล้วจึงลบออก และลบไดเรกทอรี `__pycache__` ที่สร้าง exactly แปดรายการ Worktree ของ implementation/fix สะอาดที่ `33c48582ecef65e081c949435d82a660ce16529c`

### ขอบเขตอำนาจของงานที่ 5

- งานที่ 5 สร้างเฉพาะ joint matching แบบ immutable ที่ผูกกับหลักฐาน และ seed ว่างสองไฟล์
- งานนี้ไม่ได้เพิ่มการประเมินตู้แบบ W × D × H, connector count หรือ spacing, structural extrapolation, lifecycle resolution, การ mutate BOM, ingestion, release authority, runtime integration หรือ production/manufacturing authority
- NOT-FOR-PRODUCTION ยังทำงานอยู่ Software test ไม่ได้ยืนยัน machine, coupon, first-article, field, security, operational หรือ production readiness
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push หรือ merge
- งานที่ 6 เป็นงานถัดไปและยังไม่ได้เริ่ม

## การปิดงานที่ 6 — 27 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 6:** `12af68acf9aa0add75cd329480911d14a85fe3b1`
**Implementation commit:** `1a4971a59622517577dc2a6f8760165395f91f77` — `feat(registry): evaluate parametric cabinet configurations`
**Review-fix commit แรก:** `e6680415c68d0944d7cc6d2c90e32d2bb26f13d1` — `fix(registry): close parametric qualification gaps`
**Review-fix commit ที่สองและ accepted HEAD:** `6663cc9901b961defdb0b781228f701591b97df5` — `fix(registry): normalize conditional reason ordering`
**ขอบเขตปัจจุบัน:** งานที่ 7 เป็นงานถัดไปและยังไม่ได้เริ่ม การปิดงานนี้แทนที่เฉพาะข้อความขอบเขตปัจจุบันของงานที่ 5 ที่บันทึกว่างานที่ 6 เป็นงานถัดไปหรือยังไม่ได้เริ่ม โดยยังรักษาข้อความงานที่ 1–5 ก่อนหน้านี้ทั้งหมดไว้เป็น snapshot ทางประวัติศาสตร์

### ขอบเขต tracked ของงานที่ 6 แบบ exact

ช่วงรวมสาม commit จาก base ของงานที่ 6 เปลี่ยน exactly สองพาธ:

| สถานะ | พาธ | เพิ่มบรรทัด | ลบบรรทัด |
| --- | --- | ---: | ---: |
| แก้ไข | `packages/component-master/src/monolith_component_master/qualification.py` | 842 | 0 |
| เพิ่ม | `tests/component_master/registry/test_parametric_cabinets.py` | 1,743 | 0 |

ไม่มีการเปลี่ยนพาธใน owner governance root, nested product runtime, seed data, verifier, export หรือพาธผลิตภัณฑ์อื่น และไม่ได้ push, merge, rebase หรือเปลี่ยน branch

### Interface แบบ immutable และ contract ของ configuration แบบ exact

- `SpacingAxis` มี exactly `WIDTH`, `DEPTH` และ `HEIGHT` พร้อม value ตัวพิมพ์ใหญ่ตรงกับชื่อ
- `CabinetConfiguration` แบบ frozen มี exactly `width_mm`, `depth_mm`, `height_mm`, `topology`, `joints`, `load_cases`, `mounting` และ `wall_substrate`
- `CabinetPolicy` แบบ frozen ที่ผูกกับหลักฐานมี exactly `policy_id`, `connector_sku_id`, `topology`, ขอบเขตต่ำสุดและสูงสุดแบบ inclusive ของ width, depth และ height, `spacing_axis`, `max_spacing_mm`, `min_connector_count`, `max_connector_count`, `required_machine_capabilities`, `reinforcement_requirement`, `anchor_requirement` และ `evidence_assertion_ids`
- `ConnectorPlacement` แบบ frozen มี exactly `joint_index`, `connector_sku_id`, `policy_id`, `connector_count` และ `spacing_mm` ส่วน `CabinetEvaluation` แบบ frozen มี exactly `verdict`, `policy_ids`, `placements`, `reinforcement_requirements`, `anchor_requirements`, `reason_codes` และ `evidence_assertion_ids`
- `evaluate_cabinet` ยังคงรับ positional argument สามตัวคือ `cabinet`, `registry` และ `machine_capabilities` ส่วน `qualification_envelopes=()` และ `policies=()` เป็น input แบบ keyword-only ที่ explicit การเรียกแบบเดิมด้วยสาม argument ยัง valid และ fail closed เพราะไม่มีหลักฐานและ policy
- มิติของ configuration ยอมรับค่า W × D × H ที่เป็นบวกและ finite ได้โดยอิสระ รวมถึงค่าทศนิยม Topology ต้องเป็น exactly หนึ่งค่าใน `base`, `wall`, `tall`, `wardrobe` หรือ `custom` ส่วน joints และ load cases ต้องไม่ว่าง มี type ถูกต้อง และถูกทำ defensive snapshot เป็น tuple แบบ immutable
- Mounting ต้องเป็น exactly `FLOOR`, `WALL` หรือ `MOBILE` โดย `WALL` ต้องมี wall substrate ที่ไม่ว่าง ส่วน `FLOOR` และ `MOBILE` ต้องมี `wall_substrate=None` ทั้ง ID และ machine capability ใช้ contract ของ canonical identifier แบบ strict

### Semantics การประเมินที่ผูกกับหลักฐานแบบ exact

- Connector ทุกตัวถูก resolve ด้วย SKU และ model แบบ exact โดย `VerificationDimension.LIFECYCLE` ของ SKU อนุญาตเฉพาะ `VERIFIED` หรือ `REGION_ONLY`; `PENDING` คืนหลักฐานไม่เพียงพอ ส่วน `DISCONTINUED` หรือ `BLOCKED` ถือว่าไม่พร้อมใช้ Lifecycle ของ model อนุญาตเฉพาะ `ACTIVE` หรือ `REGION_ONLY`; สถานะอื่นทั้งหมดถือว่าไม่พร้อมใช้
- ทุก joint ต้องผ่าน qualification กับ envelope ของงานที่ 5 ที่ส่งมาอย่าง explicit ก่อนเลือก policy จากนั้นแต่ละ joint ต้องมี policy แบบ explicit ที่ไม่กำกวม exactly หนึ่งรายการ ซึ่งตรงกับ connector SKU, topology และขอบเขต W × D × H แบบ inclusive ของตน หลักฐานหรือ policy ที่หายไปจะ fail closed และ policy ที่ซ้อนกันถือว่ากำกวม
- Required machine capability ต้อง match แบบ exact ไม่มีแหล่งกฎจาก global, built-in, การเดา, inference, nearest match หรือการสร้างขึ้นเอง ไม่มีการแทน exact SKU และไม่มี manufacturing output บางส่วนเมื่อระบบปฏิเสธ
- สำหรับ axis ที่เลือก `connector_count = max(min_connector_count, ceil(axis_length / max_spacing_mm) + 1)` ค่า float ที่ยอมรับใช้การสะกดทศนิยมสั้นที่สุดแบบ canonical เป็นขอบเขตที่กำกับและคำนวณด้วย checked integer-ratio ดังนั้นขอบเขตทศนิยม `0.918 / 0.102` เท่ากับเก้า exactly ขณะที่ float ที่มากกว่าทันทีมีค่ามากกว่าเก้า และอัตราส่วน finite ขนาดสุดขั้วไม่ overflow
- ระบบสร้าง placement แบบ concrete เฉพาะเมื่อ spacing เป็นบวกและ finite โดยคำนวณเป็น `axis_length / (connector_count - 1)` หากผลจาก input ที่เป็นบวกและ finite ไม่สามารถแทนค่าได้ ระบบปฏิเสธด้วย `PARAMETRIC_ARITHMETIC_UNREPRESENTABLE` โดยไม่มี authorization
- Count ที่มากกว่า `max_connector_count` จะถูกปฏิเสธ เว้นแต่ policy exact ที่ผูกกับหลักฐานนั้นมีข้อกำหนด reinforcement หรือ anchor ในกรณี conditional ที่อนุญาตนี้ placement จะยังไม่ resolve โดยทั้ง `connector_count=None` และ `spacing_mm=None`; ระบบไม่เดาค่า machining
- ข้อกำหนด reinforcement หรือ anchor ที่ถูกเลือกทำให้ evaluation ยังคงเป็น `CONDITIONALLY_QUALIFIED` แม้ count อยู่ในขอบเขต หมวด reason แบบ conditional เป็น exact และ canonical: reinforcement ให้ `REINFORCEMENT_REQUIRED`, anchor ให้ `ANCHOR_REQUIRED` และเมื่อมีทั้งคู่ต้องเป็น tuple สอง code ตามลำดับหมวดนี้โดยไม่ขึ้นกับลำดับ joint
- ตู้ tall ไม่ได้รับ anchor หรือ reinforcement อัตโนมัติ การปฏิเสธทุกกรณีคืน reasons แต่ไม่มี policy ID, placement, reinforcement requirement, anchor requirement หรือ evidence ID

### ลำดับ TDD และ independent review ตามจริง

| ขั้น | คำตัดสิน / ผล | การจัดการ |
| --- | --- | --- |
| RED เริ่มต้น | ได้ `ImportError` ตามที่คาดเพราะยังไม่มี `evaluate_cabinet` | `qualification.py` ยังไม่เปลี่ยนที่ RED checkpoint |
| GREEN ของ implementation เริ่มต้น | งานที่ 6 + งานที่ 5 ผ่าน 88/88: 37 + 51; full discovery ผ่าน 452 tests | Implementation ยังไม่ได้รับการยอมรับ |
| Independent review แรก | `NEEDS_FIXES` | P1: ไม่ได้ตรวจ SKU lifecycle; P1: arithmetic จาก raw float จัดการขอบเขต `0.918 / 0.102` และค่า finite สุดขั้ว `1e308 / 1e-308` ผิด; P2: สามารถสร้างสถานะ reason/requirement แบบ conditional ที่ขัดแย้งกันได้ |
| RED ของ review fix แรก | Lifecycle: ล้มเหลว 1/1; arithmetic: 4 methods ล้มเหลวและเปิดเผยขอบเขตทศนิยม, overflow สองกรณี และ spacing ที่กลายเป็นศูนย์จาก subnormal; conditional shape: 1 method มี subtests ล้มเหลว 6 รายการ | Production code ยังไม่เปลี่ยนใน RED reproduction แต่ละรอบ |
| GREEN ของ review fix แรก | งานที่ 6 + งานที่ 5 ผ่าน 94/94: 43 + 51; regressions 104/104; verifier contracts 12/12; full discovery 458/458; clean-HEAD verifier 13/13 | ปิด finding จาก review แรกโดยยังไม่อ้างการยอมรับสุดท้าย |
| Independent re-review | `NEEDS_FIXES` | P2: ตู้หลาย joint ที่เรียง anchor ก่อน reinforcement สร้างลำดับ reason ที่ไม่ canonical และ crash ทั้งกรณี placement แบบ concrete และแบบ unresolved |
| RED และ GREEN ของ review fix ที่สอง | RED: ล้มเหลว 2/2; GREEN: ผ่าน 2/2 | สร้าง reason ตามหมวดแบบ canonical หลัง aggregate requirement ทั้งหมด โดยไม่ขึ้นกับลำดับ joint |
| Gate สุดท้ายของ implementation | งานที่ 6 + งานที่ 5 ผ่าน 96/96: 45 + 51; regressions 104/104; verifier contracts 12/12; full discovery 460/460 | Clean-HEAD verifier รายงาน schema `1.1.0`, PASS 13/13, dynamic 460 และ governed cohorts exact ที่ 20 + 7 |
| Independent rereview สุดท้าย | `ACCEPTED` — ไม่มี finding | Focused reproduction แปดรายการผ่าน, diff-check ผ่าน และการตรวจ exact scope กับ clean tree ผ่าน |

### ความสมบูรณ์และ cleanup ของหลักฐานที่ยอมรับแล้ว

รายการต่อไปนี้คือผลของ implementation/fix ที่ยอมรับและบันทึกในหลักฐานงานที่ 6 การปิด ledger แบบ docs-only นี้ไม่ได้รัน product test ซ้ำ

- รายงานที่ยอมรับแล้ว: `.superpowers/sdd/task-6-parametric-report.md`; 12,859 ไบต์; SHA-256 `c11933ad60f634571b72edea67ca271a4524069eab47adbc177e9545aea0d747`
- Native full-index binary review package ที่ยอมรับแล้ว: `.superpowers/sdd/task-6-parametric-review-package.diff`; 91,796 ไบต์; SHA-256 `d16757f5843b572a9e7ebb75aa6d975cc35f25b127022586a72583e0ca17de0e`; มี exactly สองพาธของงานที่ 6 และ reverse apply ผ่านที่ accepted HEAD
- Clean-HEAD verifier summary ที่ยอมรับแล้วก่อนลบ: 94,668 ไบต์; SHA-256 `731108a34fdb2e42e98e93fc4b10cb9701299be3add1fc548f3afa3a0b4ac30c`
- Verifier summary ถูกลบหลังบันทึกหลักฐาน Cleanup ที่ยอมรับแล้วเหลือ cache directory ศูนย์รายการและไฟล์ `.pyc` ศูนย์รายการ และ implementation worktree ที่ยอมรับแล้วสะอาดที่ `6663cc9901b961defdb0b781228f701591b97df5`

### ขอบเขตอำนาจของงานที่ 6

- งานที่ 6 สร้างเฉพาะการเลือกกฎ parametric ที่ผูกกับหลักฐาน รวมถึง connector count และ spacing
- งานนี้ไม่ใช่ full racking, overturning, center-of-gravity, FEA, การ qualify ทางกายภาพ/coupon/machine/first-article/field, policy หรือหลักฐานทั่วโลกที่มีข้อมูลแล้ว, ingestion, release authority, runtime integration, freeze/export authority หรือ production readiness
- NOT-FOR-PRODUCTION ยังคงทำงานอยู่ หลักฐาน software ไม่ได้ให้อำนาจด้าน manufacturing, installation, operational หรือ production
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push, merge, rebase หรือเปลี่ยน branch
- งานที่ 7 เป็นงานถัดไปและยังไม่ได้เริ่ม

## การปิดงานที่ 7 — 30 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 7:** `addadab0093e3de05c3af31c01248fd2da596ff1`
**Implementation commit:** `1be54922f04709fffd3f629318f043750d806330` — `feat(registry): quarantine unreviewed connector evidence`
**Fix wave 1:** `dec823a66c877318b8ca9482513d67545e5d4cac` — `fix(registry): fail closed on non-primitive values and marker gating`
**Fix wave 3:** `798164f7d689551f99315c8b4bfaef099d1290b0` — `fix(registry): rebuild stored records from exact library types`
**Fix wave 4 (สั่งโดยเจ้าของระบบ):** `33b252cc180b2001faebf42d44089b526258a17b` — `feat(registry): quarantine contradicting sources, never promote silently`
**Fix wave 5:** `8c90d52eb6b07348b77d056714dab507bd63ca9d` — `fix(registry): close mating-part contradictions and exact inch conversion`
**Fix wave 6 และ accepted HEAD:** `db48529201f25e4d4afe8d1816b12748524f8f32` — `fix(registry): quarantine contradicting mating-part markers`
**ขอบเขตปัจจุบัน:** งานที่ 8 เป็นงานถัดไป ยังไม่ได้เริ่ม และยังไม่มี brief การปิดงานนี้แทนที่เฉพาะข้อความขอบเขตปัจจุบันของงานที่ 6 ที่บันทึกว่างานที่ 7 เป็นงานถัดไปหรือยังไม่ได้เริ่ม โดยยังรักษาข้อความงานที่ 1–6 ก่อนหน้านี้ทั้งหมดไว้เป็น snapshot ทางประวัติศาสตร์

### ขอบเขต tracked ของงานที่ 7 แบบ exact

ช่วงรวมหก commit จาก base ของงานที่ 7 เปลี่ยน exactly ห้าพาธที่ brief อนุมัติไว้และไม่มีพาธอื่น คำสั่ง `git diff --name-only addadab0..db485292` คืนค่า exactly ห้ารายการนี้:

| สถานะ | พาธ | เพิ่มบรรทัด | ลบบรรทัด |
| --- | --- | ---: | ---: |
| เพิ่ม | `packages/component-master/src/monolith_component_master/ingestion.py` | 349 | 0 |
| เพิ่ม | `packages/component-master/src/monolith_component_master/adapters/__init__.py` | 17 | 0 |
| เพิ่ม | `packages/component-master/src/monolith_component_master/adapters/reviewed_assertions.py` | 476 | 0 |
| เพิ่ม | `tools/connector_registry/ingest_reviewed.py` | 280 | 0 |
| เพิ่ม | `tests/component_master/registry/test_ingestion.py` | 2,593 | 0 |

รวมเพิ่ม 3,715 บรรทัดและลบศูนย์บรรทัด ไม่มีการเปลี่ยนพาธใน owner governance root, nested product runtime, seed data, verifier, export หรือพาธผลิตภัณฑ์อื่น และไม่ได้ push, merge, rebase หรือเปลี่ยน branch

### Contract ของ ingestion และ quarantine แบบ exact

- Record ทั้งสามตามแผนคงรูปฟิลด์แบบ exact `CandidateRecord` แบบ frozen มี `candidate_id`, `brand_id`, `entity_kind`, `assertions`, `extraction_method` `QuarantineRecord` แบบ frozen มี `candidate_id`, `reason_code`, `evidence_ids`, `owner_role` `IngestionResult` แบบ frozen มี `promoted` และ `quarantined` ซึ่งไม่สามารถเกิดร่วมกันได้และอธิบาย candidate เพียงหนึ่งรายการ
- `ReviewedAssertionAdapter.ingest(candidate)` คืนผลลัพธ์ immutable หนึ่งรายการ และไม่เคยแก้ candidate, assertion, review state, registry, release หรือไฟล์ candidate จะ promote ได้เฉพาะเมื่อผ่านการตรวจทุกข้อ
- ชุดชนิดค่าของ assertion ที่ยอมรับคือ exactly ชนิดที่ contract JSON/JSONL ตามเอกสารแสดงได้: `None`, `bool`, `int`, `float` ที่มีค่าจำกัด, `str`, object ที่มี key เป็น `str` แบบ exact และ array ส่วน container จะถูกสร้างใหม่เป็นรูป immutable และ scalar ยอมรับตามชนิด exact เท่านั้น ค่าประเภท `Decimal`, `bytes`, `bytearray`, `memoryview`, `complex`, set, float ที่ไม่มีค่าจำกัด, key ของ mapping ที่ไม่ใช่ `str` และ subclass ของ `int`/`float`/`str` ทุกชนิด ถูกปฏิเสธที่ขั้นสร้างวัตถุ
- ค่าถูก snapshot ก่อน validate ดังนั้นทุกกฎตรวจค่าเดียวกับที่ record เก็บจริง ฟิลด์ข้อความต้องเป็น `str` แบบ exact และ `CandidateRecord`, `QuarantineRecord`, `SourceContext` ต้องเป็นชนิดตรงตัวและถูกสร้างใหม่ ดังนั้น subclass ของผู้เรียกไม่สามารถสลับสถานะหลังการตรวจได้
- Collection ที่ไม่มีลำดับถูกปฏิเสธทุกจุดที่ลำดับ record ที่เก็บไว้ปรากฏใน output ส่วน input ที่มีลำดับจะคงลำดับเดิมแบบ exact
- ความขัดแย้งถูกตรวจเฉพาะบน convention ที่ทำเอกสารไว้แล้ว: prefix `dimensions.` และ `geometry.`, prefix `identity.` และฟิลด์ marker `compatibility.` ทั้งสองรายการ พาธฟิลด์อื่นทั้งหมดตั้งใจไม่เปรียบเทียบ เพราะ brief ห้ามเดาความขัดแย้งจาก free text
- การเปรียบเทียบเชิงมิติใช้ arithmetic แบบ rational ที่ exact ค่าขนาดเป็น `Fraction` และตัวคูณนิ้วคือ `Fraction(127, 5)` ซึ่งเท่ากับ 25.4 พอดี ไม่มี tolerance ที่จุดใดเลย
- Reason code ทั้งสิบสองรายการ map ไปยัง owner role แบบ deterministic โดย `_REASON_ORDER` และ `_QUARANTINE_OWNER_BY_REASON` เป็นเซตเท่ากันและไม่มีรายการซ้ำ และเหตุผลที่เกิดพร้อมกันจะออกเป็น record ที่ dedup แล้วหนึ่งรายการต่อเหตุผลตามลำดับคงที่
- CLI ตรวจ `--brand` ว่าเป็น canonical ID ในตัวเอง เขียน promoted JSONL และ quarantine JSONL แยกกัน และไม่มีการเข้าถึงเครือข่าย, แก้ review state, เขียน registry, แก้ release หรือให้อำนาจ manufacturing

### ที่มาของแต่ละ wave — งานไหนมาจากไหน

ความแตกต่างข้อนี้สำคัญกว่าตัวเลข และมีสองแกนที่ต้องไม่ยุบรวมกัน แกนแรกคือ **สิ่งที่ทำให้งานปรากฏขึ้น**: wave 1, 3, 5 และ 6 ปรากฏจาก finding ของ independent review และ wave 7 ปรากฏจาก review ความถูกต้องของรายงาน แกนที่สองคือ **อำนาจในการตัดสิน**: wave 4 มาจากคำสั่งเจ้าของระบบโดยตรง และ wave 6 แม้จะปรากฏจาก review แต่ตัดสินภายใต้คำตัดสินที่มีอยู่ของเจ้าของระบบ ไม่ใช่ตัดสินโดยผู้ตรวจ ดังนั้นสอง wave มาจากเจ้าของระบบ และสาม wave ตัดสินโดย review คอลัมน์ที่มาด้านล่างบันทึกอำนาจในการตัดสิน เพราะนั่นคือคุณค่าเชิง governance ของ ledger นี้ เครดิตของงานที่เจ้าของระบบสั่งต้องไม่ถูกกลืนไปเป็นของ review

| Wave | Commit | ที่มา | สิ่งที่ปิด |
| --- | --- | --- | --- |
| 1 | `dec823a6` | Review P1/P2 | ค่าถูกเก็บแบบอ้างอิง ซึ่งยกระดับเป็นการลอด promotion: ค่าที่ `str()` โกหกทำให้ข้ออ้าง 999 นิ้ว promote พร้อมข้ออ้าง 25.4 มม. โดยไม่เกิด `UNIT_CONFLICT` และกฎ mating part ผูกกับ literal `entity_kind` ที่ hardcode ไว้ค่าเดียว ทำให้การสะกดแบบอื่นทั้งหมด promote เงียบ ๆ |
| 3 | `798164f7` | Review P2/P3 | วินัยชนิด exact ปิดที่ระดับใบแต่เปิดที่ระดับ record: `ingest()` และ `IngestionResult` ตรวจ record ด้วย `isinstance` เท่านั้น ทำให้ subclass สลับสถานะหลังการตรวจได้ และมี regression ของ enum ที่ wave 1 ทำให้เกิดบน public surface ของงานนี้เอง |
| 4 | `33b252cc` | **สั่งโดยเจ้าของระบบ — ไม่ใช่ finding จาก review** | เป็นการเพิ่มขอบเขตด้วยอำนาจเจ้าของระบบ เหนือรายการความขัดแย้งแบบปิดของ brief เจ้าของระบบตัดสินว่าสองแหล่งที่ขัดแย้งกันต้องไม่ promote เงียบ ๆ ปิดกรณีความขัดแย้งเชิงมิติในหน่วยเดียวกัน, PDF เทียบ CAD ใต้ `dimensions.*` และความไม่ตรงกันของ identity ระหว่างสองแหล่งใด ๆ |
| 5 | `8c90d52e` | Review P2/P3 | ความขัดแย้งของรหัส mating part ยัง promote candidate ที่ถือชิ้นส่วนสองชิ้นที่ใช้ร่วมกันไม่ได้ และคำกล่าว "exact decimal equality ไม่มี tolerance" เป็นเท็จเหนือ 10^28 นิ้ว เพราะการแปลงหน่วยปัดเศษภายใต้ decimal context ปริยายที่ 28 หลักนัยสำคัญ |
| 6 | `db485292` | คำสั่งเจ้าของระบบ ซึ่ง orchestrator วินิจฉัยว่าครอบคลุมอยู่แล้ว | สองแหล่งที่ไม่ตรงกันเรื่อง `compatibility.requires_mating_part` promote record ที่ขัดแย้งในตัวเอง บันทึกเป็นการครอบคลุมของคำตัดสินเจ้าของระบบที่มีอยู่ ไม่ใช่ดุลพินิจใหม่ของผู้พัฒนา เพราะคำตัดสินนั้นพูดถึงความขัดแย้ง ไม่ใช่พูดถึงว่าฟิลด์ไหนเป็นตัวถือ |
| 7 | ไม่มี | แก้ความถูกต้องของรายงานเท่านั้น | ไม่มีการเปลี่ยน source แก้ข้อความรายงานที่ค้างเก่าหรือขัดแย้งกันเองสามรายการ |

ข้อจำกัดที่เจ้าของระบบกำหนดกับ wave 4 ถูกรักษาไว้อย่างชัดเจน: ใช้ความเท่ากันแบบ exact decimal โดยไม่คิด tolerance ขึ้นเอง เพราะ threshold ใด ๆ จะเป็นตัวเลขวิศวกรรมที่ไม่มีแหล่งอ้างอิง ผลที่ยอมรับแล้วคือค่าคลาดจาก float จะเข้า quarantine — `0.3` เทียบ `0.30000000000000004` เป็นความขัดแย้ง และข้อมูลแคตตาล็อกสองหน่วยจะเข้า quarantine บ่อยกว่าเดิม เพราะ `mm` และ `in` ตรงกันแบบ exact เฉพาะเมื่อค่ามิลลิเมตรเป็นพหุคูณของ 25.4 พอดี

### ลำดับ TDD และ independent review ตามจริง

| ขั้น | คำตัดสิน / ผล | การจัดการ |
| --- | --- | --- |
| RED เริ่มต้น | ได้ `ModuleNotFoundError` ตามที่คาดเพราะยังไม่มี `monolith_component_master.adapters` | พาธ production ทั้งสี่รายการยังไม่มีอยู่ที่ RED checkpoint |
| GREEN ของ implementation | Module ของงานที่ 7 ผ่าน 43/43 | Commit เป็น `1be54922` และยังไม่ได้รับการยอมรับ |
| Independent review แรก | `NEEDS_FIXES` | P1 การลอด promotion จากค่าที่เก็บแบบอ้างอิง; P2 gate `entity_kind` ที่ hardcode; รวมถึงการรัดกุม `--brand` และ collection ที่ไม่มีลำดับ |
| RED และ GREEN ของ wave 1 | RED: ล้มเหลว 45 รายการใน 11 methods; GREEN: 61/61 | ผู้พัฒนาปิดข้อบกพร่องประเภทเดียวกันบนฟิลด์ข้อความโดยไม่ถูกสั่ง และผู้ตรวจยืนยันภายหลังว่าการขยายนั้นอยู่ในขอบเขต |
| Independent review ที่สอง | `NEEDS_FIXES` | P2 การสลับ record ผ่าน `__getattribute__`; P3 regression ของ enum บน public surface |
| RED และ GREEN ของ wave 3 | RED: ล้มเหลว 5 รายการและ error 2 รายการใน 7 methods; GREEN: 68/68 | Record ต้องเป็นชนิดตรงตัวและถูกสร้างใหม่ |
| คำตัดสินเจ้าของระบบ | เป็นการเพิ่มขอบเขต ไม่ใช่ finding จาก review | Wave 4 ทำตามคำตัดสิน census แสดงว่า promoted ลดจาก 21 เป็น 14 จาก 30 family ซึ่งเท่ากับความขัดแย้งเงียบเจ็ดรายการพอดี |
| Independent review ที่สาม | `NEEDS_FIXES` | P2 ความขัดแย้งของรหัส mating part; P3 การแปลงนิ้วที่ไม่ exact ซึ่งขัดกับคำกล่าวในรายงานเอง |
| RED และ GREEN ของ wave 5 | RED: ล้มเหลว 2 รายการและ error 2 รายการ; GREEN: 87/87 | แก้ที่กลไก ไม่ได้ลดทอนคำกล่าว |
| Independent review ที่สี่ | `NEEDS_FIXES` | 6A ความขัดแย้งของ marker; 6B ตาราง provenance ที่ถือ byte count ของ wave ก่อนหน้า; 6C ข้อความรายงานที่เป็นเท็จสองรายการ |
| RED และ GREEN ของ wave 6 | RED: ล้มเหลว 3 รายการ; GREEN: 91/91 | Provenance สร้างจาก `git cat-file` พร้อมการอ่านกลับอัตโนมัติ ไม่ใช่พิมพ์ซ้ำ |
| Independent review ที่ห้า | `NEEDS_FIXES` — เฉพาะรายงาน | ตัวเลขค้างเก่าสองรายการ ผู้พัฒนาพบและแก้รายการที่สามซึ่งผู้ตรวจไม่ได้ชี้ |
| Wave 7 | แก้ความถูกต้องของรายงานเท่านั้น ไม่เปลี่ยน source | พาธที่อนุมัติทั้งห้ารายการมี hash ตรงกับ blob ที่ `db485292` |
| Independent review สุดท้าย | `ACCEPTED` — ไม่มี finding | ตรวจสดแล้ว: 91 / 281 / 12 / 551, verifier 13/13, ทุกแถว provenance เทียบ `git cat-file`, package ทั้งสองตรงกันระดับไบต์และ reverse apply ผ่าน และ census 52 family ให้ `quarantine → promote = 0` |

### การตรวจสอบที่รันใหม่ในการปิด ledger ครั้งนี้

ต่างจากการปิดงานที่ 4–6 ซึ่งบันทึกตัวเลขที่ยอมรับแล้วและระบุว่าการปิดแบบ docs-only ไม่ได้รันเทสต์ผลิตภัณฑ์ใหม่ ทุกตัวเลขด้านล่างถูกรันใหม่ระหว่างการปิดครั้งนี้เทียบกับ accepted HEAD `db485292` และรันอีกครั้งหลัง commit ledger เพื่อยืนยันว่าการเปลี่ยนแบบ docs-only ไม่ได้ขยับสิ่งใด ตัวเลขจึงมีที่มาจากการปิดครั้งนี้ ไม่ได้ยกมาจากรายงานของงานที่ 7

- Module ของงานที่ 7 `91/91`; registry directory `281/281`; verifier contracts `12/12`; full dynamic discovery `551/551`; ทั้งหมด exit `0` และ `OK`
- Clean-HEAD verifier: schema `1.1.0`, PASS, checks `13/13`, failed `0`, embedded dynamic full suite `551`, governed Component Master `20/20`, governed identity-tenancy `7/7`, compile exit `0`
- Cleanup เหลือ cache directory ศูนย์รายการและไฟล์ `.pyc` ศูนย์รายการ และ worktree สะอาดที่ `db48529201f25e4d4afe8d1816b12748524f8f32`

### ความสมบูรณ์และ cleanup ของหลักฐานที่ยอมรับแล้ว

- รายงานที่ยอมรับแล้ว: `.superpowers/sdd/task-7-ingestion-report.md`; 34,481 ไบต์; SHA-256 `e1669b85343ac32085f2a984950dab1e32bcc8a72a90fb208a235bda55c975f8`
- Native full-index binary review package ที่ยอมรับแล้ว: `.superpowers/sdd/task-7-ingestion-review-package.diff`; 141,447 ไบต์; SHA-256 `37529a0a1df5429bec2de27fc19bd9c79ce8edf7e4fb19ae8d087b898547f407`; มี exactly ห้าพาธของงานที่ 7 และ reverse apply ผ่านที่ accepted HEAD
- Delta re-review package ที่ยอมรับแล้ว: `.superpowers/sdd/task-7-ingestion-rereview-package.diff`; 9,599 ไบต์; SHA-256 `24a15d58d80647c2388a16d87e94c5ecda32308778393567a465989bdcba4d8e`; ครอบคลุมช่วง `8c90d52e..db485292` และ reverse apply ผ่าน
- Clean-HEAD verifier summary ก่อนลบ: 112,218 ไบต์; SHA-256 `3ebf1d5b47dfd4f8d34d45b97809d5dbdb6c87546d27313b720083087815976f` Verifier summary ถูกลบหลังบันทึกหลักฐาน

### ข้อจำกัดที่บันทึกไว้

รายการเหล่านี้บันทึกไว้โดยไม่ลดทอน เพราะแต่ละข้อกำหนดขอบเขตว่าหลักฐานของงานที่ 7 รองรับอะไรได้

- RED ถูกสังเกตด้วยตาตรงเฉพาะกับ module ของงานที่ 7 ในทุก wave ใน wave 1 ตัวเลข RED ของ registry directory, verifier contract และ full discovery ถูกสร้างขึ้นภายหลังในสำเนาชั่วคราวที่ไม่มี `.git` ซึ่งทำให้ test ที่ใช้ `git check-ignore` สองรายการล้มเหลวด้วยเหตุที่ไม่เกี่ยวกับการเปลี่ยนแปลง การสร้างใหม่นั้นถูกตัดสินว่าใช้เป็นหลักฐานไม่ได้ และบันทึกไว้ว่าไม่มีค่าเป็นหลักฐาน ไม่ได้ตกแต่งให้ดูดี
- Digest สองรายการในรายงานงานที่ 7 ขึ้นกับสภาพแวดล้อมและไม่พอร์ตข้ามเครื่อง: embedded full-suite output และ verifier summary มีเวลาต่อรอบและพาธแบบเต็มอยู่ภายใน เครื่องสามเครื่องให้ขนาด verifier summary สามค่า — 102,873, 111,439 และ 112,218 ไบต์ ข้อเท็จจริงที่พอร์ตได้คือจำนวน check และคำตัดสิน PASS ไม่ใช่ขนาดไบต์หรือ digest
- Guard ที่ derive ตัวเลขเพื่อพิสูจน์ว่าตัวเลขสถานะปัจจุบันในรายงานตรงกับการรันจริง เป็นสคริปต์ชั่วคราวใน scratchpad ไม่มีสิ่งใดใน repository รันซ้ำให้ ดังนั้นมันคุ้มครองเฉพาะรายงานฉบับที่ถูกรันเทียบ ไม่ใช่ฉบับถัดไป ผู้ตรวจอิสระปฏิเสธการอ้างผลของมันว่าตรวจแล้วอย่างถูกต้อง เพราะสคริปต์อยู่นอก repository ที่เขามองเห็น
- Family ใน census สร้างขึ้นด้วยมือ ไม่ได้สุ่มจากข้อมูลผู้ผลิตจริง จึงกำหนดขอบเขตของกฎเทียบกับรูปแบบที่คิดขึ้น ไม่ใช่เทียบกับหน้างาน
- **`evidence.py` และ `ingestion.py` ไม่ตรงกันเรื่องชนิดค่าที่ยอมรับ ซึ่งเป็นไปโดยเจตนา และผู้พัฒนางานที่ 8 ต้องรู้ข้อนี้** `evidence.FieldAssertion` ยังยอมรับค่าชนิด `Decimal`, `bytearray`, `frozenset` หรือ `float` ที่ไม่มีค่าจำกัด ซึ่งทั้งสี่ชนิด `CandidateRecord` ปฏิเสธที่ขั้นสร้างวัตถุ ตรวจสอบตรงแล้วที่ accepted HEAD ความไม่ตรงกันนี้เป็นไปตามเจตนาและมีเทสต์ครอบคลุมฝั่ง ingestion ส่วน `evidence.py` อยู่นอกพาธที่งานที่ 7 อนุมัติและไม่ได้ถูกแก้ งานภายหลังที่ต้องการ contract ชนิดค่าเดียวกันทั้งสองโมดูลต้องกระทบยอดภายใน `evidence.py`
- ทั้งบรรทัดขอบเขตปัจจุบันในรายงานของงานที่ 7 และหัวข้อของส่วน fix wave ในรายงานนั้น ใช้ถ้อยคำ "review-driven fix waves" ขณะที่ wave 4 มาจากคำสั่งเจ้าของระบบ ถ้อยคำนั้นไม่ปรากฏใน ledger นี้ และส่วน "ที่มาของแต่ละ wave" ด้านบนระบุทั้งสองแกนไว้อย่างชัดเจนแทน ความไม่แม่นยำนี้บันทึกไว้ที่นี่เพื่อไม่ให้อ่านรายงานกับ ledger ว่าเห็นตรงกันในข้อนี้
- ลำดับ wave เป็น 1, 3, 4, 5, 6, 7 โดยไม่มี wave 2 ผู้ประสานงานกำหนดหมายเลขในข้อความประสานงานและไม่ได้ใช้เลข 2 เท่านั้น **ไม่มีงานใดหายไป ไม่มีการ revert และไม่มีการปิดกั้นข้อมูล** บันทึกช่องว่างนี้ไว้เพื่อไม่ให้ตีความผิดในภายหลังว่าเป็น wave ที่ถูกลบหรือซ่อน
- รายการค้างที่ยังเปิดอยู่และยังไม่มีผู้รับผิดชอบจนกว่าแผนจะระบุ: การผูก `EvidenceVault`/source hash กับ `review_state`; การกระทบยอด rights ระหว่าง `SourceContext` กับ `SourceSnapshot`; การเปรียบเทียบข้าม prefix ระหว่าง `geometry.*` กับ `dimensions.*` ซึ่งต้องมีคำตัดสินเรื่องการตั้งชื่อฟิลด์ที่งานที่ 7 ไม่ได้เป็นเจ้าของ; การชนกันของ order code ระดับภูมิภาค; ความกำกวมของ pack/finish; per-entity ID namespacing; และการหลุดของ `except` ใน CLI ที่ `AttributeError` และ `RecursionError` ทำให้ exit `1` พร้อม traceback เปล่า แทน exit `2` พร้อมเหตุผล ซึ่งยังคง fail closed และไม่เขียนไฟล์ใด

### ขอบเขตอำนาจของงานที่ 7

- งานที่ 7 สร้างเฉพาะรากฐานของ reviewed ingestion และ quarantine แบบ fail closed
- **งานที่ 7 ไม่ได้เพิ่มข้อมูล registry และ ingestion surface ของงานนี้เก็บ record ศูนย์รายการ** แยกจากกันและอยู่นอกขอบเขตของงานที่ 7 repository มี bootstrap SKU seed จำนวน 20 record ที่ `data/component-master/skus.jsonl` ซึ่งรับเข้ามาโดย commit baseline ของงานที่ 1 คือ `6dd99372` ที่มาก่อน base ของงานที่ 7 โดยมี 2 record ที่ทำเครื่องหมายว่า verified เทียบกับ URL แคตตาล็อกของผู้จำหน่ายต้นทาง Seed contract ของ verifier เองนับได้ `sku_count = 20` และ `verified_sku_count = 2` Seed นั้นเป็น bootstrap cohort ไม่ใช่ registry ที่ผ่านการ qualify และงานที่ 7 ไม่ได้เพิ่มหรือตรวจสอบ seed นั้น คำสั่ง `git diff --name-only addadab0..db485292 -- data/` ให้ผลว่าง Ledger ฉบับก่อนหน้าอ้างว่า "registry ไม่มี SKU จริงเลยแม้แต่รายการเดียว" ซึ่งเป็นเท็จและแก้ไขไว้ที่นี่
- งานนี้ไม่ใช่ registry ทั่วโลกที่มีข้อมูลแล้ว, release signing, network monitoring, workflow แก้ไขเคสความขัดแย้ง, runtime integration, freeze/export authority, การ qualify เชิงโครงสร้างหรือทางกายภาพ, production readiness หรือ manufacturing readiness
- NOT-FOR-PRODUCTION ยังคงทำงานอยู่ หลักฐาน software ไม่ได้ให้อำนาจด้าน manufacturing, installation, operational หรือ production
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push, merge, rebase หรือเปลี่ยน branch
- งานที่ 8 เป็นงานถัดไป ยังไม่ได้เริ่ม และยังไม่มี brief

## ปิดงานที่ 8 — 31 กรกฎาคม 2026

**สถานะ:** COMPLETE
**Base ของงานที่ 8:** `3a19417fec54c41f074c91d504f2e6b32d3bfd57`
**Commit การพัฒนา:** `1fc8df07e6708e49e2356d12bce3b71f7b40a7e5` — `feat(registry): publish deterministic coverage releases`
**Fix wave 1:** `af351f06225c94419c64ea1391e80cb96e9660c3` — `fix(registry): enforce the evidence backing invariant in the snapshot`
**Fix wave 2:** `ae14fb6618181bcc4b07a71101b4ebec1e37dd25` — `fix(registry): align the backing floor with the gate on review state`
**Wave A ตามคำตัดสินเจ้าของ:** `51c6428bf73fdeb41cc5faa5923f6143ad875633` — `chore(registry): pin registry data to byte-exact end-of-line handling`
**Wave B ตามคำตัดสินเจ้าของ และเป็น HEAD ที่รับแล้ว:** `26d344e3edafb7a1e693c358087c001d51c0373b` — `feat(coverage): recognize root denominator input files`
**ขอบเขตปัจจุบัน:** งานที่ 9 เป็นงานถัดไป ยังไม่ได้เริ่ม และยังไม่มี brief **brief ของงานที่ 9 เขียนไม่ได้ตามที่แผนเขียนไว้ในขณะนี้** — มีความขัดแย้งระหว่างแผนกับ implementation ที่ทำซ้ำได้จริง บันทึกไว้ในหัวข้อข้อจำกัดด้านล่าง และต้องได้รับคำตัดสินจากเจ้าของก่อน การปิดงานนี้แทนที่เฉพาะประโยคขอบเขตปัจจุบันของงานที่ 7 ที่บันทึกว่างานที่ 8 เป็นงานถัดไปหรือยังไม่ได้เริ่มเท่านั้น ประโยคทั้งหมดของงานที่ 1–7 ยังคงถูกเก็บรักษาไว้เป็น snapshot ทางประวัติศาสตร์

### ขอบเขตที่ติดตามได้จริงของงานที่ 8

`git diff --name-status 3a19417f..26d344e3` ให้ผลลัพธ์เจ็ดรายการพอดี เป็นการเพิ่มทั้งหมด และไม่มีการลบใดในช่วงนี้:

| สถานะ | Path | บรรทัดที่เพิ่ม | บรรทัดที่ลบ |
| --- | --- | ---: | ---: |
| เพิ่ม | `packages/component-master/src/monolith_component_master/coverage.py` | 1,523 | 0 |
| เพิ่ม | `packages/component-master/src/monolith_component_master/releases.py` | 381 | 0 |
| เพิ่ม | `tools/connector_registry/check_coverage.py` | 111 | 0 |
| เพิ่ม | `tools/connector_registry/build_release.py` | 143 | 0 |
| เพิ่ม | `tests/component_master/registry/test_release.py` | 3,163 | 0 |
| เพิ่ม | `data/component-master/registry/v1/coverage-snapshot.json` | 1 | 0 |
| เพิ่ม | `data/component-master/registry/v1/.gitattributes` | 25 | 0 |

รวม 5,347 บรรทัดที่เพิ่ม และไม่มีการลบ ไม่มีการแก้ไข path ใดในรากธรรมาภิบาลของเจ้าของ, product runtime ที่ซ้อนอยู่, seed data, verifier, export หรือ product path อื่น ไม่ได้แก้ไข `evidence.py` ตามที่ brief กำหนด ไม่ได้ push, merge, rebase หรือเปลี่ยน branch

**brief อนุมัติหก path ไม่ใช่เจ็ด และต้องไม่อ่านข้อนี้ว่าเป็นการขยายขอบเขตแบบเงียบ** brief เขียนไว้ว่า *"หากการแก้ไขจำเป็นต้องใช้ path ที่เจ็ดจริง ให้หยุดและรายงาน ไม่ใช่ขยายขอบเขตแบบเงียบ"* path ที่เจ็ดคือ `.gitattributes` ถูกเพิ่มหลังจาก implementation ผ่านการรีวิวและรับแล้ว โดยคำตัดสินชัดเจนของเจ้าของต่อคำถามที่ orchestrator ยกขึ้นมาเป็นรายการค้าง และเขียนกับ commit โดย orchestrator ไม่ใช่ implementer ไฟล์นี้เป็นไฟล์ attribute ของ repository และไม่เพิ่มพฤติกรรมที่ทำงานได้ใด ๆ

### สัญญาที่แน่นอนของ coverage ledger และ release

- `CoverageSnapshot` เก็บตัวส่วนที่วัดได้และการจำแนกทุกรายการเทียบกับตัวส่วนนั้น ตัวเลขเป็นค่า `MeasuredCount` ที่พกตัวส่วน ป้ายกำกับตัวส่วน และฟังก์ชันที่วัดมาด้วย ดังนั้นจึงไม่มีตัวเลขใดที่อ่านได้โดยไม่มีคำว่า "จากทั้งหมดเท่าไร"
- **มิติของหลักฐานถูกนับแยกกันและไม่เคยถูกรวมเป็นคะแนนเดียว** สิบมิติ — `bom`, `commercial`, `field`, `geometry`, `identity`, `lifecycle`, `material_thickness`, `rights`, `structural`, `tooling` — แต่ละมิติรายงานจำนวน verified ของตัวเอง ไม่มีเปอร์เซ็นต์ coverage เดียวอยู่ที่ใดใน payload โดยเจตนา
- **ไม่มี item ที่ค้นพบแล้วแต่ยังไม่ถูกจำแนกที่จะไปถึง release ได้** release ปฏิเสธที่จะ build เมื่อมี item ที่ยังไม่ถูกจำแนก อย่างไม่มีเงื่อนไข และไม่มี flag ให้ปิด
- **หนี้ที่ตกทอดมาจากงานที่ 7 ถูกปิดที่ระดับ snapshot ไม่ใช่ด้วยธรรมเนียมปฏิบัติ** `CoverageSnapshot` ปฏิเสธ record ใดก็ตามที่อ้างว่า `VERIFIED` แต่ไม่มี assertion หรือมี assertion ที่ระบุ source ซึ่งตัวส่วนที่วัดได้ไม่ได้ถือไว้ว่า `REGISTERED` เว้นแต่จะมี evidence gate finding ที่ระบุ item และ assertion นั้นตรงตัว ก่อน `af351f06` สิ่งนี้เป็นเพียงธรรมเนียมภายใน `build_snapshot` ดังนั้นข้ออ้างที่ไม่มีหลักฐานหนุนยังไปถึง release ได้ผ่าน caller อื่นใด
- floor และ gate ตอบคำถามเรื่อง review state ตรงกันแล้ว: assertion ที่ยังไม่มีใครรีวิวไม่ใช่หลักฐานหนุน `EvidenceGateFinding` บังคับความสัมพันธ์ blank แปลว่า `MISSING_ASSERTION` ทั้งสองทิศทาง finding เดียวจึงไม่สามารถครอบคลุมรูปแบบการปฏิเสธสองแบบพร้อมกันได้อีก
- ความเข้าถึงได้ของเหตุผล gate เป็นสิ่งที่ **derive ออกมา** ไม่ใช่เขียนด้วยมือ `GateReasonReachabilityTests` ขับทุกเหตุผลและยืนยันว่าพื้นผิวใดเป็นผู้ผลิตเหตุผลนั้น ค่าคงที่ถูกอธิบายว่าเป็นชุดที่ demonstrated แล้ว ไม่ใช่ชุดของความเป็นไปได้ การ derive แก้สองรายการที่ตารางเขียนมือเขียนผิด
- การค้นหาเดินลงไปในไดเรกทอรีย่อยจากรากของ registry โดยมี `_source-cache` เป็นข้อยกเว้นเดียวที่มีเอกสารกำกับและผูกกับรากเท่านั้น ดังนั้น `.jsonl` ที่เพิ่มในไดเรกทอรีย่อยจะถูกวัด ไม่ใช่ถูกละเว้นเงียบ ๆ
- ตัวอ่านแยกบรรทัดที่ LF เท่านั้น `str.splitlines()` แยกที่ U+2028, U+2029 และ U+0085 ด้วย ซึ่ง serializer ของแพ็กเกจนี้เองปล่อยออกมาแบบดิบ
- มีชื่อไฟล์สองชื่อพอดีที่ถูกรับรู้ว่าไม่ใช่ item input ที่รากของ registry — `brand-universe.jsonl` และ `source-denominator.jsonl` — โดยชื่อตรงตัว ไม่ใช่ pattern `.jsonl` ที่ไม่รู้จักยังคงล้มดัง ทั้งที่รากและที่ความลึกใด ๆ ชื่อที่อยู่ใน allowlist หากอยู่ในไดเรกทอรีย่อยจะถูกปฏิเสธว่ากำกวม และทั้งสองไฟล์ไม่มีส่วนใน `discovered_item_count`
- แถวใน `source-denominator.jsonl` ต้องประกาศ `state: BLOCKED` คำว่า `REGISTERED` ถูกปฏิเสธที่นั่น เพราะตัวอ่านนี้ไม่ได้ถือ byte ของ source ที่ถูกประกาศไว้ด้วยชื่อเท่านั้น จึงตรวจ digest ซ้ำไม่ได้ ขณะที่ `coverage_statement` เผยแพร่คำว่า `REGISTERED` ในความหมาย *"readable and hash-verified"* การรับคำนั้นจะทำให้ประโยคที่เผยแพร่ไปแล้วกลายเป็นเท็จ
- `RegistryRelease` เก็บอัตลักษณ์ของ release, semantic version, payload digest และ source-denominator digest ส่วน metadata การสร้างอยู่ **นอก** payload ที่ถูก hash JSON แบบ canonical เป็น UTF-8 เรียง key แยกตัวคั่นแบบกระชับ `allow_nan=False` และลงท้ายบรรทัดด้วย LF การเผยแพร่เป็นแบบทั้งหมดหรือไม่มีเลย ผ่านไฟล์ชั่วคราวร่วมกับ `os.fsync` และ `os.link`

### ที่มาของแต่ละ wave — การเปลี่ยนแปลงใดมาจากไหน

สอง wave เกิดจากการรีวิวอิสระ และสอง wave มาจากคำตัดสินของเจ้าของ คอลัมน์ "ที่มา" บันทึกอำนาจในการตัดสิน เช่นเดียวกับ ledger ของงานที่ 7 เพราะนั่นคือคุณค่าเชิงธรรมาภิบาลของ ledger

| Wave | Commit | ที่มา | ปิดอะไร |
| --- | --- | --- | --- |
| 1 | `af351f06` | รีวิว ห้าข้อค้นพบ | ข้อบังคับเรื่องหลักฐานหนุนเป็นเพียงธรรมเนียมภายใน caller หนึ่งตัว ไม่ใช่ invariant ของ record ข้ออ้าง `VERIFIED` ที่ไม่มีหลักฐานหนุนจึงไปถึง release ได้ผ่าน caller อื่น ความล้มเหลวฝั่ง source ยุบรวมเป็น `ASSERTION_NOT_REGISTERED` ทั้งหมดแทนที่จะระบุตัวเอง การค้นหาไม่เดินลงไดเรกทอรีย่อย ตัวอ่านแยกบรรทัดที่ Unicode line separator ที่ serializer ของตัวเองปล่อยออกมาดิบ และ release ไม่ได้ปฏิเสธ item ที่ยังไม่ถูกจำแนกอย่างไม่มีเงื่อนไข |
| 2 | `ae14fb66` | รีวิว สามข้อค้นพบ | จุดบังคับใช้สองจุดในโมดูลเดียวตอบคำถามเดียวกันต่างกัน: floor รับ assertion ที่เป็น `PENDING` ว่าเป็นหลักฐานหนุน ขณะที่ gate ปฏิเสธรูปแบบเดียวกันด้วย `ASSERTION_NOT_VERIFIED` `EvidenceGateFinding` บังคับความสัมพันธ์ blank แปลว่า `MISSING_ASSERTION` เพียงทิศทางเดียว และตารางความเข้าถึงได้ที่เขียนด้วยมือผิดสองรายการ ตอนนี้ derive แล้ว |
| A | `51c6428b` | **คำตัดสินเจ้าของ — ไม่ใช่ข้อค้นพบจากรีวิว** | การ clone ใหม่บน Windows เขียน `coverage-snapshot.json` ที่ commit ไว้จาก LF เป็น CRLF วัดได้ 4428 → 4429 byte พร้อม digest ที่ต่างออกไป ผู้อ่านจึงยืนยัน digest ที่เผยแพร่กับไฟล์ที่ได้รับไม่ได้ ขอบเขตถูกจำกัดไว้ที่รากของ registry ตามคำตัดสินเจ้าของ เขียนและ commit โดย orchestrator |
| B | `26d344e3` | **คำตัดสินเจ้าของ — ไม่ใช่ข้อค้นพบจากรีวิว** | `discover_registry_root` ปฏิบัติกับทุก `*.jsonl` ยกเว้น source manifest ว่าเป็นข้อมูล item ที่ความลึกใดก็ได้ ไฟล์ input สองไฟล์ที่รากซึ่งงานที่ 9 จะสร้างจึงจะล้มแรงด้วย `item_id must be a nonblank string` ตอนนี้รับรู้ชื่อไฟล์ตรงตัวสองชื่อ ที่รากเท่านั้น พร้อมข้อบังคับชัดเจนของเจ้าของว่า `.jsonl` ที่ไม่รู้จักต้องยังล้มดัง ไม่ใช่ถูกข้ามเงียบ |

ข้อบังคับของเจ้าของใน wave B ถูกรักษาไว้ครบตามผลจริง: **allowlist เป็นชื่อไฟล์ที่ระบุชัด ไม่ใช่ pattern กว้าง และ `.jsonl` ที่ไม่รู้จักยังล้มดัง** ผลที่ยอมรับคือวันนี้ `brand-universe.jsonl` ถูกรับรู้ในฐานะไฟล์ที่ไม่มี record เท่านั้น แถวที่ไม่ว่างจะถูกปฏิเสธ เพราะยังไม่มี type ของ brand record ให้ตรวจสอบ และ `CoverageSnapshot` ไม่มีช่องให้เก็บ schema ของแถวนั้นเป็นของงานที่ 9 ที่จะนิยาม

### ลำดับเหตุการณ์ TDD และการรีวิวอิสระตามจริง

| ขั้น | ผลตัดสิน / ผลลัพธ์ | การจัดการ |
| --- | --- | --- |
| Implementation | commit เป็น `1fc8df07` | สร้าง path หกในเจ็ด path สุดท้าย ยังไม่ถูกรับ |
| รีวิวอิสระครั้งที่หนึ่ง | `NEEDS_FIXES` | ห้าข้อค้นพบ นำโดยข้อบังคับเรื่องหลักฐานหนุนที่เป็นธรรมเนียมของ caller ไม่ใช่ invariant ของ record |
| Wave 1 | commit เป็น `af351f06` | `coverage.py` +214/−27, `releases.py` +13/−0, `test_release.py` +464/−4 |
| รีวิวอิสระครั้งที่สอง | `NEEDS_FIXES` | สามข้อค้นพบที่แคบ: floor กับ gate ไม่ตรงกันเรื่อง `review_state`, ความสัมพันธ์ทางเดียวของ `EvidenceGateFinding` และตารางความเข้าถึงได้ที่เขียนด้วยมือผิดสองรายการ |
| Wave 2 | commit เป็น `ae14fb66` | `coverage.py` +88/−35, `test_release.py` +294/−0 ตารางความเข้าถึงได้กลายเป็นการ derive พร้อม guard ที่ผ่าน mutation testing |
| รีวิวอิสระครั้งที่สาม | `ACCEPTED` | งานที่ 8 ถูกรับ รายการค้างสองข้อถูกยกให้เจ้าของตัดสิน แทนที่จะดำเนินการเองฝ่ายเดียว |
| คำตัดสินเจ้าของต่อรายการค้างทั้งสอง | เป็นการเพิ่มขอบเขต ไม่ใช่ข้อค้นพบจากรีวิว | เจ้าของตัดสินทั้งสองข้อ: ตรึงการจัดการ end-of-line ที่รากของ registry และเพิ่ม allowlist ชื่อไฟล์ที่ระบุชัด พร้อมข้อบังคับว่า allowlist ต้องเป็นชื่อตรงตัว และ `.jsonl` ที่ไม่รู้จักต้องยังล้มดัง |
| Wave A | commit เป็น `51c6428b` | เขียนโดย orchestrator พิสูจน์ผลด้วย `git checkout-index` ลง prefix ชั่วคราวทั้งก่อนและหลัง ไม่ใช่การกล่าวอ้าง |
| Wave B | commit เป็น `26d344e3` | `coverage.py` +195/−3, `test_release.py` +413/−0 ใน wave นี้ไม่มีการลบเทสต์และไม่มีการแก้ไขเทสต์เดิมเลย ทุกการเปลี่ยนแปลงเทสต์เป็นการเพิ่มล้วน |
| รีวิวอิสระครั้งสุดท้าย | `ACCEPTED` — ไม่มีข้อค้นพบใน `26d344e3` | ตรวจสอบจากการรันจริง: ชื่อไฟล์ที่ใกล้เคียง, ไดเรกทอรีที่ตั้งชื่อตรงกับ allowlist, symlink, UTF-16, UTF-8 BOM, ตัวจบบรรทัด CRLF, ความลึกซ้อน และ `source_id` ซ้ำทั้งภายในไฟล์เดียวและข้ามไฟล์ ล้วนถูกปฏิเสธดัง ๆ พร้อมระบุไฟล์ บรรทัด และฟิลด์ มีข้อ P3 หนึ่งข้อที่ยกขึ้นต่อ `51c6428b` ซึ่งอยู่นอกขอบเขตงานที่ 8 — ดูหัวข้อข้อจำกัด |

### การรันตรวจสอบซ้ำ ณ การปิดงานนี้

ทุกตัวเลขด้านล่างถูกรันใหม่โดย orchestrator ระหว่างการปิดงานนี้ เทียบกับ HEAD ที่รับแล้ว `26d344e3` ไม่ได้ยกมาจากรายงานของงานใด

- `test_release` `177/177`; ไดเรกทอรี registry `458/458`; full dynamic discovery `728/728`; ทั้งหมด `OK` และ exit `0`
- Verifier: `overall_passed: true`, `check_count 13`, `passed_count 13`, `failed_count 0`
- คำสั่ง CLI ทั้งสองตามแผน ที่รากของ registry: `check_coverage.py --fail-on-unclassified` exit `0`; `build_release.py --version 0.1.0` exit `0`
- payload ของ release ที่ build ใหม่มี byte เหมือนกันทุกประการกับ `data/component-master/registry/v1/coverage-snapshot.json` ที่ commit ไว้: 4,428 byte, SHA-256 ขึ้นต้นด้วย `f957bb48d5be2c3f`, ไม่มี byte CR เลย
- `coverage_statement` ที่เผยแพร่บนรากที่ว่างเปล่าอ่านได้เต็มความว่า *"0 of 0 discovered registry items classified; 0 of 0 counted as verified with backing evidence; 0 of 0 verified claims refused by the evidence gate; 0 of 0 named sources readable and hash-verified; 0 of 0 named sources blocked. The registry root holds zero records, so this release covers nothing. Measured by coverage.discover_registry_root over the named registry root; no figure here is a market-wide claim."*
- `git status --porcelain` ว่างเปล่าที่ `26d344e3edafb7a1e693c358087c001d51c0373b`

### ความสมบูรณ์ของหลักฐานที่รับแล้วและการทำความสะอาด

- brief ที่รับแล้ว: `.superpowers/sdd/task-8-brief.md`; 9,507 byte; SHA-256 `21decd81881989e1c31026091946a01ae6c143f1206b802f0b6331f7f956072d`
- digest ของ path ทั้งเจ็ดในสภาพ worktree ณ HEAD ที่รับแล้ว แสดงสิบหกตัวอักษร hex แรก: `coverage.py` 59,007 B `e29cef4b1a6adbee`; `releases.py` 13,647 B `5b610723c6ad5235`; `check_coverage.py` 3,492 B `d90f6861459517d5`; `build_release.py` 4,481 B `ee5c37e6429d32ce`; `test_release.py` 119,512 B `12f3e3aabbe3b260`; `coverage-snapshot.json` 4,428 B `f957bb48d5be2c3f`; `.gitattributes` 1,388 B `67311d63d485cd71`
- การทำความสะอาดเหลือไดเรกทอรี `__pycache__` ศูนย์รายการและไฟล์ `.pyc` ศูนย์ไฟล์ภายในเลนแยกของ parent และ prefix ของ checkout ชั่วคราวทุกอันถูกลบแล้ว

### ข้อจำกัดที่บันทึกไว้

บันทึกไว้โดยไม่ลดทอน เพราะแต่ละข้อกำหนดขอบเขตว่าหลักฐานของงานที่ 8 รองรับอะไรได้

- **ข้อความ commit ของ `51c6428b` มีข้ออ้างที่การปิดงานนี้พิสูจน์ว่าเป็นเท็จ และบันทึกไว้ที่นี่เพราะข้อความ commit แก้ไขในที่เดิมไม่ได้** ข้อความนั้นเขียนว่าไฟล์ที่ติดตามอยู่นอกรากของ registry *"เป็นเอกสารและ workflow ที่การแปลงไม่มีผลเสีย"* วัดใหม่ที่ HEAD ที่รับแล้วด้วยการจำลอง checkout ใหม่ผ่าน `git checkout-index`: จากไฟล์ที่ติดตาม 196 ไฟล์ มี 113 ไฟล์ที่ต่างจาก worktree เมื่อ checkout และ **9 ไฟล์ในนั้นเป็นไฟล์ข้อมูล `.json`/`.jsonl`** โดยหกไฟล์อยู่ใต้ `data/component-master/` ที่สำคัญกว่านั้น `docs/reports/2026-07-26-global-connector-registry-baseline-adoption-manifest.json` เผยแพร่คู่ path กับ SHA-256 จำนวน 77 คู่ และ **ไม่มีคู่ใดใน 77 คู่ที่ทำซ้ำได้บน checkout ใหม่** โดย 74 คู่ยังตรงกับ worktree ส่วนอีก 3 คู่เปลี่ยนไปตาม commit หลังจากนั้นโดยชอบธรรม เจ้าของตัดสิน *ขอบเขต* ของ `51c6428b` ให้จำกัดที่รากของ registry เท่านั้น และ **คำตัดสินนั้นยังคงอยู่ไม่เปลี่ยน** สิ่งที่ถูกพิสูจน์ว่าเป็นเท็จคือคำว่า "ไม่มีผลเสีย" ไม่ใช่ขอบเขต ไม่มี digest ของ release ใดได้รับผลกระทบ และเหตุผลแคบกว่าคำว่า "release อ่านเฉพาะไดเรกทอรีนั้น": การตรึงเป็นราย glob ดังนั้น `.gitattributes` และ `.gitignore` ที่อยู่ **ภายใน** `data/component-master/registry/v1` ก็ยังถูกแปลงเมื่อ checkout ที่ 1,388 → 1,413 และ 16 → 17 byte สิ่งที่เป็นจริงคือ release อ่านเฉพาะ `*.json` และ `*.jsonl` ใต้รากนั้น และสอง glob นั้นพอดีที่ถูกตรึงไว้ — พิสูจน์ด้วยวิธีที่แข็งกว่า คือ build release จาก checkout ใหม่ที่จำลองขึ้น แล้วได้ payload 4,428 byte และ digest เดียวกัน ส่วนที่ว่า manifest baseline ของงานที่ 1 จะได้ wave ของตัวเองหรือไม่ เป็นการตัดสินใจของเจ้าของที่ยังเปิดอยู่
- **ตัวเลข "76 ไฟล์ที่ติดตาม" ใน `51c6428b` ไม่สามารถ derive จาก repository ได้** ตัวเลขนั้นนับไฟล์ที่มี CR อยู่แล้วใน *working tree นี้โดยเฉพาะ* ซึ่งเป็นคุณสมบัติของวิธีที่ tree นั้นถูกสร้าง ไม่ใช่ของ commit ใด ไม่มี blob ใดในช่วงนี้ที่มี CR เลย ดังนั้นการ checkout ของ commit ใดก็ไม่ทำให้ได้ตัวเลขนั้นกลับมา ส่วนการนับ worktree เดียวกันที่ HEAD ที่รับแล้วได้ 81 เพื่อความเป็นธรรมกับข้อความนั้น มันเขียนว่า "in working trees" ไว้แล้ว ไม่ได้เสนอตัวเลขเป็นข้อเท็จจริงของ repository ข้อบกพร่องจึงแคบกว่าที่ฉบับแรกของการปิดงานนี้ระบุ: ตัวเลขนั้นผู้อ่านทำซ้ำไม่ได้ ไม่ใช่ผู้เขียนติดป้ายผิด
- **ความขัดแย้งระหว่างแผนกับ implementation ปิดกั้นงานที่ 9 ตามที่แผนเขียนไว้ในขณะนี้ และได้ทำซ้ำจนครบด้วยคำสั่งของแผนเอง** ถ้อยคำของแผนเองเป็นร้อยแก้ว ไม่ใช่ schema — *"Each row records publisher, official URL, edition when printed, region, language, access date, rights state and one of `DISCOVERED`, `SOURCE_BLOCKED`, `DORMANT_OR_DEFUNCT` or `REVIEWED`."* มันระบุเจ็ดแนวคิด สี่สถานะ และไม่มี `sha256` ทั้งสามจุดชนกับโมดูลนี้ และการชนไม่ขึ้นกับว่าเจ็ดแนวคิดนั้นจะถูกตั้งชื่อว่าอะไรในที่สุด: แถวของตัวส่วนที่ประกาศไว้ถือฟิลด์ **เพียง** `blocked_reason`, `sha256`, `source_id` และ `state` ดังนั้นฟิลด์เพิ่มอีกเจ็ดฟิลด์ไม่ว่าสะกดอย่างไรก็ถูกปฏิเสธ; **ทั้งสี่** สถานะของแผนอยู่นอก vocabulary ที่มีสองค่า `("BLOCKED", "REGISTERED")` — `SOURCE_BLOCKED` ไม่ใช่ `BLOCKED` และการตรวจเป็นการเทียบสมาชิกแบบตรงตัว; และ `SourceDenominatorEntry` บังคับ 64 ตัวอักษร hex ตัวพิมพ์เล็ก ขณะที่แผนไม่ได้ให้อะไรมาเลย แถวที่เขียนตามคำบรรยายของแผนถูกปฏิเสธ และคำสั่ง Step 4 ของแผนเอง `check_coverage.py --root data/component-master/registry/v1 --fail-on-unclassified` ให้ exit `2` ขณะที่แผนระบุว่า *"Expected: exit 0."* **ฉบับแรกของการปิดงานนี้เขียนว่า "สามในสี่สถานะ" และแสดงเจ็ดแนวคิดราวกับเป็นชื่อฟิลด์ที่ยกมาจากแผน ทั้งสองข้อผิด ข้อแรกทำให้ความขัดแย้งดูเบากว่าจริง และแก้ไขไว้ที่นี่** นี่ไม่ใช่ข้อบกพร่องใน `26d344e3` — ตัวอ่านปฏิเสธดัง ๆ และบอกว่าต้องแก้อะไร — แต่ brief ของงานที่ 9 ต้องกระทบยอด schema ของแถว, vocabulary ของสถานะ และข้อบังคับ `sha256` **ก่อน** เริ่มงานที่ 9 ใด ๆ
- **การใส่ `brand-universe.jsonl` ไว้ใน allowlist ในขณะนี้ซื้อได้เพียงข้อความ error ที่ดีขึ้น และไม่ได้อะไรมากกว่านั้น** แถวที่ไม่ว่างถูกปฏิเสธไม่ว่าชื่อจะถูกรับรู้หรือไม่ และไฟล์ที่ไม่มี record ก็ไม่มีส่วนใดทั้งสองทาง วันนี้ไม่มีข้อมูล brand ใดถูกวัด และ payload ของ release ไม่ได้อะไรจากไฟล์นั้น การซื้อนี้ชอบธรรม — ข้อความปฏิเสธบอกงานที่ 9 อย่างแม่นยำว่าต้องนิยามอะไร — แต่ต้องไม่ถูกอ่านว่าเป็น brand coverage
- **`Path.rglob` ไม่เดินตาม symlink ของไดเรกทอรี ดังนั้นไดเรกทอรีย่อยที่เป็น symlink ภายในรากของ registry จึงไม่ถูกวัด** บันทึกไว้ ไม่ได้แก้
- **floor ไม่ได้ตรวจสอบไขว้ระหว่าง `blocked_sources` กับ `source_denominator`** บันทึกไว้ ไม่ได้แก้
- **floor ทำ hash ซ้ำไม่ได้** มันตรวจว่า source ถูกถือไว้ว่า `REGISTERED` ในตัวส่วนที่วัดได้ ไม่ได้อ่าน byte ของ source เองแล้วคำนวณ digest ใหม่ นั่นคือเหตุผลที่ `REGISTERED` ถูกปฏิเสธจาก `source-denominator.jsonl` และเป็นสิ่งที่กำหนดขอบเขตว่าคำว่า "hash-verified" ในประโยคที่เผยแพร่ตั้งอยู่บนอะไร
- **ตระกูลของ census ถูกสร้างด้วยมือ ไม่ได้สุ่มจากข้อมูลผู้จำหน่ายจริง** มันกำหนดขอบเขตของกฎเทียบกับรูปแบบที่จินตนาการขึ้น ไม่ใช่เทียบกับสนามจริง
- **ความเป็น deterministic พิสูจน์บน interpreter เดียวและระบบปฏิบัติการเดียว** ความเหมือนกันระดับ byte ได้รับการยืนยันข้าม process แยกกัน ภายใต้ `PYTHONHASHSEED=random` และเมื่อสลับลำดับ input แต่ทำบน Windows ด้วย CPython บนเครื่องนี้เท่านั้น ความเหมือนกันระดับ byte ข้ามแพลตฟอร์มและข้าม interpreter ยังไม่ได้พิสูจน์
- **ไม่เคยทดสอบบน filesystem ที่แยกตัวพิมพ์ใหญ่เล็ก** พฤติกรรมของ `Brand-Universe.jsonl` ที่มีตัวพิมพ์ผสมบนระบบเช่นนั้นเป็นการให้เหตุผลจากข้อเท็จจริงที่ `rglob` รายงานชื่อจริงบนดิสก์ ไม่ใช่การสังเกตจริง ผลลัพธ์ที่สังเกตได้คือการปฏิเสธดัง ๆ ทั้งสองทาง ความเสี่ยงจึงเป็นเรื่องของการ checkout repository มากกว่าเรื่องของตัวอ่าน
- **งานที่ 8 ไม่มีไฟล์รายงานและไม่มี review-package diff ต่างจากงานที่ 1–7** ค้นและยืนยันว่าไม่มีจริง ครอบคลุมทั้ง tree ของ repository ในเลน parent, เลน runtime ที่แยกอยู่ และ scratchpad ของ session: `.superpowers/sdd/task-8-brief.md` เป็นไฟล์เดียวของงานที่ 8 ที่มีอยู่ รายงานของ implementer และ reviewer ทุกฉบับของงานที่ 8 ถูกส่งภายใน session และไม่เคยเขียนลงดิสก์ ledger นี้จึงอ้าง digest ของรายงานเหล่านั้นไม่ได้ และไม่ได้ยกตัวเลข RED รายคลื่นมากล่าวซ้ำ **ดังนั้น RED รายคลื่นของงานที่ 8 จึงไม่มี artifact ใดหลงเหลือเป็นหลักฐาน** และการปิดงานนี้ไม่กล่าวอ้างเรื่องนั้นเลย นี่คือการถดถอยเชิงกระบวนการเทียบกับงานที่ 7 และถูกบันทึกไว้แทนที่จะกลบเกลื่อน
- **การไม่มี artifact เดียวกันนี้ลามไปถึงคอลัมน์ "ที่มา" ด้วย และนั่นคือครึ่งที่ร้ายแรงกว่า** wave สองอันที่ติดป้าย OWNER-RULED, ผลตัดสินของการรีวิวในตารางลำดับเหตุการณ์ และประโยคที่ว่า `.gitattributes` เขียนโดย orchestrator ไม่ใช่ implementer ล้วนตั้งอยู่บนบันทึกภายใน session เพียงอย่างเดียว `grep` ทั่วทั้ง tree ของ parent ไม่พบ artifact คำตัดสินเจ้าของของงานที่ 8 เลย ข้อความ commit ของ `51c6428b` มีบรรทัดที่เขียนไว้ ณ เวลานั้นว่า *"Scope is this directory only, by owner ruling"* จริง แต่ **ข้อความของ `26d344e3` ไม่มีการอ้างถึงเจ้าของเลย** และอ่านได้เหมือนการตัดสินใจเชิงวิศวกรรม metadata ผู้เขียนของ git ก็ยืนยันความต่างระหว่าง orchestrator กับ implementer ไม่ได้ เพราะทุก commit ในช่วงนี้ใช้อัตลักษณ์เดียวกันทั้งในฐานะ author และ committer ส่วน *จำนวน* ข้อค้นพบในตารางลำดับเหตุการณ์นั้นมีข้อความ commit รองรับ — `af351f06` เขียนว่า "Close five review findings" และ `ae14fb66` เขียนว่า "Close three narrow findings from the second review wave" — แต่อำนาจในการตัดสินคือแกนที่ ledger ของงานที่ 7 บอกว่าต้องไม่เบลอ และตรงนี้มันถูกยืนยันด้วยตัวหนาโดยไม่มี artifact รองรับ ผู้อ่านที่ต้องการตรวจว่าใครตัดสิน wave B ทำไม่ได้
- **ไฟล์ที่รากของ registry ซึ่งไม่ใช่ `*.jsonl` จะถูกข้ามเงียบ ๆ และไม่มีข้อความใดบอก** `discover_registry_root` วนด้วย `rglob("*.jsonl")` ดังนั้น item object ที่ถูกต้องซึ่งเขียนเป็น `items.json` หรือไฟล์แปลกปลอม `notes.txt` ทำให้ `check_coverage --fail-on-unclassified` จบที่ exit `0` พร้อม `discovered_item_count: 0` ขณะที่เนื้อหาเดียวกันใน `foo.jsonl` ให้ exit `2` และระบุชื่อไฟล์ การรับประกันเรื่องการปฏิเสธดัง ๆ ที่บันทึกไว้ข้างต้นจึงมีขอบเขตอยู่ที่นามสกุล `.jsonl` ไม่ใช่ที่ไดเรกทอรี ตอนนี้ไม่มีผลเสียเพราะรากยังว่าง แต่งานที่ 9–12 จะเขียนลงในรากนั้น บน filesystem ที่แยกตัวพิมพ์ `ITEMS.JSONL` จะไปอยู่ในคอลัมน์ที่ถูกข้ามเงียบด้วย ส่วนบนเครื่องนี้ glob ไม่แยกตัวพิมพ์จึงจับได้
- **commit การพัฒนา `1fc8df07` มีเพียงบรรทัดหัวเรื่องเปล่า ไม่มีเนื้อความและไม่มี trailer** ต่างจากทุก commit อื่นในช่วงนี้ เหตุผลของ implementation ดั้งเดิมจึงกู้คืนจาก git เพียงอย่างเดียวไม่ได้

### ขอบเขตอำนาจของงานที่ 8

- งานที่ 8 สร้างเพียง coverage ledger และตัว build release แบบ deterministic มันเผยแพร่สิ่งที่ registry ถืออยู่ในปัจจุบัน ไม่ได้ตัดสินว่าอะไรควรอยู่ใน registry และไม่ได้ใส่ข้อมูลเข้าไป
- **รากของ registry ว่างเปล่า และทุก release ที่ build จากรากนั้นครอบคลุมศูนย์** ทุก `.jsonl` ใต้ `data/component-master/registry/v1/` เป็น seed ที่ไม่มี record และประโยคที่เผยแพร่บอกเช่นนั้นด้วยถ้อยคำ ไม่ใช่ด้วยการเว้นว่าง แยกจากกันและอยู่นอกขอบเขตของงานที่ 8 repository ยังคงมี bootstrap SKU seed จำนวน 20 record ที่ `data/component-master/skus.jsonl` ซึ่งรับเข้ามาโดย commit baseline ของงานที่ 1 คือ `6dd99372` โดยมี 2 record ที่ทำเครื่องหมายว่า verified คำสั่ง `git diff --name-only 3a19417f..26d344e3 -- data/component-master/skus.jsonl` ให้ผลว่าง
- งานที่ 8 ไม่ได้ลงลายเซ็นอะไร และไม่ได้ให้อำนาจด้าน manufacturing, freeze, export หรือ production
- งานนี้ไม่ใช่ registry ทั่วโลกที่มีข้อมูลแล้ว, release signing, network access, runtime integration, การ qualify เชิงโครงสร้างหรือทางกายภาพ, coupon testing, machine capability, first-article inspection, field validation, การให้สัตยาบันของเจ้าของ, production readiness หรือ manufacturing readiness
- NOT-FOR-PRODUCTION ยังคงทำงานอยู่ หลักฐาน software ไม่ได้ให้อำนาจด้าน manufacturing, installation, operational หรือ production
- Daph ยังคงเป็นเพียงหนึ่ง tenant/pilot และไม่ได้เป็นเจ้าของ shared registry หรือ canonical platform data
- ไม่ได้ push, merge, rebase หรือเปลี่ยน branch
- งานที่ 9 เป็นงานถัดไป ยังไม่ได้เริ่ม ยังไม่มี brief และเริ่มไม่ได้จนกว่าความขัดแย้งของแผนที่บันทึกไว้ข้างต้นจะได้รับคำตัดสินจากเจ้าของ
