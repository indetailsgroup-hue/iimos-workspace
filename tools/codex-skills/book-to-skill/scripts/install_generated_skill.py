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
ALLOWED_ROOT_FILES = {
    "SKILL.md",
    "glossary.md",
    "patterns.md",
    "cheatsheet.md",
}


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
    name_match = re.search(
        r"^name:\s*([a-z0-9-]+)\s*$",
        match.group(1),
        re.MULTILINE,
    )
    if not name_match or not NAME_RE.fullmatch(name_match.group(1)):
        raise InstallError("skill name must be lowercase hyphen-case")
    return name_match.group(1)


def _reject_links(root: Path) -> None:
    if root.is_symlink():
        raise InstallError("staged skill must not be a symbolic link")
    for path in root.rglob("*"):
        if path.is_symlink():
            raise InstallError(
                f"staged skill contains a symbolic link: {path.name}"
            )


def _validate_generated_layout(root: Path) -> None:
    seen_casefolded: dict[str, str] = {}
    for path in sorted(
        root.rglob("*"),
        key=lambda item: item.relative_to(root).as_posix().casefold(),
    ):
        relative = path.relative_to(root)
        relative_text = relative.as_posix()
        casefolded = relative_text.casefold()
        prior = seen_casefolded.get(casefolded)
        if prior is not None and prior != relative_text:
            raise InstallError(
                "staged skill contains case-colliding paths: "
                f"{prior} and {relative_text}"
            )
        seen_casefolded[casefolded] = relative_text

        if path.is_dir():
            allowed = relative.parts == ("chapters",)
        elif path.is_file():
            allowed = (
                len(relative.parts) == 1
                and relative.name in ALLOWED_ROOT_FILES
            ) or (
                len(relative.parts) == 2
                and relative.parts[0] == "chapters"
                and relative.suffix.lower() == ".md"
            )
        else:
            allowed = False
        if not allowed:
            raise InstallError(
                f"unexpected staged-skill path: {relative_text}"
            )


def _scan(source: Path) -> None:
    scanner = (
        Path(__file__).resolve().parents[1]
        / "tools"
        / "scan_generated_skill.py"
    )
    result = subprocess.run(
        [sys.executable, str(scanner), str(source)],
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
        timeout=30,
    )
    if result.returncode != 0:
        raise InstallError(
            "generated-skill scan blocked installation\n"
            + result.stdout
            + result.stderr
        )


def install_skill(
    source: Path,
    skills_root: Path,
    *,
    replace: bool,
) -> dict[str, str]:
    requested_source = source.expanduser()
    if requested_source.is_symlink():
        raise InstallError("staged skill must not be a symbolic link")
    source = requested_source.resolve(strict=True)
    if not source.is_dir():
        raise InstallError("staged skill path must be a directory")
    _reject_links(source)

    requested_root = skills_root.expanduser()
    if requested_root.exists() and requested_root.is_symlink():
        raise InstallError("skills root must not be a symbolic link")
    root = requested_root.resolve(strict=False)
    if root == source or source in root.parents:
        raise InstallError("skills root must not be inside the staged skill")
    if root.exists() and not root.is_dir():
        raise InstallError("skills root must be a directory")
    root.mkdir(parents=True, exist_ok=True)

    temporary = root / f".generated-skill.install-{uuid.uuid4().hex}"
    backup = None
    target = None
    try:
        shutil.copytree(source, temporary, symlinks=True)
        _reject_links(temporary)
        _validate_generated_layout(temporary)
        name = read_skill_name(temporary)
        _scan(temporary)

        target = root / name
        if target.parent != root:
            raise InstallError("destination escaped the selected skills root")
        if target.is_symlink():
            raise InstallError(
                "existing destination must not be a symbolic link"
            )
        if target.exists() and not replace:
            raise InstallError(f"destination already exists: {target}")

        if target.exists():
            chosen_backup_root = root / ".backups"
            if (
                chosen_backup_root.exists()
                and chosen_backup_root.is_symlink()
            ):
                raise InstallError(
                    "backup root must not be a symbolic link"
                )
            chosen_backup_root.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            backup = chosen_backup_root / f"{name}-{stamp}"
            if backup.parent != chosen_backup_root:
                raise InstallError(
                    "backup escaped the selected backup root"
                )
            if backup.exists():
                raise InstallError(f"backup already exists: {backup}")
            target.replace(backup)
        temporary.replace(target)
    except Exception:
        if (
            backup is not None
            and backup.exists()
            and target is not None
            and not target.exists()
        ):
            backup.replace(target)
        if temporary.exists():
            shutil.rmtree(temporary)
        raise
    assert target is not None
    return {
        "installed": str(target),
        "backup": str(backup) if backup else "",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Install a scanned generated Codex skill"
    )
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
