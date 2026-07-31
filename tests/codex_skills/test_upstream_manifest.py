"""Byte-level provenance guard for the vendored book-to-skill runtime.

The governed tree under `tools/codex-skills/book-to-skill/` is a deliberate
mixture of three kinds of bytes:

* pinned upstream runtime, which must stay byte-identical to the commit named
  below so that an update is a fresh audit rather than a silent drift;
* two declared patches, each recorded here with both the upstream and the
  local hash, because the unpatched bytes lose data on this host — one aborts
  extraction under a cp1252 locale, the other silently replaces every non-ASCII
  character with U+FFFD (see `test_extraction_smoke.py`, the two tests named in
  `PATCHED_FILES`);
* the local Codex overlay, which is ours to change freely.

Recording the hashes in the test rather than in prose is what makes the
distinction enforceable offline: an undeclared edit to upstream bytes, or an
extra file appearing inside the skill, fails here instead of being discovered
during the next upstream merge.

The digests are only meaningful if a checkout reproduces the audited bytes. This
repository sets `core.autocrlf=true` and the pinned blobs are LF-only, so
without a `-text` attribute Git rewrites every one of them to CRLF on checkout
and all nineteen recorded digests stop matching at once. The last two tests pin
that attribute directly, so the failure names its cause instead of appearing as
nineteen simultaneous "drifted" hashes.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from hashlib import sha256
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "tools" / "codex-skills" / "book-to-skill"
SKILL_RELATIVE = SKILL.relative_to(ROOT).as_posix()

# Every .gitattributes that could carry the checkout pin, nearest-first. Git
# resolves the deepest matching file last, so a rule here also wins over any
# future repository-wide `* text=auto` line at the root.
ATTRIBUTE_FILES = (
    ROOT / "tools" / "codex-skills" / ".gitattributes",
    ROOT / ".gitattributes",
)

UPSTREAM_REPOSITORY = "https://github.com/virgiliojr94/book-to-skill"
UPSTREAM_COMMIT = "c6bc1b7927822e563aae6212c07670f5a3d95ea7"
UPSTREAM_LICENSE = "MIT"

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

# SHA-256 of each path's blob at UPSTREAM_COMMIT, resolved from a shallow fetch
# of that exact commit on 2026-07-30.
UPSTREAM_SHA256 = {
    "LICENSE.md": "be9b04bccfb4bdab63de13663307c229c0aa5ca69b692e9c351ff7053da9faca",
    "book_to_skill/__init__.py": "9d18b99b2c417557244634073c6bb3fa52dcc58aad8fb1fc5f658599f0c3ab77",
    "book_to_skill/__main__.py": "2207592e7bad6433302d258a4cfc9384a406373f59e49392a56d8389d08803ea",
    "book_to_skill/cli.py": "936285510c1dfa2563e7487963b6891107ace40618facd2502e004ea357badf1",
    "book_to_skill/config.py": "99ff3fd1cb86d77b29660bc6049f2095db2751005ce90ca42706071fc1ccf12a",
    "book_to_skill/dependencies.py": "119b3c9635d8b83a58bf4ec9648f5efa9373eaf9f6bba424a42b3ca69f6b3342",
    "book_to_skill/exceptions.py": "bf9417993e577cea5130bc34f4241cafccd1dda1f2f1ac22a9e8a198cc9dedc8",
    "book_to_skill/sanitize.py": "d26f20c01af1b6e81e009cb9ac597d075a0921de3c2fc49b10bd01abe30fb069",
    "book_to_skill/utils.py": "4b9236d8c074510e610bde76c86360486dc52149778f1b1d50fcac5f61f72da2",
    "book_to_skill/parsers/__init__.py": "a8f740712820f8729cd3b6adca799d17a23e0b80205a29e511791aafc97723f0",
    "book_to_skill/parsers/calibre.py": "d9e23513e9dadc7894b541f64af921a608210c03fe3acd391e28e5a159548fc4",
    "book_to_skill/parsers/docx.py": "15741ae148c50a0165c2e0ea4243af079d8a32bdde4a340bbe9050da6accdf66",
    "book_to_skill/parsers/epub.py": "d0a2d1e3aae5b8f2d2daeecf0bc15a9f502ef286c45933fd2dfd10820367c7a0",
    "book_to_skill/parsers/html.py": "86ebb15647b2b8aee7ace38ba7642a5334332a66c734479870d13eba54c7ca72",
    "book_to_skill/parsers/pdf.py": "857e90f9d20b1da1b4a6e6d927e206dac1e297514d7b4b0e8c20287e04f88261",
    "book_to_skill/parsers/rtf.py": "12837a5ded9bf0c7fa5bca6ef12d5bca841039228a5bc765b58bd91362b37909",
    "book_to_skill/parsers/text.py": "d355f499d3184f2b96aa84ea8e55d72b2127c6b91ff9f90d43131c8039e1ee13",
    "scripts/extract.py": "541ed846d5aa5d5fb13dcfa97c955734fa42eb80c00cf5ff6a2d2f057508c8fc",
    "tools/scan_generated_skill.py": "1c075d1de29e4c1589ba112a6321be8d5b4fc3f0ad14c14169f3e3de22c9dbe9",
}

# Declared deviations from pinned upstream bytes: path -> (local sha256, reason).
PATCHED_FILES = {
    "book_to_skill/utils.py": (
        "368ef866089300bda103387095d4be985dff4774ad66bf649897caf8aeeeb26e",
        'pass encoding="utf-8" when writing metadata.json so a non-UTF-8 '
        "Windows locale cannot abort extraction of Thai documents",
    ),
    "book_to_skill/parsers/pdf.py": (
        "f9d15459e4e0dd01aacf6ce8dcb7224b6ca0074faf6b5d536234bcd3a3d9aa44",
        "pass -enc UTF-8 to pdftotext; its default output encoding is Latin-1 "
        "and the caller decodes as UTF-8 with errors=replace, so every non-ASCII "
        "character silently became U+FFFD",
    ),
}

# Local Codex overlay: ours to edit, never expected to match upstream.
OVERLAY_FILES = (
    "SKILL.md",
    "agents/openai.yaml",
    "scripts/install_generated_skill.py",
)


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def governed_tree() -> set[str]:
    return {
        path.relative_to(SKILL).as_posix()
        for path in SKILL.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    }


def test_required_upstream_runtime_is_present() -> None:
    missing = [relative for relative in UPSTREAM_FILES if not (SKILL / relative).is_file()]
    assert missing == []


def test_local_overlay_is_present() -> None:
    missing = [relative for relative in OVERLAY_FILES if not (SKILL / relative).is_file()]
    assert missing == []


def test_unpatched_upstream_bytes_are_identical_to_the_pinned_commit() -> None:
    drifted = {
        relative: digest(SKILL / relative)
        for relative in UPSTREAM_FILES
        if relative not in PATCHED_FILES
        and digest(SKILL / relative) != UPSTREAM_SHA256[relative]
    }
    assert drifted == {}


def test_every_patch_is_declared_and_still_differs_from_upstream() -> None:
    for relative, (expected, reason) in PATCHED_FILES.items():
        actual = digest(SKILL / relative)
        assert actual == expected, f"{relative} no longer matches its declared patch"
        assert actual != UPSTREAM_SHA256[relative], (
            f"{relative} now matches upstream; drop the declared patch ({reason})"
        )


def test_governed_tree_contains_nothing_undeclared() -> None:
    assert governed_tree() == set(UPSTREAM_FILES) | set(OVERLAY_FILES)


def test_governed_tree_contains_no_symlinks() -> None:
    links = [
        path.relative_to(SKILL).as_posix() for path in SKILL.rglob("*") if path.is_symlink()
    ]
    assert links == []


def pattern_to_regex(pattern: str) -> re.Pattern[str]:
    """Translate the gitattributes glob subset this repository uses.

    The trap this function exists to avoid: `*` and `?` never cross `/` in
    gitattributes, but they do in `fnmatch`. Matching with `fnmatch` would
    report that `book-to-skill/*.py` covers `book-to-skill/scripts/extract.py`,
    so a rule matching *nothing* would read as full coverage — the exact false
    pass found while reviewing the first version of this test.
    """
    # A pattern with no separator matches the basename at any depth.
    prefix = "" if "/" in pattern.rstrip("/") else r"(?:.*/)?"
    out: list[str] = []
    index = 0
    while index < len(pattern):
        if pattern.startswith("/**", index) and index + 3 == len(pattern):
            out.append(r"/.*")  # trailing `/**`: everything inside
            index += 3
        elif pattern.startswith("**/", index):
            out.append(r"(?:[^/]+/)*")  # `**/`: zero or more directories
            index += 3
        elif pattern.startswith("**", index):
            out.append(r".*")
            index += 2
        elif pattern[index] == "*":
            out.append(r"[^/]*")
            index += 1
        elif pattern[index] == "?":
            out.append(r"[^/]")
            index += 1
        else:
            out.append(re.escape(pattern[index]))
            index += 1
    return re.compile(f"^{prefix}{''.join(out)}$")


def attributes_in_force() -> dict[str, list[str]]:
    """Governed path -> the attributes a checkout would apply to it.

    Git reads `.gitattributes` from the repository root downwards, so a deeper
    file overrides a shallower one; within one file the last matching line wins.
    This models a later rule as *replacing* an earlier one rather than merging
    attribute by attribute, which is exact for the single-rule pin in force and
    errs toward failing on anything more complicated.
    """
    in_force: dict[str, list[str]] = {}
    ordered = sorted(
        (path for path in ATTRIBUTE_FILES if path.is_file()),
        key=lambda path: len(path.parent.relative_to(ROOT).parts),
    )
    for attribute_file in ordered:
        base = attribute_file.parent
        for line in attribute_file.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            pattern, *attributes = stripped.split()
            matcher = pattern_to_regex(pattern)
            for relative in governed_tree():
                try:
                    candidate = (SKILL / relative).relative_to(base).as_posix()
                except ValueError:  # attributes file outside the governed tree
                    continue
                if matcher.match(candidate):
                    in_force[relative] = attributes
    return in_force


@pytest.mark.parametrize(
    ("pattern", "path", "covered"),
    (
        ("book-to-skill/**", "book-to-skill/SKILL.md", True),
        ("book-to-skill/**", "book-to-skill/scripts/extract.py", True),
        ("book-to-skill/**/*.py", "book-to-skill/scripts/extract.py", True),
        ("*.py", "book-to-skill/scripts/extract.py", True),
        # The two cases fnmatch gets wrong, and the reason this matcher exists.
        ("book-to-skill/*.py", "book-to-skill/scripts/extract.py", False),
        ("book-to-skill/*", "book-to-skill/scripts/extract.py", False),
    ),
)
def test_the_pattern_matcher_follows_gitattributes_not_fnmatch(
    pattern: str, path: str, covered: bool
) -> None:
    assert bool(pattern_to_regex(pattern).match(path)) is covered


def test_a_gitattributes_rule_pins_every_governed_file() -> None:
    """The pin must ship in the repository, cover the whole tree, and be readable
    without Git so an exported tree still asserts it.

    Coverage is checked file by file rather than "a rule mentions this
    directory": a rule that names the tree but matches none of its files is a
    pin in name only. `test_git_reports_no_conversion_...` then proves the rule
    is what a checkout actually applies.
    """
    shipped = [path for path in ATTRIBUTE_FILES if path.is_file()]
    assert shipped, (
        "no .gitattributes ships with the governed tree; a Windows checkout "
        "will rewrite the pinned bytes and every digest above will fail"
    )

    in_force = attributes_in_force()

    unpinned = sorted(
        relative for relative in governed_tree() if "-text" not in in_force.get(relative, [])
    )
    assert unpinned == [], (
        "no shipped .gitattributes rule disables text conversion for these "
        "governed files; a Windows checkout will rewrite them"
    )

    unprotected = sorted(
        relative for relative in governed_tree() if "-whitespace" not in in_force.get(relative, [])
    )
    assert unprotected == [], (
        "the pinned tree must also opt out of whitespace checking, or "
        "`git apply --whitespace=fix` and whitespace hooks can rewrite bytes "
        "we are not allowed to edit"
    )


def test_the_checkout_pin_is_declared_in_exactly_one_place() -> None:
    """One source of truth, so an update cannot half-apply across two files."""
    declaring = []
    for attribute_file in (path for path in ATTRIBUTE_FILES if path.is_file()):
        base = attribute_file.parent
        for line in attribute_file.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            pattern, *attributes = stripped.split()
            if "-text" not in attributes:
                continue
            matcher = pattern_to_regex(pattern)
            for relative in governed_tree():
                try:
                    candidate = (SKILL / relative).relative_to(base).as_posix()
                except ValueError:
                    continue
                if matcher.match(candidate):
                    declaring.append(attribute_file.relative_to(ROOT).as_posix())
                    break

    # "Declared nowhere" is the previous test's failure, not this one's.
    assert len(set(declaring)) <= 1, (
        f"the checkout pin is declared in more than one place: {sorted(set(declaring))}"
    )


@pytest.mark.skipif(
    shutil.which("git") is None or not (ROOT / ".git").exists(),
    reason="needs a Git checkout to report the attributes actually in force",
)
def test_git_reports_no_conversion_for_any_governed_file() -> None:
    """`i/` is the stored blob's line ending, `w/` the working tree's.

    Any governed file where the two differ was rewritten on checkout, and its
    recorded SHA-256 no longer describes the bytes on disk. Deleting the
    attributes file from the working tree does not relax this: Git reads
    attributes from the index during checkout, so the pin has to be removed from
    a commit before it stops applying.
    """
    result = subprocess.run(
        ["git", "ls-files", "--eol", "--", SKILL_RELATIVE],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr

    line_re = re.compile(r"^i/(?P<index>\S+)\s+w/(?P<worktree>\S+)\s+attr/(?P<attr>\S*)\s*\t(?P<path>.+)$")
    reported = {}
    for line in result.stdout.splitlines():
        match = line_re.match(line)
        assert match is not None, f"unparsed `git ls-files --eol` line: {line!r}"
        reported[match.group("path")] = match.groupdict()

    assert set(reported) == {f"{SKILL_RELATIVE}/{relative}" for relative in governed_tree()}

    converted = {
        path: (fields["index"], fields["worktree"])
        for path, fields in reported.items()
        if fields["index"] != fields["worktree"]
    }
    assert converted == {}, "checkout conversion rewrote pinned bytes"

    unpinned = sorted(path for path, fields in reported.items() if "-text" not in fields["attr"])
    assert unpinned == []
