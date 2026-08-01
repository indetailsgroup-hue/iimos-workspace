### Task 1: Establish paired worktrees and baseline gates

**Files:**
- Read: `CONTEXT.md`
- Read: `docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.en.md`
- Read: `docs/superpowers/specs/2026-07-26-global-exact-sku-connector-living-registry-design.en.md`
- Record: `.superpowers/sdd/global-connector-registry-progress.md` in the parent implementation worktree

**Interfaces:**
- Consumes: the parent commit containing this checked-in plan (with `92d67571` as the approved-design ancestor); nested commit `ed036a2c`.
- Produces: clean paired-worktree paths and a baseline ledger with exact commit hashes and gate results.

- [ ] **Step 1: Create one isolated worktree per Git root**

Use `superpowers:using-git-worktrees`. Create parent branch `codex/global-connector-registry` from the checked-in commit containing this plan and nested branch `codex/global-connector-runtime` from `ed036a2c`. Do not reuse the two dirty working directories.

- [ ] **Step 2: Record the two-root baseline**

The ledger must record both absolute worktree paths, branches, `git rev-parse HEAD`, `git status --short`, Python/Node/npm versions and NOT-FOR-PRODUCTION state.

- [ ] **Step 3: Run the parent baseline**

Run:

```powershell
python -m unittest discover -s tests/component_master -v
python tools/verify_kitchen_kernel.py
```

Expected: exit 0 with a visible unittest summary and verifier final summary. If either fails, stop; record the failure without changing production code.

- [ ] **Step 4: Run the nested targeted baseline**

Run:

```powershell
npm.cmd run test:run -- src/core/connector src/core/hardware/catalog src/factory/packet
npm.cmd run typecheck:all
```

Expected: exit 0. The Minifix provenance tests must continue to report the live recipe as not fully sourced; that is an honest baseline, not a test failure.

- [ ] **Step 5: Commit only the progress ledger**

```powershell
git add .superpowers/sdd/global-connector-registry-progress.md
git commit -m "chore(connectors): record paired registry baselines"
```

---

## Authorized Task 1 remediation — manifest only

**Owner authorization:** `อนุมัติ baseline adoption + verifier migration`

**This dispatch covers only the adoption manifest. Do not copy or modify any
canonical baseline source yet. Do not modify the original dirty checkout.**

### Source and target

- Read-only source root:
  `C:\Users\thai3\determined-williams (2)`
- Isolated target worktree:
  `C:\tmp\monolith-global-connector-registry-parent`
- Task base commit:
  `13bcf5149570feb6ec5c7b15dbefd1fb88ef4161`
- Original nested runtime and isolated runtime are out of scope.

### Goal

Create a complete, hash-pinned, machine-readable allowlist for adopting the
small governed kitchen-kernel baseline that the current 27-test verifier
actually resolves to. The allowlist must be safe to execute mechanically in a
later reviewed task.

### Required outputs

Create and commit exactly:

- `docs/reports/2026-07-26-global-connector-registry-baseline-adoption-manifest.json`
- `docs/reports/2026-07-26-global-connector-registry-baseline-adoption-manifest.en.md`
- `docs/reports/2026-07-26-global-connector-registry-baseline-adoption-manifest.en.html`
- `docs/reports/2026-07-26-global-connector-registry-baseline-adoption-manifest.th.md`
- `docs/reports/2026-07-26-global-connector-registry-baseline-adoption-manifest.th.html`
- `.superpowers/sdd/task-1-baseline-adoption-manifest-report.md`

The report may remain ignored; the five manifest artifacts must be committed.

### Inclusion closure

Enumerate every included file individually with:

- repository-relative POSIX path;
- byte length;
- SHA-256 of the exact source bytes;
- purpose group;
- source Git state (`tracked`, `untracked`, or `modified`);
- target action (`ADD` or `REPLACE`);
- why the 27-test suite or verifier requires it.

Build the closure from real imports/path reads in:

1. `tools/verify_kitchen_kernel.py`;
2. all Python tests under `tests/` that contribute to its expected 27 tests;
3. the 15 declared parent bounded-context directories;
4. Component Master source, seed data and identity-tenancy contracts;
5. `CONTEXT*`, `CONTEXT-MAP*`, the verifier-required ADR/research/bootstrap
   editions, and an existing kitchen-kernel bootstrap report when the verifier
   conditionally requires it;
6. only the governance tools, hook/config files and fixtures transitively
   required by those tests.

Include `.gitkeep` only where it is the sole artifact preserving an otherwise
empty required bounded-context directory.

### Mandatory exclusions

No included path may:

- enter the nested `determined-williams/` repository;
- enter `Documents/`, `All aboute kitchen/`, `artifacts/`, `tmp/`,
  `.tmp.driveupload/`, `worktrees/`, downloads, archives, copied product
  systems, or any source-PDF/catalog directory;
- contain `desktop.ini`, `__pycache__`, `.pyc`, `.pyo`, generated verification
  output, dependency directories, build output, credentials or secret values;
- import unrelated parent documents or tools merely because they are nearby.

The JSON must also record exclusion rules and counts, without enumerating
thousands of excluded files.

### Required validation

Before commit:

1. Parse the JSON.
2. Re-read every included source file and prove size/SHA-256 match.
3. Prove every target path stays inside the isolated parent worktree.
4. Prove every included path passes the exclusion rules.
5. Trace all test imports and literal file reads; report unresolved references.
6. Confirm neither Git root outside the isolated parent worktree changed.
7. Confirm EN/TH Markdown are semantically aligned and both standalone HTML
   files contain the same manifest counts and digest.

Commit message:

```text
docs(kernel): manifest governed baseline adoption
```

### Output contract

Return:

- status (`DONE`, `DONE_WITH_CONCERNS`, or `BLOCKED`);
- commit SHA;
- included-file count and total bytes;
- manifest SHA-256;
- unresolved references or concerns;
- validation commands/results;
- `REPORT_FILE: <absolute path>`.
