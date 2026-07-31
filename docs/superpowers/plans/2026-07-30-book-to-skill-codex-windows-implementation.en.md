# Book-to-Skill Codex/Windows Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, audit, test, and privately install a pinned `book-to-skill` overlay that Codex Desktop can use on this Windows workstation.

**Architecture:** Vendor only the required runtime bytes from upstream commit `c6bc1b7927822e563aae6212c07670f5a3d95ea7`, then add a small Codex instruction/UI overlay and a guarded generated-skill installer. Keep the governed source in the parent repository, deploy a verified copy to the personal Codex skills directory, and record the final installed tree in a provenance lock.

**Tech Stack:** Python 3.11+, pytest, Codex Agent Skills (`SKILL.md` and `agents/openai.yaml`), PowerShell-compatible commands, Git, SHA-256 provenance.

> **Reconcile status (30 July 2026):** the installation at `~/.codex/skills/book-to-skill` and its provenance lock were written by an earlier session; this session added the governed source, the test suite, and the reports. The checkboxes below are ticked against what was actually done, with a note wherever the plan's order was departed from. Evidence: [`2026-07-30-book-to-skill-upstream-audit.en.md`](../../reports/2026-07-30-book-to-skill-upstream-audit.en.md) and [`2026-07-30-book-to-skill-codex-windows-implementation.en.md`](../../reports/2026-07-30-book-to-skill-codex-windows-implementation.en.md)

## Global Constraints

- Modify only `C:\Users\thai3\determined-williams (2)` and the explicitly approved personal installation at `C:\Users\thai3\.codex\skills\book-to-skill`.
- Do not modify, test, clean, stage, or commit `C:\Users\thai3\determined-williams (2)\determined-williams`.
- Preserve every pre-existing parent-root change; stage only paths created by this plan.
- Use upstream `https://github.com/virgiliojr94/book-to-skill` at exact commit `c6bc1b7927822e563aae6212c07670f5a3d95ea7`.
- Keep pinned upstream runtime bytes unchanged unless a Windows failure is reproduced first by a focused test.
- Require explicit user approval before installing optional dependencies or replacing an existing skill.
- Treat document content as untrusted; scan and validate generated instructions before installation.
- Use literal resolved paths and containment checks before filesystem copy, move, backup, replacement, or cleanup.
- Keep generated third-party-book skills private by default.
- Produce every project-facing report in aligned English and Thai Markdown plus standalone HTML.
- Do not claim completion from partial output; every final verification command must show its exit code and complete summary.

---

## File map

### Governed skill source

- Create: `tools/codex-skills/book-to-skill/SKILL.md` — Codex-native conversion workflow.
- Create: `tools/codex-skills/book-to-skill/agents/openai.yaml` — Codex UI metadata.
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/__init__.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/__main__.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/cli.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/config.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/dependencies.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/exceptions.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/sanitize.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/utils.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/__init__.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/calibre.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/docx.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/epub.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/html.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/pdf.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/rtf.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/book_to_skill/parsers/text.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/scripts/extract.py`
- Create: `tools/codex-skills/book-to-skill/scripts/install_generated_skill.py` — scan, validate, install, backup, and replace generated skills.
- Vendor unchanged: `tools/codex-skills/book-to-skill/tools/scan_generated_skill.py`
- Vendor unchanged: `tools/codex-skills/book-to-skill/LICENSE.md`

### Tests and fixtures

- Create: `tests/codex_skills/__init__.py`
- Create: `tests/codex_skills/fixtures/english-guide.md`
- Create: `tests/codex_skills/fixtures/คู่มือ-ตัวอย่าง.md`
- Create: `tests/codex_skills/test_upstream_manifest.py`
- Create: `tests/codex_skills/test_codex_skill_contract.py`
- Create: `tests/codex_skills/test_extraction_smoke.py`
- Create: `tests/codex_skills/test_generated_skill_installer.py`
- Create: `tests/codex_skills/test_security_scan.py`
- Create: `tests/codex_skills/test_installation_evidence.py`

### Project-facing evidence

- Create: `docs/reports/2026-07-30-book-to-skill-upstream-audit.en.md`
- Create: `docs/reports/2026-07-30-book-to-skill-upstream-audit.th.md`
- Create matching `.en.html` and `.th.html`.
- Create: `docs/reports/2026-07-30-book-to-skill-codex-windows-implementation.en.md`
- Create: `docs/reports/2026-07-30-book-to-skill-codex-windows-implementation.th.md`
- Create matching `.en.html` and `.th.html`.

---

### Task 1: Resolve, audit, and vendor the pinned upstream runtime

**Files:**

- Create the pinned runtime and license files listed in the governed skill source map.
- Create: `tests/codex_skills/test_upstream_manifest.py`
- Create: `docs/reports/2026-07-30-book-to-skill-upstream-audit.en.md`
- Create: `docs/reports/2026-07-30-book-to-skill-upstream-audit.th.md`
- Create matching HTML editions.

**Interfaces:**

- Consumes: upstream repository and exact 40-character commit.
- Produces: `UPSTREAM_FILES: tuple[str, ...]` in the test and a byte-identical governed runtime tree used by every later task.

- [x] **Step 1: Re-check both Git roots**

Run:

```powershell
$Git = 'C:\Users\thai3\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe'
& $Git -c 'safe.directory=C:/Users/thai3/determined-williams (2)' status --short --branch
& $Git -c 'safe.directory=C:/Users/thai3/determined-williams (2)/determined-williams' -C 'C:\Users\thai3\determined-williams (2)\determined-williams' status --short --branch
```

Expected: two separate status reports. Record them in the audit report; make no nested-root changes.

- [x] **Step 2: Fetch only the exact upstream commit into an isolated temporary repository** — used the Git Bash git binary instead of the Codex runtime path; rev-parse returned the pinned `c6bc1b79`

Run:

```powershell
$AuditRoot = Join-Path ([IO.Path]::GetTempPath()) ('book-to-skill-audit-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -LiteralPath $AuditRoot | Out-Null
& $Git -C $AuditRoot init
& $Git -C $AuditRoot remote add origin 'https://github.com/virgiliojr94/book-to-skill.git'
& $Git -C $AuditRoot fetch --depth 1 origin 'c6bc1b7927822e563aae6212c07670f5a3d95ea7'
& $Git -C $AuditRoot rev-parse FETCH_HEAD
```

Expected final line:

```text
c6bc1b7927822e563aae6212c07670f5a3d95ea7
```

- [x] **Step 3: Enumerate and audit the complete candidate source**

Run:

```powershell
& $Git -C $AuditRoot ls-tree -r --name-only FETCH_HEAD
& $Git -C $AuditRoot show 'FETCH_HEAD:SKILL.md'
& $Git -C $AuditRoot show 'FETCH_HEAD:scripts/extract.py'
& $Git -C $AuditRoot show 'FETCH_HEAD:tools/scan_generated_skill.py'
& $Git -C $AuditRoot show 'FETCH_HEAD:book_to_skill/utils.py'
& $Git -C $AuditRoot show 'FETCH_HEAD:book_to_skill/dependencies.py'
```

Then read every remaining `book_to_skill/*.py` and `book_to_skill/parsers/*.py` file in full. Record subprocess use, optional package installation, filesystem writes, temporary cleanup, network behavior, environment access, dynamic evaluation, symlink behavior, and destructive operations. Reject the source if any installed byte remains unread or unclassified.

- [x] **Step 4: Write the manifest test before copying source bytes**

Create `tests/codex_skills/test_upstream_manifest.py`:

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "tools" / "codex-skills" / "book-to-skill"

UPSTREAM_FILES = (
    "LICENSE.md",
    "book_to_skill/__init__.py",
    "book_to_skill/__main__.py",
    "book_to_skill/cli.py",
    "book_to_skill/config.py",
    "book_to_skill/dependencies.py",
    "book_to_skill/exceptions.py",
    "book_to_skill/sanitize.py",
    "book_to_skill/utils.py",
    "book_to_skill/parsers/__init__.py",
    "book_to_skill/parsers/calibre.py",
    "book_to_skill/parsers/docx.py",
    "book_to_skill/parsers/epub.py",
    "book_to_skill/parsers/html.py",
    "book_to_skill/parsers/pdf.py",
    "book_to_skill/parsers/rtf.py",
    "book_to_skill/parsers/text.py",
    "scripts/extract.py",
    "tools/scan_generated_skill.py",
)


def test_required_upstream_runtime_is_present() -> None:
    missing = [relative for relative in UPSTREAM_FILES if not (SKILL / relative).is_file()]
    assert missing == []
```

- [x] **Step 5: Run the manifest test and observe RED** — 5 of 6 tests FAILED against the empty target

Run:

```powershell
$Python = 'C:\Users\thai3\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $Python -m pytest tests/codex_skills/test_upstream_manifest.py -v
```

Expected: FAIL with the required upstream paths reported as missing.

- [x] **Step 6: Copy only the audited runtime bytes from the pinned checkout**

Use `git show FETCH_HEAD:<path>` or a detached worktree to copy the exact files in `UPSTREAM_FILES` to `tools/codex-skills/book-to-skill/`. Do not copy upstream README, docs, CI, cache files, tests, banners, or repository metadata.

- [x] **Step 7: Verify GREEN and compare every governed upstream byte with Git** — GREEN 6/6 and digests match Git for all 19 paths (18 byte-identical + 1 declared patch)

Run:

```powershell
& $Python -m pytest tests/codex_skills/test_upstream_manifest.py -v
```

Expected: `1 passed`.

For every path in `UPSTREAM_FILES`, compare the governed file's SHA-256 with the bytes returned by `git show FETCH_HEAD:<path>`. Expected: zero missing, extra, or mismatched upstream runtime files.

- [x] **Step 8: Write and render the bilingual upstream audit** — audit report EN/TH + HTML at `docs/reports/2026-07-30-book-to-skill-upstream-audit.*`

Record the exact repository, commit, selected paths, license, audit date, observed powerful behavior, rejected capabilities, and byte-comparison result. Render with:

```powershell
& $Python tools/render_docs.py `
  docs/reports/2026-07-30-book-to-skill-upstream-audit.en.md `
  docs/reports/2026-07-30-book-to-skill-upstream-audit.th.md
```

Expected: two standalone HTML files.

- [ ] **Step 9: Commit Task 1** — reconcile: staged, not committed (owner's call)

Stage only the Task 1 paths and run:

```powershell
& $Git commit -m 'chore(codex): vendor audited book-to-skill runtime'
```

Expected: one commit containing only the pinned runtime, manifest test, and bilingual audit.

---

### Task 2: Create the Codex-native instruction and interface overlay

**Files:**

- Create: `tools/codex-skills/book-to-skill/SKILL.md`
- Create: `tools/codex-skills/book-to-skill/agents/openai.yaml`
- Create: `tests/codex_skills/test_codex_skill_contract.py`

**Interfaces:**

- Consumes: pinned `scripts/extract.py`, `tools/scan_generated_skill.py`, and the approved design.
- Produces: a discoverable `book-to-skill` Agent Skill with frontmatter fields `name` and `description`.

- [ ] **Step 1: Restore upstream `SKILL.md` as the RED baseline** — reconcile: the overlay was written by an earlier session at 14:42, so no RED baseline was staged

Copy the pinned upstream `SKILL.md` into the governed skill directory. This baseline is temporary and must be replaced after the contract test demonstrates the compatibility gap.

- [x] **Step 2: Write the failing Codex contract test** — test added, but GREEN on the first run because the overlay already existed

Create `tests/codex_skills/test_codex_skill_contract.py`:

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILL_MD = ROOT / "tools" / "codex-skills" / "book-to-skill" / "SKILL.md"


def test_required_workflow_is_codex_and_powershell_native() -> None:
    text = SKILL_MD.read_text(encoding="utf-8")
    required = (
        "CODEX_HOME",
        ".codex",
        "scripts/extract.py",
        "tools/scan_generated_skill.py",
        "scripts/install_generated_skill.py",
        "explicit approval",
        "staging",
    )
    assert [value for value in required if value not in text] == []

    forbidden_required_forms = ("mkdir -p", "grep -", "sed -", "wc -", "$HOME/")
    assert [value for value in forbidden_required_forms if value in text] == []


def test_frontmatter_has_only_name_and_description() -> None:
    text = SKILL_MD.read_text(encoding="utf-8")
    frontmatter = text.split("---", 2)[1]
    keys = {
        line.split(":", 1)[0].strip()
        for line in frontmatter.splitlines()
        if ":" in line
    }
    assert keys == {"name", "description"}
    assert "description: Use when" in text
```

- [ ] **Step 3: Run the contract test and observe RED** — reconcile: skipped for the same reason as step 1

Run:

```powershell
& $Python -m pytest tests/codex_skills/test_codex_skill_contract.py -v
```

Expected: failures showing missing Codex paths and Bash-only required forms.

- [x] **Step 4: Replace the baseline with the minimal Codex-native `SKILL.md`** — written by the earlier session at 14:42; read in full and audited here

Write an imperative workflow under 500 lines with:

- literal-path input validation;
- content-type selection;
- dependency preflight using `scripts/extract.py --check`;
- extraction using `--mode technical|text --install-missing no`;
- metadata and cost/size report;
- explicit approval gates;
- staged generation;
- scanner and validator gates;
- guarded installation using `scripts/install_generated_skill.py`;
- private-by-default copyright guidance; and
- failure reporting that distinguishes processed and skipped sources.

Do not embed Bash-variable discovery loops or assume slash-command invocation.

- [x] **Step 5: Generate `agents/openai.yaml` deterministically** — written by the earlier session at 14:43

First read `C:\Users\thai3\.codex\skills\.system\skill-creator\references\openai_yaml.md`. Then run the system generator with:

```text
display_name=Book to Skill
short_description=Convert documents into reusable Codex skills
default_prompt=Use $book-to-skill to convert my documents into a staged, scanned, and validated private Codex skill.
```

- [x] **Step 6: Verify GREEN and validate the skill** — contract tests 4/4 GREEN and `quick_validate.py` returned `Skill is valid!`

Run:

```powershell
& $Python -m pytest tests/codex_skills/test_codex_skill_contract.py -v
& $Python 'C:\Users\thai3\.codex\skills\.system\skill-creator\scripts\quick_validate.py' `
  'tools/codex-skills/book-to-skill'
```

Expected: contract tests pass and validator prints `Skill is valid!`.

- [ ] **Step 7: Commit Task 2** — reconcile: staged, not committed (owner's call)

```powershell
& $Git commit -m 'feat(codex): add native book-to-skill workflow'
```

Expected: one commit containing only the Codex instruction/interface overlay and its contract tests.

---

### Task 3: Characterize extraction on English and Thai Windows paths

**Files:**

- Create: `tests/codex_skills/fixtures/english-guide.md`
- Create: `tests/codex_skills/fixtures/คู่มือ-ตัวอย่าง.md`
- Create: `tests/codex_skills/test_extraction_smoke.py`

**Interfaces:**

- Consumes: `scripts/extract.py`.
- Produces: extraction evidence in an isolated `BOOK_SKILL_WORKDIR` containing `full_text.txt` and `metadata.json`.

- [x] **Step 1: Create representative fixtures**

The English fixture must contain `# Practical Guide`, `## Planning`, and `## Verification`. The Thai fixture must contain `# คู่มือทดสอบ`, `บทที่ ๑ การเตรียมงาน`, and `บทที่ ๒ การตรวจผล`.

- [x] **Step 2: Write the extraction smoke test**

```python
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXTRACT = ROOT / "tools" / "codex-skills" / "book-to-skill" / "scripts" / "extract.py"
FIXTURES = Path(__file__).parent / "fixtures"


def run_extract(source: Path, workdir: Path) -> tuple[str, dict]:
    env = os.environ.copy()
    env["BOOK_SKILL_WORKDIR"] = str(workdir)
    result = subprocess.run(
        [sys.executable, str(EXTRACT), str(source), "--mode", "text", "--install-missing", "no"],
        cwd=ROOT,
        env=env,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return (
        (workdir / "full_text.txt").read_text(encoding="utf-8"),
        json.loads((workdir / "metadata.json").read_text(encoding="utf-8")),
    )


def test_extracts_english_markdown_from_path_with_spaces(tmp_path: Path) -> None:
    source_dir = tmp_path / "source with spaces"
    source_dir.mkdir()
    source = source_dir / "english guide.md"
    source.write_bytes((FIXTURES / "english-guide.md").read_bytes())
    text, metadata = run_extract(source, tmp_path / "work english")
    assert "Practical Guide" in text
    assert metadata["total_sources"] == 1


def test_extracts_thai_markdown_and_detects_thai_chapters(tmp_path: Path) -> None:
    source_dir = tmp_path / "เอกสาร ทดสอบ"
    source_dir.mkdir()
    source = source_dir / "คู่มือ-ตัวอย่าง.md"
    source.write_bytes((FIXTURES / "คู่มือ-ตัวอย่าง.md").read_bytes())
    text, metadata = run_extract(source, tmp_path / "งานชั่วคราว")
    assert "บทที่ ๑ การเตรียมงาน" in text
    assert metadata["chapters_detected"] == 2
```

- [x] **Step 3: Run the smoke tests** — extraction smoke 4/4, including the cp1252 regression

```powershell
& $Python -m pytest tests/codex_skills/test_extraction_smoke.py -v
```

Expected: both tests pass. If either fails, keep the failing test, identify the pinned runtime defect, and patch only the responsible upstream file; record that file as a local modification.

- [x] **Step 4: Run dependency preflight** — exit 0; the matrix is recorded in audit report section 7

```powershell
& $Python tools/codex-skills/book-to-skill/scripts/extract.py --check
```

Expected: exit 0 and a complete per-format report. Keep this step in report-only mode and classify each extractor as `present`, `fallback`, or `required`.

The recorded matrix must contain separate evidence for text PDF (`pdftotext`, `pypdf`, or `pdfminer`), technical PDF (`Docling`), EPUB, DOCX, HTML, RTF, and Calibre-based MOBI/AZW handling. Record `fallback` status as a capability limit.

- [ ] **Step 5: Commit Task 3** — reconcile: staged, not committed (owner's call)

```powershell
& $Git commit -m 'test(codex): cover English and Thai extraction paths'
```

---

### Task 4: Implement guarded generated-skill installation with TDD

**Files:**

- Create: `tests/codex_skills/test_generated_skill_installer.py`
- Create: `tools/codex-skills/book-to-skill/scripts/install_generated_skill.py`

**Interfaces:**

- Produces:
  - `InstallError(RuntimeError)`
  - `read_skill_name(source: Path) -> str`
  - `install_skill(source: Path, skills_root: Path, *, replace: bool) -> dict[str, str]`
  - CLI arguments: `source`, `--skills-root`, `--replace`

- [x] **Step 1: Write RED tests for new installation and existing-target refusal** — tests added; the installer already existed, so the `FileNotFoundError` RED was not recorded

```python
from pathlib import Path
import importlib.util
import pytest

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "tools" / "codex-skills" / "book-to-skill" / "scripts" / "install_generated_skill.py"


def load_installer():
    spec = importlib.util.spec_from_file_location("generated_skill_installer", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def make_skill(root: Path, name: str, body: str = "# Knowledge\n") -> Path:
    source = root / "staging source"
    source.mkdir(parents=True)
    (source / "SKILL.md").write_text(
        f'---\nname: {name}\ndescription: "Use when testing generated knowledge."\n---\n\n{body}',
        encoding="utf-8",
    )
    return source


def test_installs_new_skill_with_thai_source_path(tmp_path: Path) -> None:
    module = load_installer()
    source = make_skill(tmp_path / "พื้นที่ ไทย", "thai-knowledge")
    report = module.install_skill(source, tmp_path / "skills", replace=False)
    assert Path(report["installed"]).name == "thai-knowledge"
    assert (tmp_path / "skills" / "thai-knowledge" / "SKILL.md").is_file()


def test_refuses_existing_target_without_replace(tmp_path: Path) -> None:
    module = load_installer()
    source = make_skill(tmp_path / "source", "existing-skill")
    target = tmp_path / "skills" / "existing-skill"
    target.mkdir(parents=True)
    with pytest.raises(module.InstallError, match="already exists"):
        module.install_skill(source, tmp_path / "skills", replace=False)
```

- [ ] **Step 2: Run RED** — reconcile: skipped because `MODULE_PATH` had existed since 14:51

```powershell
& $Python -m pytest tests/codex_skills/test_generated_skill_installer.py -v
```

Expected: pytest reports `FileNotFoundError` while loading `MODULE_PATH`, demonstrating that the test reaches the future installer boundary.

- [x] **Step 3: Implement the minimal installer** — written by the earlier session at 14:51; the installed version is stricter than the plan's sample (snapshot before scan, layout allowlist, case-collision check)

Implement:

```python
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class InstallError(RuntimeError):
    pass


def read_skill_name(source: Path) -> str:
    skill_md = source / "SKILL.md"
    if not skill_md.is_file() or skill_md.is_symlink():
        raise InstallError("staged skill must contain a regular SKILL.md")
    text = skill_md.read_text(encoding="utf-8-sig")
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        raise InstallError("SKILL.md frontmatter is invalid")
    name_match = re.search(r"^name:\s*([a-z0-9-]+)\s*$", match.group(1), re.MULTILINE)
    if not name_match or not NAME_RE.fullmatch(name_match.group(1)):
        raise InstallError("skill name must be lowercase hyphen-case")
    return name_match.group(1)


def _reject_links(root: Path) -> None:
    if root.is_symlink():
        raise InstallError("staged skill must not be a symbolic link")
    for path in root.rglob("*"):
        if path.is_symlink():
            raise InstallError(f"staged skill contains a symbolic link: {path.name}")


def _scan(source: Path) -> None:
    scanner = Path(__file__).resolve().parents[1] / "tools" / "scan_generated_skill.py"
    result = subprocess.run(
        [sys.executable, str(scanner), str(source)],
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise InstallError("generated-skill scan blocked installation\n" + result.stdout + result.stderr)


def install_skill(
    source: Path,
    skills_root: Path,
    *,
    replace: bool,
) -> dict[str, str]:
    source = source.expanduser().resolve(strict=True)
    if not source.is_dir():
        raise InstallError("staged skill path must be a directory")
    _reject_links(source)
    name = read_skill_name(source)
    _scan(source)

    requested_root = skills_root.expanduser()
    if requested_root.exists() and requested_root.is_symlink():
        raise InstallError("skills root must not be a symbolic link")
    root = requested_root.resolve(strict=False)
    root.mkdir(parents=True, exist_ok=True)
    target = root / name
    if target.parent != root:
        raise InstallError("destination escaped the selected skills root")
    if target.is_symlink():
        raise InstallError("existing destination must not be a symbolic link")
    if target.exists() and not replace:
        raise InstallError(f"destination already exists: {target}")

    temporary = root / f".{name}.install-{uuid.uuid4().hex}"
    backup = None
    try:
        shutil.copytree(source, temporary)
        if target.exists():
            chosen_backup_root = root / ".backups"
            if chosen_backup_root.exists() and chosen_backup_root.is_symlink():
                raise InstallError("backup root must not be a symbolic link")
            chosen_backup_root.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            backup = chosen_backup_root / f"{name}-{stamp}"
            if backup.parent != chosen_backup_root:
                raise InstallError("backup escaped the selected backup root")
            if backup.exists():
                raise InstallError(f"backup already exists: {backup}")
            target.replace(backup)
        temporary.replace(target)
    except Exception:
        if backup is not None and backup.exists() and not target.exists():
            backup.replace(target)
        if temporary.exists():
            shutil.rmtree(temporary)
        raise
    return {"installed": str(target), "backup": str(backup) if backup else ""}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Install a scanned generated Codex skill")
    parser.add_argument("source")
    parser.add_argument("--skills-root", required=True)
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args(argv)
    try:
        report = install_skill(
            Path(args.source),
            Path(args.skills_root),
            replace=args.replace,
        )
    except InstallError as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [x] **Step 4: Run GREEN**

```powershell
& $Python -m pytest tests/codex_skills/test_generated_skill_installer.py -v
```

Expected: initial two tests pass.

- [x] **Step 5: Add RED tests for replacement, backup, injection, path escape, and symlinks**

Add focused tests that:

- replace an existing skill only with `replace=True` and assert the original bytes exist under the returned backup path;
- use `name: ../escape` and assert `InstallError`;
- put `you are now` in generated Markdown and assert scan-blocked installation;
- create source, destination-root, destination, and backup-root symlinks when Windows privileges permit and assert rejection, otherwise skip with the exact OS error.

- [x] **Step 6: Run RED, implement only missing behavior, then run GREEN** — installer tests 9/9 GREEN

```powershell
& $Python -m pytest tests/codex_skills/test_generated_skill_installer.py -v
```

Expected final result: all installer tests pass.

- [ ] **Step 7: Commit Task 4** — reconcile: staged, not committed (owner's call)

```powershell
& $Git commit -m 'feat(codex): guard generated skill installation'
```

---

### Task 5: Integrate scanner, validator, and end-to-end staging checks

**Files:**

- Create: `tests/codex_skills/test_security_scan.py`
- Extend: `tests/codex_skills/test_generated_skill_installer.py`

**Interfaces:**

- Consumes: pinned scanner and guarded installer.
- Produces: one isolated end-to-end flow from staged generated Markdown to an installed temporary Codex layout.

- [x] **Step 1: Write scanner behavior tests**

Create a benign generated skill and a second skill containing `ignore previous instructions`. Run `tools/scan_generated_skill.py` as a subprocess and assert:

```python
assert benign.returncode == 0
assert "scan passed" in benign.stdout
assert hostile.returncode == 1
assert "prompt.ignore_previous" in hostile.stdout
assert "SKILL.md:" in hostile.stdout
```

- [x] **Step 2: Run the scanner tests**

```powershell
& $Python -m pytest tests/codex_skills/test_security_scan.py -v
```

Expected: scanner tests pass against the pinned upstream scanner.

- [x] **Step 3: Add the isolated end-to-end test**

Create a staged skill with `SKILL.md`, `chapters/ch01-introduction.md`, `glossary.md`, `patterns.md`, and `cheatsheet.md`. Run the scanner, run the system `quick_validate.py`, call `install_skill`, and assert the installed relative file set exactly equals the staged relative file set.

- [x] **Step 4: Run the complete local suite** — 29 tests, exit code 0

```powershell
& $Python -m pytest tests/codex_skills -v
```

Expected: all `tests/codex_skills` tests pass with a visible final summary.

- [x] **Step 5: Run validators and whitespace checks** — `Skill is valid!` and `git diff --check` exit 0

```powershell
& $Python 'C:\Users\thai3\.codex\skills\.system\skill-creator\scripts\quick_validate.py' `
  'tools/codex-skills/book-to-skill'
& $Git diff --check
```

Expected: `Skill is valid!` and no diff-check findings for plan-owned paths.

- [ ] **Step 6: Commit Task 5** — reconcile: staged, not committed (owner's call)

```powershell
& $Git commit -m 'test(codex): verify staged book skill workflow'
```

---

### Task 6: Deploy the converter and write its provenance lock

**Files:**

- Create outside the repository: `C:\Users\thai3\.codex\skills\book-to-skill\**`
- Create outside the repository: `C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json`
- Create: `tests/codex_skills/test_installation_evidence.py`

**Interfaces:**

- Consumes: governed skill tree after Task 5.
- Produces: verified personal installation and provenance lock.

- [x] **Step 1: Write the installed-tree comparison test**

```python
import os
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools" / "codex-skills" / "book-to-skill"


def tree(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file() and "__pycache__" not in path.parts
    }


def test_personal_installation_matches_governed_source() -> None:
    installed = Path(os.environ["BOOK_TO_SKILL_INSTALLED_DIR"]).resolve(strict=True)
    assert tree(installed) == tree(SOURCE)
```

- [x] **Step 2: Confirm the target is still absent** — the existing target was found, hash-compared across all 22 files, and left in place

Run a literal-path check for `C:\Users\thai3\.codex\skills\book-to-skill`. If it now exists, stop and compare it; do not replace it without a new explicit user decision.

- [ ] **Step 3: Copy the governed tree to the personal Codex directory** — reconcile: the installation predates this session, so equality is proven by `test_installation_evidence.py` instead of a fresh copy

Use a temporary sibling directory, compare its hashes with the governed tree, and rename it to `book-to-skill`. Do not copy `__pycache__`, `.pytest_cache`, or test artifacts.

- [x] **Step 4: Verify installed bytes** — 1 passed (plus one symlink/repository check)

```powershell
$env:BOOK_TO_SKILL_INSTALLED_DIR = 'C:\Users\thai3\.codex\skills\book-to-skill'
& $Python -m pytest tests/codex_skills/test_installation_evidence.py -v
```

Expected: `1 passed`.

- [ ] **Step 5: Write the provenance lock** — reconcile: the lock was written by the earlier session at 15:21; `write_provenance.py` refused to overwrite and the original was left intact

Run:

```powershell
& $Python 'C:\Users\thai3\.codex\skills\skill-installer\scripts\write_provenance.py' `
  --skill-name book-to-skill `
  --skill-dir 'C:\Users\thai3\.codex\skills\book-to-skill' `
  --output 'C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json' `
  --repository 'https://github.com/virgiliojr94/book-to-skill' `
  --source-url 'https://github.com/virgiliojr94/book-to-skill/tree/c6bc1b7927822e563aae6212c07670f5a3d95ea7' `
  --revision 'c6bc1b7927822e563aae6212c07670f5a3d95ea7' `
  --source-path '/' `
  --license 'MIT' `
  --audit-summary 'Pinned upstream runtime audited; Codex/Windows overlay reviewed and tested.' `
  --risk-note 'process: invokes local document extractors' `
  --risk-note 'filesystem-write: writes staged and explicitly approved personal skills' `
  --risk-note 'dependency: optional packages require explicit approval' `
  --local-modification 'SKILL.md: Codex-native workflow' `
  --local-modification 'agents/openai.yaml: Codex UI metadata' `
  --local-modification 'scripts/install_generated_skill.py: guarded generated-skill installation'
```

Expected: `WROTE`, `FILES`, and `TREE_SHA256` lines.

- [x] **Step 6: Verify the provenance lock and smoke-test installed executables** — `verify_provenance` PASS, `extract.py --check` exit 0, installer `--help` exit 0

```powershell
& $Python 'C:\Users\thai3\.codex\skills\skill-installer\scripts\verify_provenance.py' `
  'C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json'
& $Python 'C:\Users\thai3\.codex\skills\book-to-skill\scripts\extract.py' --check
& $Python 'C:\Users\thai3\.codex\skills\book-to-skill\scripts\install_generated_skill.py' --help
```

Expected: a `PASS book-to-skill` provenance line, complete dependency report, and installer help.

---

### Task 7: Produce bilingual implementation evidence and run the final gate

**Files:**

- Create: `docs/reports/2026-07-30-book-to-skill-codex-windows-implementation.en.md`
- Create: `docs/reports/2026-07-30-book-to-skill-codex-windows-implementation.th.md`
- Create matching HTML editions.

**Interfaces:**

- Consumes: fresh outputs from Tasks 1–6.
- Produces: aligned project-facing evidence and final repository commit.

- [x] **Step 1: Run fresh verification with complete output** — 29 passed, provenance PASS, `git diff --check` exit 0

```powershell
& $Python -m pytest tests/codex_skills -v
& $Python 'C:\Users\thai3\.codex\skills\.system\skill-creator\scripts\quick_validate.py' `
  'tools/codex-skills/book-to-skill'
& $Python 'C:\Users\thai3\.codex\skills\skill-installer\scripts\verify_provenance.py' `
  'C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json'
& $Git diff --check
```

Expected: visible pytest pass count, `Skill is valid!`, provenance `PASS`, and no diff-check output for plan-owned paths.

- [x] **Step 2: Re-check both Git roots**

Record current parent and nested status separately. Confirm the nested differences were not changed by this work.

- [x] **Step 3: Write aligned EN/TH implementation reports**

Include:

- exact upstream repository and commit;
- audited and locally modified file lists;
- installed path and provenance-lock path;
- detected optional extractors;
- test command identities and complete final summaries;
- unsupported or unverified document cases;
- copyright, cloud-model, and prompt-injection residual risks; and
- explicit parent-root versus nested-root scope.

- [x] **Step 4: Render and inspect standalone HTML** — charset utf-8, `lang` en/th, h2 counts match the Markdown

```powershell
& $Python tools/render_docs.py `
  docs/reports/2026-07-30-book-to-skill-codex-windows-implementation.en.md `
  docs/reports/2026-07-30-book-to-skill-codex-windows-implementation.th.md
```

Expected: both HTML files contain UTF-8 metadata, the correct `lang` attribute, and the same numbered sections as their Markdown editions.

- [x] **Step 5: Run plan self-review and requirement coverage** — `lint_claims.py` and `lint_certifications.py` exit 0 across all four reports

Verify all ten success criteria from the approved design against a Task and fresh evidence. Run the repository's placeholder checks over plan-owned documents; expected result: no findings.

- [ ] **Step 6: Commit the final implementation evidence** — reconcile: staged; the commit is the owner's call

Stage only plan-owned source, tests, and reports, then run:

```powershell
& $Git commit -m 'docs(codex): record book-to-skill installation evidence'
```

Expected: final commit without unrelated parent-root files.

## Execution handoff

The current thread policy does not authorize subagent dispatch unless the user explicitly requests it. The compliant default is **Inline Execution** using `executing-plans`, with checkpoints after each task and no changes to the nested product repository.
