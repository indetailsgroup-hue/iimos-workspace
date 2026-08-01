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

