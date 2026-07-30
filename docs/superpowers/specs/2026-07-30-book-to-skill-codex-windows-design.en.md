# Book-to-Skill Codex/Windows Overlay Design

**Edition:** English

**Date:** 30 July 2026

**Status:** Approved design awaiting written-spec review

**Scope:** Private Codex-native package for this Windows workstation

## 1. Decision and evidence boundary

**OWNER DECISION:** Use a pinned-upstream-plus-Codex-overlay architecture.

**VERIFIED FACT:** The governance/bootstrap root is `C:\Users\thai3\determined-williams (2)`. The active product source is the separate dirty nested repository at `determined-williams\`. This work will modify only the parent governance root and the user's personal Codex skill directory. It will not modify, test, clean, stage, or commit the nested product repository.

**VERIFIED FACT:** No `book-to-skill` installation currently exists in the checked Codex, Claude, or cross-agent skill locations.

**PINNED SOURCE DECISION:** The upstream candidate is `https://github.com/virgiliojr94/book-to-skill` at commit `c6bc1b7927822e563aae6212c07670f5a3d95ea7`, MIT-licensed. Implementation must independently resolve and verify that exact commit before using any source bytes.

## 2. Goal

Deliver a private `book-to-skill` skill that Codex Desktop can discover and use on Windows to convert supported documents into structured, on-demand Codex skills. The installation must be reproducible, supply-chain-audited, designed to preserve existing skills, and verified with Thai and English fixtures.

## 3. Success criteria

The work is complete only when all of the following are true:

1. Codex discovers the converter from `C:\Users\thai3\.codex\skills\book-to-skill`.
2. The converter's `SKILL.md` provides its required execution path through Codex-native paths, Python, and PowerShell-compatible commands.
3. Text-heavy PDF, EPUB, DOCX, TXT, Markdown, HTML, and RTF extraction follows the pinned upstream implementation when the relevant extractor is available.
4. Technical PDF extraction can use Docling when installed; missing optional dependencies are reported and never installed without explicit user approval.
5. Windows paths containing spaces and Thai characters are handled as literal paths.
6. Generated skills are created in staging, scanned for prompt-injection-shaped content, validated, and only then installed.
7. An existing destination skill is never silently overwritten. Replacement requires explicit approval and creates a recoverable backup.
8. The installed converter tree matches a provenance lock containing the upstream commit, local overlay list, file hashes, aggregate tree hash, license, audit time, and risk notes.
9. Contract, security, extraction, installation, and end-to-end smoke tests pass with complete output.
10. English and Thai project documentation exists as aligned Markdown and standalone HTML.

## 4. Non-goals and limits

- Do not publish a GitHub fork or open an upstream pull request in this scope.
- Do not change MONOLITH product runtime code.
- Do not guarantee that generated summaries reproduce a source with 100% accuracy.
- Do not treat image-only or damaged documents as successfully supported unless an installed extractor produces usable text.
- Do not redistribute generated skills derived from copyrighted third-party books.
- Do not send documents over a network from the extraction code. Model processing remains subject to the active AI provider's data handling terms.

## 5. Considered approaches

| Approach | Advantages | Costs and risks | Decision |
|---|---|---|---|
| Pinned upstream plus Codex overlay | Retains mature extractors, makes local changes reviewable, supports deterministic updates | Requires a maintained overlay and re-audit for each update | **Selected** |
| Clean-room rewrite | Full control of every component | Duplicates parsers, increases maintenance and regression risk | Rejected |
| Thin wrapper around the PyPI CLI | Smallest change | Provides extraction only and omits the full skill-generation workflow | Rejected |

## 6. Architecture

### 6.1 Governed source

The parent root will contain the reviewable source at:

```text
tools/codex-skills/book-to-skill/
├── SKILL.md
├── agents/openai.yaml
├── book_to_skill/                 # pinned upstream extraction runtime
├── scripts/extract.py             # pinned upstream compatibility entrypoint
├── scripts/install_generated_skill.py
├── tools/scan_generated_skill.py  # pinned upstream advisory scanner
└── LICENSE.md
```

Tests and fixtures will live outside the installed skill:

```text
tests/codex_skills/
├── fixtures/
│   ├── english-guide.md
│   └── คู่มือ-ตัวอย่าง.md
├── test_codex_skill_contract.py
├── test_extraction_smoke.py
├── test_generated_skill_installer.py
└── test_security_scan.py
```

The skill contains only runtime instructions, interface metadata, executable resources, and the required upstream license. Design, implementation, and audit reports remain under `docs/`.

### 6.2 Overlay boundary

The upstream runtime files remain byte-identical to the pinned Git blobs unless a Windows defect is demonstrated by a failing test. Codex-specific behavior belongs in:

- the overlaid `SKILL.md`;
- `agents/openai.yaml`; and
- the locally authored guarded installer for generated skills.

Every added or modified path is recorded in provenance. Updating upstream is a new audit and is never performed from a moving branch.

### 6.3 Runtime workflow

1. Identify literal input files, the content type, the intended use, and the destination skill name.
2. Run the bundled extractor preflight and report available and missing optional extractors.
3. Extract into a unique Windows temporary directory without changing source documents.
4. Report sources, approximate size, expected generated files, and material limitations.
5. Obtain explicit approval before model-intensive generation or dependency installation.
6. Generate `SKILL.md`, on-demand chapter files, glossary, patterns, and cheatsheet in a staging directory.
7. Run the generated-skill scanner and Codex skill validator.
8. If the scan or validation fails, stop and report file-and-line findings without installing.
9. Install to `C:\Users\thai3\.codex\skills\<slug>` only after validation. Refuse an existing target unless the user explicitly approved replacement; make a backup before replacement.
10. Remove only the unique temporary directory created by the current run.

## 7. Codex-native skill contract

The overlaid `SKILL.md` will:

- start its description with concrete Codex triggers such as converting PDF, EPUB, DOCX, Markdown, HTML, RTF, or document folders into reusable skills;
- use `C:\Users\thai3\.codex\skills` or resolved `$CODEX_HOME\skills` as the personal destination;
- instruct Codex to use its file and execution tools rather than assuming a slash-command host;
- use Python commands that work from PowerShell without Bash variables, `grep`, `sed`, `wc`, or `mkdir -p`;
- require literal, resolved paths and containment checks before copy, move, replacement, backup, or cleanup;
- require extraction evidence before claiming source coverage;
- require scan and validation evidence before loading or installing generated instructions;
- default generated third-party-book skills to private use; and
- keep detailed format and troubleshooting information in on-demand references or script help rather than bloating `SKILL.md`.

## 8. Safety and error handling

### 8.1 Supply chain

Before installation, enumerate and audit every source file that will enter the skill. Reject symlinks, nested repositories, path traversal, case-colliding paths, unexpected binaries, obfuscation, dynamic evaluation, credential access, undeclared network access, and destructive behavior. Expected capabilities are local subprocess execution for document extractors and controlled filesystem writes for staged and installed skills.

### 8.2 Generated content

Treat document text as untrusted data. Remove invisible control characters using the pinned extractor behavior and scan generated Markdown for instruction overrides, model-control tags, widened tool authority, and exfiltration-shaped language. A scanner finding blocks installation pending human review.

### 8.3 Filesystem mutation

The generated-skill installer must resolve the source, destination root, target, and backup paths; reject symlinks; prove the target remains within the selected root; and refuse silent overwrite. Cleanup is limited to the unique work directory from the active run.

### 8.4 Partial failure

One unreadable source may be reported and skipped only when at least one other source succeeds. The final report must list processed and skipped sources separately. Zero usable sources is a hard failure. Missing optional extractors produce an actionable report, not an automatic installation.

## 9. Testing strategy

Implementation follows test-driven development:

1. **RED — compatibility contract:** Run contract checks against the pinned upstream `SKILL.md` and demonstrate that the required execution path is not expressed through Codex-native paths and PowerShell-compatible commands.
2. **GREEN — Codex overlay:** Add the smallest instruction and metadata overlay that satisfies the contract.
3. **RED/GREEN — guarded installation:** Write tests for new install, existing-target refusal, explicit replacement with backup, path escape, symlink rejection, spaces, and Thai names before implementing the installer.
4. **Extraction smoke:** Run the pinned extractor on English and Thai Markdown fixtures and verify source markers, Unicode preservation, metadata, and chapter detection.
5. **Security scan:** Verify benign generated Markdown passes and prompt-injection-shaped fixtures fail with stable rule and line output.
6. **End-to-end staging smoke:** Create a minimal generated sample skill, scan it, validate it, install it into an isolated temporary Codex home, and verify its bytes and discovery layout.
7. **Installed-tree verification:** Hash the personal installation and verify it against the provenance lock.

The current thread policy does not authorize subagent dispatch, so forward-testing will use executable contract and end-to-end tests rather than independent agents. No completion claim may rely on truncated output or a prior test run.

## 10. Installation and provenance

The governed parent-root tree is the maintained source. The personal installation is a verified deployment copy, not the development source. Installation proceeds only after:

- exact upstream commit resolution;
- complete source audit;
- overlay diff review;
- test and validator success;
- installed-byte comparison; and
- provenance-lock creation at `C:\Users\thai3\.codex\skills\.provenance\book-to-skill.json`.

The risk record will classify local process execution, filesystem writes, optional dependency installation, and document-parser risk without describing expected behavior as malicious.

## 11. Documentation

Project-facing design, plan, and implementation reports must be produced in English and Thai as Markdown and standalone HTML. The paired editions must describe the same decisions, evidence, limitations, commands, and verification results.

## 12. Acceptance boundary

Acceptance proves this private package works on the current Codex Desktop and Windows environment with the tested fixtures and detected dependencies. Broader operating-system compatibility, every possible document encoding, model-summary fidelity, cloud privacy, and public distribution remain outside the verified claim.
