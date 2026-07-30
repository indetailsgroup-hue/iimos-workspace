# Book-to-Skill on Codex/Windows — Implementation and Reconciliation Evidence

**Edition:** English
**Report date:** 30 July 2026, Asia/Bangkok (UTC+7)
**Governing design:** [`docs/superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.en.md`](../superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.en.md)
**Implementation plan:** [`docs/superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.en.md`](../superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.en.md)
**Companion report:** [`2026-07-30-book-to-skill-upstream-audit.en.md`](2026-07-30-book-to-skill-upstream-audit.en.md)
**Scope:** parent governance root `C:\Users\thai3\determined-williams (2)` and the personal Codex skills directory

> **Root rule:** the nested product repository `determined-williams\` was not written by this work. Its worktree was already carrying unrelated changes on branch `fix/dxf-truth-chain` before and after this session.

---

## 1. What this session actually did

The plan describes a build that runs in order: vendor the audited runtime, write the overlay, add tests, then deploy and lock. On this machine the deployment already existed when this session started — an earlier Codex session had written the personal installation and its provenance lock — while the governance repository carried none of the source, tests, or reports the plan owns.

This session reconciled that split: it re-derived the pinned bytes independently, vendored them into the repository, wrote the test suite the plan specifies, and proved that the tree Codex loads equals the tree the repository now governs.

### 1.1 Observed timeline (local time, 30 July 2026)

| Time | Event | Origin |
|---|---|---|
| 28 Jul | `book_to_skill/`, `tools/` written into the personal skills directory | earlier session |
| 14:27 | `LICENSE.md`, `scripts/extract.py` in place | earlier session |
| 14:42–14:43 | overlay `SKILL.md` and `agents/openai.yaml` | earlier session |
| 14:51 | `scripts/install_generated_skill.py` | earlier session |
| 15:21 | provenance lock `~/.codex/skills/.provenance/book-to-skill.json` (`auditedAt` `2026-07-30T08:21:20Z`) | earlier session |
| 19:17–19:42 | governed source `tools/codex-skills/book-to-skill/`, `tests/codex_skills/`, byte comparison, reproduction of the patched defect | this session |
| 19:47 | `verify_provenance.py` → `PASS` | this session |

### 1.2 One correction to this session's own opening status report

The opening status table stated that no provenance lock covered the installed converter. That was wrong: the lock had been written at 15:21, more than four hours before the check, and a re-listing of `~/.codex/skills/.provenance/` shows `book-to-skill.json` as its first entry. The corrected row is in §4. Nothing was overwritten as a result of the error — `write_provenance.py` refuses an existing output path, and that refusal is what surfaced the mistake.

## 2. Files this session created

### 2.1 Governed skill source — `tools/codex-skills/book-to-skill/`

22 files: the 19 audited upstream paths (one carrying the declared Windows encoding patch) plus three local overlay files.

| Path | Origin |
|---|---|
| `book_to_skill/` (17 files) | pinned upstream `c6bc1b79`; `utils.py` carries the declared patch |
| `scripts/extract.py` | pinned upstream |
| `tools/scan_generated_skill.py` | pinned upstream |
| `LICENSE.md` | pinned upstream (MIT) |
| `SKILL.md` | local overlay — Codex-native workflow |
| `agents/openai.yaml` | local overlay — Codex UI metadata |
| `scripts/install_generated_skill.py` | local overlay — guarded generated-skill installation |

### 2.2 Tests — `tests/codex_skills/`

| File | What it pins |
|---|---|
| `test_upstream_manifest.py` | per-path digests against the pinned commit, the single declared patch (both digests), the exact file set of the skill tree, symbolic-link rejection |
| `test_codex_skill_contract.py` | Codex/PowerShell-native workflow strings, frontmatter limited to `name` + `description`, gate ordering (scanner introduced before installer), UI metadata fields |
| `test_extraction_smoke.py` | extraction from a path with spaces, extraction from a Thai path with Thai chapter detection, the cp1252 regression, `--check` reporting every format |
| `test_generated_skill_installer.py` | new install, refusal of an existing target, explicit replacement with recoverable backup, rejection of a name that could escape the root, rejection of unexpected staged paths, scanner-blocked injection content, snapshot cleanup after refusal, symbolic-link refusal, CLI exit codes |
| `test_security_scan.py` | scanner exit codes 0/1/2 with rule id and line number, and a staged skill walked through scan → Codex validator → guarded install with a byte comparison |
| `test_installation_evidence.py` | the personal installation equals the governed source, tree-hash by tree-hash |
| `fixtures/english-guide.md`, `fixtures/คู่มือ-ตัวอย่าง.md` | the two extraction inputs |

### 2.3 A line-ending guard the plan did not anticipate

Staging the vendored tree surfaced a defect that would have made the byte pinning fail on the next clone. The pinned blobs are CRLF — and three lines of `book_to_skill/utils.py` are not, so the tree is not safely normalizable in either direction. This repository runs with `core.autocrlf=true` and carried no `.gitattributes`, so Git stored an LF-normalized copy and would restore CRLF on checkout:

```
$ git config core.autocrlf
true
$ git check-attr text eol -- tools/codex-skills/book-to-skill/book_to_skill/utils.py
…: text: unspecified
…: eol: unspecified
```

A fresh clone would then disagree with every digest recorded in the manifest test, and a redeploy from that clone would ship bytes other than the audited ones. `tools/codex-skills/.gitattributes` now freezes the tree with `book-to-skill/** -text`, and the index was rebuilt so the stored blobs are the audited bytes:

```
$ git check-attr text -- tools/codex-skills/book-to-skill/book_to_skill/utils.py
…: text: unset
$ git cat-file blob :tools/codex-skills/book-to-skill/book_to_skill/utils.py | sha256sum
368ef866089300bd…   (the declared patched digest)
$ git cat-file blob :tools/codex-skills/book-to-skill/tools/scan_generated_skill.py | sha256sum
1c075d1de29e4c15…   (the pinned upstream digest)
```

## 3. Test evidence

Command and complete summary, run from the parent root:

```
$ export BOOK_TO_SKILL_INSTALLED_DIR="C:/Users/thai3/.codex/skills/book-to-skill"
$ python -m pytest tests/codex_skills -v --basetemp="<scratch>/pytest-tmp"

platform win32 -- Python 3.14.2, pytest-8.4.2, pluggy-1.6.0
rootdir: C:\Users\thai3\determined-williams (2)
configfile: pyproject.toml
collected 29 items
... 29 PASSED ...
============================== 29 passed in 1.73s ==============================
EXIT=0
```

No test was skipped: the Codex validator was found at `~/.codex/skills/.system/skill-creator/scripts/quick_validate.py`, symbolic-link creation is permitted for this account, and `BOOK_TO_SKILL_INSTALLED_DIR` was supplied, so the three conditional tests all executed.

Red-before-green was recorded for the two claims where a passing test could otherwise be vacuous:

| Test | Recorded failure before the fix |
|---|---|
| `test_upstream_manifest.py` (5 of 6 tests) | ran against an empty target directory before vendoring |
| `test_thai_metadata_survives_a_non_utf8_locale` | ran against the pinned upstream `utils.py`; `UnicodeEncodeError: 'charmap' codec` at `utils.py:686`, returncode 1 |

## 4. Provenance and deployment equality

| Field | Value |
|---|---|
| Lock path | `C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json` |
| `auditedAt` | `2026-07-30T08:21:20.191044Z` |
| Revision | `c6bc1b7927822e563aae6212c07670f5a3d95ea7` |
| License | MIT |
| Files recorded | 22 |
| `treeSha256` | `0abcf03b633fb8edf36180f11047aa24720e151c642fa84168d30bf7e3cc8b34` |
| Local modifications recorded | 4 (the three overlay files and the `utils.py` patch) |
| Risk notes recorded | 4 (process, filesystem-write, network-on-approval, destructive replacement) |

```
$ python ~/.codex/skills/skill-installer/scripts/verify_provenance.py \
    'C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json'
PASS book-to-skill files=22 tree=0abcf03b633fb8edf36180f11047aa24720e151c642fa84168d30bf7e3cc8b34
EXIT=0
```

Two independent facts now hold together: the lock matches the installed tree (`verify_provenance.py`), and the installed tree matches the governed source (`test_personal_installation_matches_governed_source`). The lock was written before any test existed, so its summary line — "Pinned upstream runtime audited; Codex/Windows overlay reviewed and tested" — was ahead of its evidence at the time; the test suite in §3 is what now stands behind the word "tested".

The lock was left exactly as the earlier session wrote it. Its wording is narrower than this report in one place: it records the `utils.py` patch without the upstream digest it deviates from. That digest is pinned in `tests/codex_skills/test_upstream_manifest.py` instead, where a future upstream bump has to confront it.

## 5. Deviations from the plan

| Plan step | What was done instead | Why |
|---|---|---|
| Run tests with the Codex runtime interpreter (`…\codex-primary-runtime\dependencies\python\python.exe`) | Ran with the system interpreter, Python 3.14.2 | pytest is not installed in the Codex runtime, and installing it would be an unapproved dependency change. The system interpreter already carries pytest 8.4.2, and its locale codec is cp1252 — the same condition the regression test needs. |
| Default pytest temporary directory | Passed `--basetemp` into the session scratch directory | the sandbox denies access to `%LOCALAPPDATA%\Temp\pytest-of-thai3`, which aborts collection before any test runs |
| Task 1–5 order (test, then source, then deploy) | Source and tests written after a deployment that already existed | reconciliation of the pre-existing install; red-before-green was still recorded for both claims in §3 |
| Task 6 step 5 — write the provenance lock | Verified the existing lock and left it in place | the lock already existed with matching content; overwriting another session's audit record would destroy evidence to gain nothing |
| Commit per task | Nothing committed; paths staged only | committing is the owner's call |

## 6. Success criteria from the design

| # | Criterion | Status |
|---|---|---|
| 1 | Codex discovers the converter from `~/.codex/skills/book-to-skill` | layout satisfied — 22 files in place with `SKILL.md` frontmatter and `agents/openai.yaml`; discovery inside the Codex UI was not exercised from this session |
| 2 | `SKILL.md` provides Codex-native paths and PowerShell-usable commands | covered by `test_codex_skill_contract.py` (4 tests) |
| 3 | Extraction for PDF/EPUB/DOCX/TXT/Markdown/HTML/RTF uses the pinned implementation | partially verified — Markdown was exercised end to end in both languages; the other formats were audited as source only |
| 4 | Technical PDF uses Docling when installed; absent optional dependencies are reported, never auto-installed | verified for the reporting half (`--check`, exit 0, Docling shown as fallback); the Docling path itself was not exercised because the package is not installed |
| 5 | Windows paths with spaces and Thai characters are handled as literal paths | covered by three extraction tests and the Thai-path installer test |
| 6 | Generated skills are staged, scanned, and validated before installation | covered by `test_security_scan.py`, including the Codex validator returning `Skill is valid!` |
| 7 | No silent overwrite; replacement requires approval and leaves a recoverable backup | covered by two installer tests; approval itself is a workflow instruction, not a code gate |
| 8 | The installed converter matches a provenance lock | verified — `PASS`, 22 files, tree `0abcf03b…` |
| 9 | Contract, security, extraction, installation, and end-to-end tests pass with complete output | verified — 29 tests, exit code 0, summary in §3 |
| 10 | English and Thai documentation in Markdown and standalone HTML | delivered — this report, the audit report, and their Thai and HTML counterparts |

## 7. Repository state

```
$ git status --short --branch        # parent governance root
## guardrails/claim-linters
 M docs/superpowers/specs/2026-07-21-monolith-controlled-complete-document-set-design.en.md
?? tools/codex-skills/
?? tests/codex_skills/
… (pre-existing untracked entries omitted)

$ git -C determined-williams status --short --branch    # nested product root
## fix/dxf-truth-chain...origin/fix/dxf-truth-chain
 M daph-second-brain/_inventory.json
… (pre-existing changes, untouched by this work)
```

The nested root's modifications predate this session and none of the paths this session wrote fall inside it.

## 8. What remains unproven

- **Codex UI discovery and end-to-end use.** The skill directory has the right shape and passes the validator; nobody has yet run a real conversion through Codex Desktop on this machine.
- **Non-Markdown formats.** PDF, EPUB, DOCX, RTF, and MOBI extraction paths were read and hash-pinned, not executed against real documents.
- **Docling and Calibre paths.** Neither is installed, so `--mode technical` and MOBI/AZW conversion stay untested here.
- **Generated-skill fidelity.** Whether a generated skill faithfully represents its source book is a property of the summarizing model, and no test in this suite measures it.
- **Portability.** Every result above was produced on Windows 11 with Python 3.14.2 and cp1252 as the locale codec.
- **Third-party publication.** Generated skills from copyrighted books stay private by default; nothing here licenses distributing them.
