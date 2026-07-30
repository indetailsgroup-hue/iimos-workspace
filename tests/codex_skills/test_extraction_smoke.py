"""Characterization tests for the pinned extractor on Windows paths.

Two properties are load-bearing for this machine and neither is covered by the
upstream suite:

* input paths carry spaces and Thai characters, so any place the extractor
  builds a command string instead of an argument array breaks here first;
* the process encoding is a legacy code page (cp1252 on this host), so any
  `write_text` without an explicit encoding raises UnicodeEncodeError the
  moment a document contains non-Latin text.

The second property is the whole justification for the one declared patch to
`book_to_skill/utils.py` — see `test_upstream_manifest.PATCHED_FILES`. The
regression test below pins the *unpatched* upstream line as a real failure so
the patch can never be quietly reverted during an upstream update.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "tools" / "codex-skills" / "book-to-skill"
EXTRACT = SKILL / "scripts" / "extract.py"
FIXTURES = Path(__file__).parent / "fixtures"


def run_extract(
    source: Path,
    workdir: Path,
    *,
    force_legacy_encoding: bool = False,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["BOOK_SKILL_WORKDIR"] = str(workdir)
    if force_legacy_encoding:
        # Defeat UTF-8 mode if a future interpreter enables it by default, so
        # the locale-encoding regression stays reproducible.
        env["PYTHONUTF8"] = "0"
    return subprocess.run(
        [
            sys.executable,
            str(EXTRACT),
            str(source),
            "--mode",
            "text",
            "--install-missing",
            "no",
        ],
        cwd=ROOT,
        env=env,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )


def extracted(workdir: Path) -> tuple[str, dict]:
    return (
        (workdir / "full_text.txt").read_text(encoding="utf-8"),
        json.loads((workdir / "metadata.json").read_text(encoding="utf-8")),
    )


def test_extracts_english_markdown_from_path_with_spaces(tmp_path: Path) -> None:
    source_dir = tmp_path / "source with spaces"
    source_dir.mkdir()
    source = source_dir / "english guide.md"
    source.write_bytes((FIXTURES / "english-guide.md").read_bytes())

    workdir = tmp_path / "work english"
    result = run_extract(source, workdir)
    assert result.returncode == 0, result.stdout + result.stderr

    text, metadata = extracted(workdir)
    assert "Practical Guide" in text
    assert metadata["total_sources"] == 1
    assert metadata["chapters_detected"] == 2


def test_extracts_thai_markdown_and_detects_thai_chapters(tmp_path: Path) -> None:
    source_dir = tmp_path / "เอกสาร ทดสอบ"
    source_dir.mkdir()
    source = source_dir / "คู่มือ-ตัวอย่าง.md"
    source.write_bytes((FIXTURES / "คู่มือ-ตัวอย่าง.md").read_bytes())

    workdir = tmp_path / "งานชั่วคราว"
    result = run_extract(source, workdir)
    assert result.returncode == 0, result.stdout + result.stderr

    text, metadata = extracted(workdir)
    assert "บทที่ ๑ การเตรียมงาน" in text
    assert metadata["total_sources"] == 1
    assert metadata["chapters_detected"] == 2


def test_thai_metadata_survives_a_non_utf8_locale(tmp_path: Path) -> None:
    """The declared utils.py patch, expressed as a failing-without-it test.

    metadata.json embeds the source path verbatim with `ensure_ascii=False`. On
    a cp1252 host the unpatched `OUTPUT_META.write_text(...)` call encodes with
    the locale codec and dies on the first Thai character, after a successful
    extraction — a late, confusing failure. Revert the patch and this test goes
    red with UnicodeEncodeError.
    """
    source_dir = tmp_path / "เอกสาร ทดสอบ"
    source_dir.mkdir()
    source = source_dir / "คู่มือ-ตัวอย่าง.md"
    source.write_bytes((FIXTURES / "คู่มือ-ตัวอย่าง.md").read_bytes())

    workdir = tmp_path / "งาน locale"
    result = run_extract(source, workdir, force_legacy_encoding=True)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UnicodeEncodeError" not in result.stderr

    raw = (workdir / "metadata.json").read_bytes()
    assert "คู่มือ-ตัวอย่าง.md".encode("utf-8") in raw
    metadata = json.loads(raw.decode("utf-8"))
    assert metadata["filename"] == "คู่มือ-ตัวอย่าง.md"


def test_dependency_check_reports_every_format_without_installing() -> None:
    result = subprocess.run(
        [sys.executable, str(EXTRACT), "--check"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    report = result.stdout + result.stderr
    for expected in ("PDF", "EPUB", "DOCX", "RTF", "HTML"):
        assert expected in report
