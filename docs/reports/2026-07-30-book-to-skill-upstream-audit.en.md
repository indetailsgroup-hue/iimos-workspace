# Book-to-Skill Upstream Audit — Pinned Commit `c6bc1b79`

**Edition:** English
**Audit date:** 30 July 2026, Asia/Bangkok (UTC+7)
**Governing design:** [`docs/superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.en.md`](../superpowers/specs/2026-07-30-book-to-skill-codex-windows-design.en.md)
**Implementation plan:** [`docs/superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.en.md`](../superpowers/plans/2026-07-30-book-to-skill-codex-windows-implementation.en.md)
**Companion report:** [`2026-07-30-book-to-skill-codex-windows-implementation.en.md`](2026-07-30-book-to-skill-codex-windows-implementation.en.md)
**Scope:** the 19 upstream runtime paths vendored into `tools/codex-skills/book-to-skill/` in the parent governance root, and the personal deployment at `C:\Users\thai3\.codex\skills\book-to-skill`

> **Root rule:** every statement below applies to the parent governance root `C:\Users\thai3\determined-williams (2)` and to the user's personal Codex skills directory. The nested product repository `determined-williams\` was neither read for this audit nor written by it.

---

## 1. Why this audit exists

The converter was installed into the personal Codex skills directory before any governed source, test, or byte comparison existed in the repository. The install therefore worked while resting on an unaudited claim: that the bytes in use were the bytes of the commit the design pinned. This audit resolves that claim by refetching the pinned commit into an isolated repository and comparing every governed byte.

## 2. Pinned source identity

| Field | Value |
|---|---|
| Repository | `https://github.com/virgiliojr94/book-to-skill` |
| Commit | `c6bc1b7927822e563aae6212c07670f5a3d95ea7` |
| Commit subject | `ci: bump the github-actions group with 2 updates (#80)` |
| Commit author / date | `dependabot[bot]` — Mon 27 Jul 2026 18:42:26 -0400 |
| License | MIT (`LICENSE.md`, sha256 `be9b04bc…`) |
| Fetch method | `git fetch --depth 1 origin <commit>` into a throwaway repository outside both roots |

The commit was resolved by identity, not by branch: `git rev-parse FETCH_HEAD` returned the same 40 characters the design pinned, so no moving reference took part in the audit.

## 3. Path selection

Upstream ships 49 tracked paths at that commit. Nineteen are governed runtime and license bytes; the rest are project furniture that a personal skill installation has no reason to carry.

| Group | Paths | Decision |
|---|---|---|
| Extraction runtime | `book_to_skill/` (17 files, including `parsers/`) | vendored |
| Entrypoint | `scripts/extract.py` | vendored |
| Advisory scanner | `tools/scan_generated_skill.py` | vendored |
| License | `LICENSE.md` | vendored |
| Upstream instructions | `SKILL.md` | replaced by the Codex overlay |
| Project furniture | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `BACKERS.md`, `mkdocs.yml`, `pyproject.toml`, `docs/`, `.github/` | excluded |
| Upstream test suite | `tests/` (4 files) | excluded — this repository carries its own suite under `tests/codex_skills/` |
| Other tools | `tools/discovery_tax.py`, `tools/validate_skill.py` | excluded — the Codex validator is used instead |
| Build residue | `scripts/__pycache__/extract.cpython-313.pyc` | excluded — a compiled artifact has no place in an audited tree |
| Banner asset | `scripts/banner.txt` | excluded — see §6.4 |

## 4. Byte comparison result

Each governed path was hashed from the pinned blob (`git show FETCH_HEAD:<path>`) and from the installed tree, then from the vendored tree after copying.

**18 of the 19 governed paths are byte-identical to the pinned commit.** One path carries a single declared deviation.

| Path | SHA-256 (pinned commit) | Result |
|---|---|---|
| `LICENSE.md` | `be9b04bccfb4bdab…` | identical |
| `book_to_skill/__init__.py` | `9d18b99b2c417557…` | identical |
| `book_to_skill/__main__.py` | `2207592e7bad6433…` | identical |
| `book_to_skill/cli.py` | `936285510c1dfa25…` | identical |
| `book_to_skill/config.py` | `99ff3fd1cb86d77b…` | identical |
| `book_to_skill/dependencies.py` | `119b3c9635d8b83a…` | identical |
| `book_to_skill/exceptions.py` | `bf9417993e577cea…` | identical |
| `book_to_skill/sanitize.py` | `d26f20c01af1b6e8…` | identical |
| `book_to_skill/utils.py` | `4b9236d8c074510e…` | **declared patch** — local sha256 `368ef866089300bd…` |
| `book_to_skill/parsers/__init__.py` | `a8f740712820f872…` | identical |
| `book_to_skill/parsers/calibre.py` | `d9e23513e9dadc78…` | identical |
| `book_to_skill/parsers/docx.py` | `15741ae148c50a01…` | identical |
| `book_to_skill/parsers/epub.py` | `d0a2d1e3aae5b8f2…` | identical |
| `book_to_skill/parsers/html.py` | `86ebb15647b2b8ae…` | identical |
| `book_to_skill/parsers/pdf.py` | `857e90f9d20b1da1…` | identical |
| `book_to_skill/parsers/rtf.py` | `12837a5ded9bf0c7…` | identical |
| `book_to_skill/parsers/text.py` | `d355f499d3184f2b…` | identical |
| `scripts/extract.py` | `541ed846d5aa5d5f…` | identical |
| `tools/scan_generated_skill.py` | `1c075d1de29e4c15…` | identical |

Full digests for all 19 paths are recorded in [`tests/codex_skills/test_upstream_manifest.py`](../../tests/codex_skills/test_upstream_manifest.py), which fails on any undeclared change to upstream bytes, on any undeclared file inside the skill tree, and on a symbolic link anywhere in it.

## 5. The one declared patch

### 5.1 The change

```diff
--- book_to_skill/utils.py   (pinned commit c6bc1b79)
+++ book_to_skill/utils.py   (vendored + installed)
@@ -683,7 +683,10 @@
-    OUTPUT_META.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
+    OUTPUT_META.write_text(
+        json.dumps(metadata, indent=2, ensure_ascii=False),
+        encoding="utf-8",
+    )
```

### 5.2 Why the unpatched byte is unusable on this host

`metadata.json` embeds source filenames verbatim and is serialized with `ensure_ascii=False`. Without an explicit encoding, `Path.write_text` encodes with the process locale codec, which on this machine is cp1252:

```
$ python -c "import sys,locale; print(locale.getpreferredencoding(False), sys.flags.utf8_mode)"
cp1252 0
```

The neighbouring text write one line above (`OUTPUT_TEXT.write_text(consolidated_text, encoding="utf-8")`) already carries the argument upstream, so the deviation is one inconsistent call rather than a design difference.

### 5.3 Reproduction, recorded rather than asserted

The pinned byte was restored over the vendored file and the regression test re-run. Extraction completed and the process then died while writing metadata:

```
$ python -m pytest tests/codex_skills/test_extraction_smoke.py::test_thai_metadata_survives_a_non_utf8_locale -v
tests/codex_skills/test_extraction_smoke.py::test_thai_metadata_survives_a_non_utf8_locale FAILED [100%]

  File "...\tools\codex-skills\book-to-skill\book_to_skill\utils.py", line 686, in main
    OUTPUT_META.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
  File "...\Lib\encodings\cp1252.py", line 19, in encode
    return codecs.charmap_encode(input,self.errors,encoding_table)[0]
UnicodeEncodeError: 'charmap' codec can't encode characters in position 205-210: character maps to <undefined>

returncode=1
============================== 1 failed in 0.41s ==============================
```

The patched file was then restored and its digest re-checked (`368ef866089300bd…`). The failure mode matters as much as the fix: extraction succeeds, the user sees progress output, and the run aborts at the last write — so a caller that only inspects `full_text.txt` would conclude the conversion worked.

### 5.4 Standing constraint

The patch is recorded in three places that a future upstream bump has to pass through: `PATCHED_FILES` in the manifest test (with both digests), the regression test named above, and the `localModifications` list in the provenance lock. If a later upstream commit fixes the same call, `test_every_patch_is_declared_and_still_differs_from_upstream` fails and forces the patch to be dropped rather than silently carried forward.

## 6. Capability inventory of the vendored runtime

Every governed `.py` file was read in full (2,121 lines across 19 paths). The capabilities below are what the audit found; each is expected for a document converter that must call external extractors and write a skill directory.

### 6.1 Subprocess use — 4 call sites

| Site | Command | Notes |
|---|---|---|
| `book_to_skill/dependencies.py:89` | `sys.executable -m pip install …` | gated by `BOOK_SKILL_INSTALL_MISSING` (default `ask`); the Codex workflow pins `--install-missing no` |
| `book_to_skill/parsers/pdf.py:14,87` | `pdftotext` (poppler) | argument array, no shell |
| `book_to_skill/parsers/calibre.py:16` | `ebook-convert` (Calibre) | argument array, no shell |
| `scripts/install_generated_skill.py:97` | `sys.executable tools/scan_generated_skill.py <snapshot>` | 30-second timeout, `check=False` |

No call site builds a command string, and none passes `shell=True`, so a document filename cannot become shell syntax.

### 6.2 Filesystem writes

| Site | Target |
|---|---|
| `book_to_skill/config.py` | work directory from `BOOK_SKILL_WORKDIR`, else the system temporary directory |
| `book_to_skill/utils.py` | `full_text.txt` and `metadata.json` inside that work directory |
| `scripts/install_generated_skill.py` | a uniquely named snapshot inside the chosen skills root, then an atomic `replace` into the target, with the prior tree moved under `.backups/` |

The installer's destructive reach is bounded to the snapshot it created: `shutil.rmtree` is called on that path only, inside the failure handler, and a backup is rolled back when the target ended up empty.

### 6.3 Search results for capabilities that would change the risk profile

A capability search over the 19 governed paths returned these counts:

| Searched capability | Pattern | Matches |
|---|---|---|
| Network egress | `requests`, `urllib`, `httpx`, `socket` | 0 |
| Dynamic evaluation | `eval(`, `exec(`, `compile(`, `__import__` | 0 |
| Deserialization | `pickle`, `yaml.load` | 0 |
| Credential or key access | `os.environ` reads other than the two `BOOK_SKILL_*` variables | 0 |
| Permission or link creation | `chmod`, `symlink(` | 0 |

The one network-adjacent capability in the tree is the pip invocation in §6.1, which reaches a package index only after explicit approval and is switched off by the workflow's default flag.

### 6.4 One upstream asset deliberately excluded

`scripts/banner.txt` carries the upstream attribution art that `print_banner()` writes to stderr. It was excluded from the vendored tree; `print_banner()` wraps its read in `try/except Exception` and continues, so the omission costs a decorative banner and nothing else. Attribution is preserved by `LICENSE.md`, which is vendored unmodified, and by this report.

## 7. Extractor dependency matrix on this host

Captured from `scripts/extract.py --check`, exit code 0:

```
  PDF (text-heavy)
      ✓ python: pypdf
      ✗ python: pdfminer.six
      ✓ system: pdftotext (poppler-utils)
      → ready — any one of pdftotext / pypdf / pdfminer is enough
  PDF (technical: tables, code, formulas)
      ✗ python: docling
      → fallback available (install for best quality)
  EPUB      ✗ ebooklib, ✗ beautifulsoup4  → stdlib zipfile fallback
  DOCX      ✗ python-docx                 → stdlib ZIP/XML fallback
  HTML      ✗ beautifulsoup4              → stdlib html.parser fallback
  RTF       ✗ striprtf                    → regex cleanup fallback
  MOBI / AZW / AZW3
      ✗ system: ebook-convert (Calibre)
      → MISSING — required, no fallback
```

| Format | Status on 30 July 2026 |
|---|---|
| PDF (text) | ready — `pdftotext` and `pypdf` both installed |
| PDF (technical) | fallback only — Docling is not installed, so `--mode technical` degrades to the text chain and layout-sensitive material loses structure |
| EPUB, DOCX, HTML, RTF | fallback only — stdlib parsers handle these until the optional packages are installed |
| Markdown, TXT, RST, AsciiDoc | ready — stdlib |
| MOBI, AZW, AZW3 | unsupported on this host — Calibre `ebook-convert` is not installed and these formats have no fallback |

No package was installed during this audit.

## 8. Risk record

| Class | Assessment |
|---|---|
| Local process execution | Expected. Four call sites, all argument arrays, no shell. |
| Filesystem mutation | Expected and bounded. Writes land in a work directory, a staging snapshot, or an explicitly approved skill target with a recoverable backup. |
| Optional dependency installation | Expected, gated twice: an environment variable default of `ask`, and the workflow's `--install-missing no`. |
| Document-parser exposure | Inherent. Parsers process untrusted input; malformed documents can crash a parser, which the extractor reports as a skipped source. |
| Generated-content injection | Mitigated, not eliminated. The scanner matches known injection shapes; a novel phrasing can pass it, which is why installation stays behind human approval. |
| Supply-chain drift | Controlled by the manifest test and the provenance lock; an upstream bump requires a fresh audit rather than a merge. |

## 9. What this audit does not establish

- It says nothing about upstream commits other than `c6bc1b79`, and nothing about the project's future releases.
- It does not certify the *behaviour* of parsers on documents beyond the two Markdown fixtures exercised by the test suite; PDF, EPUB, DOCX, RTF, and MOBI paths were read as source, not run against real files of those types.
- It does not evaluate the quality or fidelity of any generated skill, which depends on the model doing the summarizing rather than on these bytes.
- It does not extend to the nested product repository, to other machines, or to any published distribution of a generated skill.
