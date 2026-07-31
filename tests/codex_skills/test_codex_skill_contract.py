"""Contract for the Codex/Windows overlay on top of the pinned upstream skill.

Upstream ships a `SKILL.md` written for a POSIX, Bash-shaped host. The overlay
exists so Codex on this machine resolves its own paths and runs commands that
PowerShell can actually execute. These assertions are the difference between
"we replaced the file" and "we replaced it with something Codex can follow".
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILL_DIR = ROOT / "tools" / "codex-skills" / "book-to-skill"
SKILL_MD = SKILL_DIR / "SKILL.md"
AGENTS_YAML = SKILL_DIR / "agents" / "openai.yaml"


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


def test_workflow_states_the_gates_that_must_precede_installation() -> None:
    """Order matters: extract, scan, validate, approve, then install.

    A workflow that mentions the installer but not its gates is how an agent
    ends up installing unscanned generated instructions.
    """
    text = SKILL_MD.read_text(encoding="utf-8")
    for gate in (
        "--check",
        "BOOK_SKILL_WORKDIR",
        "quick_validate.py",
        "--replace",
        "backup",
    ):
        assert gate in text, f"SKILL.md never mentions {gate}"
    assert text.index("scan_generated_skill.py") < text.index(
        "install_generated_skill.py"
    ), "the scanner must be introduced before the installer"


def test_interface_metadata_is_present_for_the_codex_ui() -> None:
    text = AGENTS_YAML.read_text(encoding="utf-8")
    for field in ("display_name", "short_description", "default_prompt"):
        assert f"{field}:" in text
    assert "book-to-skill" in text
