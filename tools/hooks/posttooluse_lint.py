#!/usr/bin/env python3
"""PostToolUse guardrail — lint the single doc an agent just wrote.

Layer 1 of Decision 3 (the three enforcement layers). This runs the moment an
agent writes a documentation file, so the feedback lands before the agent moves
on. It is *not* the authority — the owner can disable it in settings, and it
never sees a claim made only in chat — but it is the fastest of the three.

Why it is bound to `__file__`, not to a working directory
---------------------------------------------------------
The hook is registered globally in `~/.claude/settings.json` and therefore fires
for *every* project the user opens, not only this one. Deriving the repository
root from this script's own location (`parents[2]`) is what makes it a silent
no-op everywhere except this repository: a Write in another project produces a
path that is not under *this* repo's `docs/`, so `docs_target` returns None and
the hook exits 0 without a word. It must not break other projects.

Contract
--------
* stdin carries the PostToolUse event JSON (`tool_input.file_path`, plus a few
  shapes seen historically — see `extract_path`).
* Quiet on success: no output, exit 0.
* Loud on failure: the linters' findings on stderr, exit 2 — the code Claude
  Code surfaces back to the agent.
* Local mode only, never `--deep`; the committed ledger `tools/.lint_allowlist`
  is the authority (the linters load it by default, and this passes no
  `--allowlist`).
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

# The repository this hook guards. Resolved from the script location so the
# global hook is inert for every other project (see module docstring).
REPO_ROOT = Path(__file__).resolve().parents[2]

# The path shape this layer acts on: markdown under docs/, repo-relative posix.
DOCS_MD = re.compile(r"^docs/.*\.md$")

LINTERS = ("lint_claims.py", "lint_certifications.py")


def extract_path(payload: object) -> str | None:
    """Pull the written file's path out of a PostToolUse payload, or None.

    Write and Edit both carry `tool_input.file_path`; a few historical/edge
    shapes have used `path`/`filePath`, or lifted the fields to the top level.
    Anything unrecognised returns None rather than raising — a hook that crashes
    on an unexpected event shape is a hook that gets removed."""
    if not isinstance(payload, dict):
        return None
    candidates: list[object] = []
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        candidates += [tool_input.get("file_path"),
                       tool_input.get("path"),
                       tool_input.get("filePath")]
    candidates += [payload.get("file_path"), payload.get("path")]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return c
    return None


def docs_target(raw_path: str) -> Path | None:
    """Absolute path to lint iff `raw_path` is a `.md` under THIS repo's docs/.

    Outside the repository, outside docs/, or not markdown -> None. This is the
    boundary that keeps the global hook from touching other projects."""
    try:
        p = Path(raw_path)
        if not p.is_absolute():
            p = REPO_ROOT / p
        p = p.resolve()
        rel = p.relative_to(REPO_ROOT).as_posix()
    except (ValueError, OSError):
        return None
    return p if DOCS_MD.match(rel) else None


def run_linters(target: Path) -> tuple[int, str]:
    """Run both linters against one file. Return (worst_exit, combined_output).

    Invoked exactly as the other two layers invoke them — `python tools/<linter>
    <file>`, from the repo root so `tools/.lint_allowlist` is the authority. Both
    run even when the first fails, so the author sees every problem at once."""
    worst = 0
    chunks: list[str] = []
    for linter in LINTERS:
        proc = subprocess.run(
            [sys.executable, str(REPO_ROOT / "tools" / linter), str(target)],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            cwd=str(REPO_ROOT),
        )
        if proc.returncode != 0:
            worst = max(worst, proc.returncode)
            body = (proc.stdout + proc.stderr).rstrip()
            chunks.append(f"[{linter}] exit {proc.returncode}\n{body}")
    return worst, "\n\n".join(chunks)


def main(stdin_text: str) -> int:
    # The corpus is bilingual and findings can carry Thai or an em dash; a
    # Windows console defaults to a code page that cannot encode them, and a hook
    # that crashes (or mojibakes) while reporting is a hook that gets removed.
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
    try:
        payload = json.loads(stdin_text) if stdin_text.strip() else {}
    except (ValueError, TypeError):
        return 0  # not JSON we understand -> do nothing, quietly
    raw = extract_path(payload)
    if not raw:
        return 0
    target = docs_target(raw)
    if target is None or not target.exists():
        return 0
    code, output = run_linters(target)
    if code != 0:
        sys.stderr.write(
            "MONOLITH claim-guardrails (PostToolUse) - this write does not pass "
            "the doc linters:\n" + output + "\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.stdin.read()))
