"""Characterization tests for the pinned extractor on Windows paths.

Two properties are load-bearing for this machine and neither is covered by the
upstream suite:

* input paths carry spaces and Thai characters, so any place the extractor
  builds a command string instead of an argument array breaks here first;
* the process encoding is a legacy code page (cp1252 on this host), so any
  `write_text` without an explicit encoding raises UnicodeEncodeError the
  moment a document contains non-Latin text.

A third property was found while converting a Häfele hardware catalogue: the
`pdftotext` branch asked poppler for its default encoding, which is Latin-1, and
decoded the result as UTF-8 with errors="replace".

Those last two properties are the justification for the two declared patches in
`test_upstream_manifest.PATCHED_FILES`. The regression tests below pin the
*unpatched* upstream lines as real failures, so neither patch can be quietly
reverted during an upstream update.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "tools" / "codex-skills" / "book-to-skill"
EXTRACT = SKILL / "scripts" / "extract.py"
FIXTURES = Path(__file__).parent / "fixtures"

# The extractor shells out to optional third-party backends. A missing or wedged
# backend must fail the run, not hang the suite behind a pipe that never closes.
SUBPROCESS_TIMEOUT = 30


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
        timeout=SUBPROCESS_TIMEOUT,
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


@pytest.mark.skipif(shutil.which("pdftotext") is None, reason="pdftotext is not on PATH")
def test_pdftotext_path_preserves_non_ascii_characters(tmp_path: Path) -> None:
    """The second declared patch, expressed as a failing-without-it test.

    `pdftotext` writes Latin-1 unless told otherwise, while the caller decodes
    its stdout as UTF-8 with errors="replace". Every byte outside ASCII therefore
    arrives as U+FFFD: a Häfele hardware catalogue loses the vendor's own name
    and every Ø in front of a drill-hole diameter, and a Thai document loses all
    of its text — silently, with exit code 0 and a full-looking `full_text.txt`.

    The fixture is a 699-byte WinAnsi PDF, so the failure needs no third-party
    document to reproduce.
    """
    source = tmp_path / "vendor sample.pdf"
    source.write_bytes((FIXTURES / "non-ascii-winansi.pdf").read_bytes())

    workdir = tmp_path / "work pdf"
    result = run_extract(source, workdir)
    assert result.returncode == 0, result.stdout + result.stderr

    text, metadata = extracted(workdir)
    assert "pdftotext" in metadata["extraction_method"], (
        "this test only means something when the pdftotext path is the one exercised"
    )
    assert "�" not in text
    for expected in ("Häfele", "Minifix®", "Ø 15 mm", "größer"):
        assert expected in text


def test_dependency_check_reports_every_format_without_installing() -> None:
    result = subprocess.run(
        [sys.executable, str(EXTRACT), "--check"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
        timeout=SUBPROCESS_TIMEOUT,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    report = result.stdout + result.stderr
    for expected in ("PDF", "EPUB", "DOCX", "RTF", "HTML"):
        assert expected in report
