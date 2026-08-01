# Task 3 evidence vault report

## Scope and precondition

- Repository: `C:\tmp\monolith-global-connector-registry-parent`
- Branch: `codex/global-connector-registry`
- Required clean starting HEAD:
  `3a29be5ecb69ecb99dac1d2500b57ace9c9b572a`
- Starting porcelain, cached diff, unstaged tracked diff and unmerged entries:
  empty
- The required `evidence.py`, evidence test and registry-v1 data directory
  did not exist at the starting HEAD.
- Work was confined to the isolated parent governance/bootstrap repository.
- The dirty owner root and nested runtime root were inspected separately and
  were not modified.
- No owner-root or nested-runtime file was changed. No push, merge, rebase,
  branch switch or worktree removal was performed.

## RED

The complete evidence tests and both registry data files were created before
production code.

```text
python -m unittest tests.component_master.registry.test_evidence -v
```

Result:

- Exit: `1`
- Loader count: `1`
- Expected failure:
  `ModuleNotFoundError: No module named 'monolith_component_master.evidence'`
- `packages/component-master/src/monolith_component_master/evidence.py`
  was confirmed absent immediately before RED.
- After making the test's `git check-ignore` calls self-contained for linked
  worktrees with a command-local `safe.directory`, RED was rerun with the
  production file still absent and failed for the same expected missing module.

## Minimal implementation

The implementation adds:

- exact frozen `SourceSnapshot` and `FieldAssertion` field shapes;
- typed prefix, nonblank, review-state and exact lowercase SHA-256 validation;
- exact-byte SHA-256 verification for bytes-like inputs without input mutation;
- a minimal `EvidenceVault.register()` type-directed boundary;
- required, hash-matching defensive immutable byte copies for source
  registration;
- duplicate source and assertion rejection before mapping replacement;
- strict `VERIFIED` assertion gating on a registered source and still-matching
  stored bytes;
- remote unregistered source references only for assertions that remain
  literally `PENDING`;
- deterministic source and assertion lookup without delete or promotion APIs;
- a tracked zero-record JSONL evidence-manifest seed without fabricated OEM
  evidence; and
- an anchored `/_source-cache/` ignore rule that does not ignore the manifest.

The package `__init__.py`, Task 2 models, legacy catalog, verifier, documents,
ledger and all Task 4+ surfaces were not changed.

## Targeted GREEN

```text
python -m unittest tests.component_master.registry.test_evidence -v
```

Result:

- Exit: `0`
- Evidence tests: exact `24`
- Final summary: `OK`

The tests cover exact immutable record shapes, every required source metadata
gate, hash format and tamper behavior, bytes-like handling, strict review
states, locator and reviewer requirements, duplicate rejection, defensive byte
copying, lookup behavior, fail-closed verified registration, non-promoting
pending candidates, ignore behavior and the zero-record JSONL seed.

## Compatibility and dynamic discovery

Task 2 registry plus legacy seed:

```text
python -B -m unittest tests.component_master.registry.test_registry_models tests.component_master.test_seed_integrity -v
```

Result:

- Exit: `0`
- Tests: `34`
- Task 2 registry contracts: `24`
- Legacy seed-integrity contracts: `10`
- Final summary: `OK`

Focused verifier contracts:

```text
python -B -m unittest tests.test_verify_kitchen_kernel_contract -v
```

Result:

- Exit: `0`
- Tests: `12`
- Final summary: `OK`

Full dynamic discovery:

```text
python -B -m unittest discover -s tests -q
```

Result:

- Exit: `0`
- Tests: `318`
- Increase from the Task 2 total of `294`: exact `24` Task 3 evidence tests
- Final summary: `OK`

`PYTHONDONTWRITEBYTECODE=1` was set for compatibility, focused, discovery and
final verifier commands and inherited by child processes where honored.

## Commit

- Commit: `24c83de030013e8fde7d9240de4ea5f116dc1d92`
- Message: `feat(registry): enforce field-level OEM evidence`
- Commit count from the required base: exactly `1`
- Diffstat: `4 files changed, 621 insertions`
- Staged whitespace check before commit: exit `0`
- Staged scope before commit: exactly the four paths below
- Unstaged tracked paths before commit: none
- Unmerged entries before commit: `0`

Tracked files and worktree SHA-256 evidence:

| Path | Bytes | SHA-256 |
|---|---:|---|
| `packages/component-master/src/monolith_component_master/evidence.py` | 5,951 | `951ac8878364e3303d07765dda0d68584254eced6f0faa6bdfdc2ab24051dc35` |
| `tests/component_master/registry/test_evidence.py` | 14,648 | `2f126207bfe53b5f4da51468c1efa7a20fde7fc8d7c2f043a68ba7be35085eb9` |
| `data/component-master/registry/v1/.gitignore` | 16 | `7cef16250e5c64ec07060449521d9f9f7900153837efca3136dbcd4d89cc16dc` |
| `data/component-master/registry/v1/evidence-manifest.jsonl` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |

The manifest is committed and `git check-ignore --no-index` returned `1` for
it. The sibling `_source-cache/source.pdf` probe returned `0`.

## Single clean-HEAD verifier

The verifier was run once at committed HEAD after empty porcelain, cached diff,
unstaged tracked diff and unmerged evidence was observed:

```text
python -B tools/verify_kitchen_kernel.py
```

Result:

- Exit: `0`
- Schema: `1.1.0`
- Overall: `PASS`
- Checks: `13/13 PASS`; `0` failed
- Dynamic full suite: `318` tests, exit `0`, real `OK`
- Governed Component Master suite: exact `20/20`, exit `0`, real `OK`
- Governed identity-tenancy suite: exact `7/7`, exit `0`, real `OK`
- Python compile check: pass
- Verifier Git evidence: HEAD
  `24c83de030013e8fde7d9240de4ea5f116dc1d92`, branch
  `codex/global-connector-registry`, zero porcelain, cached, unstaged and
  unmerged entries

Generated verifier summary before cleanup:

- Path:
  `artifacts/verification/kitchen-kernel-bootstrap-summary.json`
- Bytes: `66,350`
- SHA-256:
  `d7c5211f98eb2bd24094eda8f9f65a4c4e897bc8e6292faf203def4448b2dff4`

## Review package

- Range:
  `3a29be5ecb69ecb99dac1d2500b57ace9c9b572a..24c83de030013e8fde7d9240de4ea5f116dc1d92`
- Format: native `git diff --binary --full-index`
- Path:
  `.superpowers/sdd/task-3-evidence-vault-review-package.diff`
- Changed paths in package: exactly the four tracked files listed above
- Bytes: `22,541`
- SHA-256:
  `15ab2f449c402652ccd36a57c10811d165e8c785ac1bf3cf83e670a0daff2ca2`
- Reverse-apply validation at HEAD: exit `0`

## Cleanup and final state

- Removed the exact ignored generated verifier summary after recording its
  size and hash.
- Resolved and validated all cache targets under the isolated worktree, then
  removed exactly `8` generated `__pycache__` directories.
- Remaining verifier summary: absent.
- Remaining `__pycache__` directories: `0`.
- Final HEAD: `24c83de030013e8fde7d9240de4ea5f116dc1d92`.
- Final porcelain: empty.
- Final cached diff: empty, exit `0`.
- Final unstaged tracked diff: empty, exit `0`.
- Final unmerged entries: `0`.
- The ignored report and review-package artifacts are outside the commit.

Task 3 stops here. Task 4 was not started.
