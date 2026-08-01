# Task 1 verifier governed-core scope compatibility report

## Scope and repository precondition

- Repository: `C:\tmp\monolith-global-connector-registry-parent`
- Required starting branch: `codex/global-connector-registry`
- Required starting HEAD: `279bce44c57371e92af3c5d2a7482580c420f2d1`
- Starting porcelain status: empty
- Scope: verifier compatibility fix only; no Task 2 domain implementation, ledger, runtime, product-source, push, or merge work

## RED

The regression was added before verifier production code was changed.

```text
python -m unittest tests.test_verify_kitchen_kernel_contract.UnittestEvidenceContractTests.test_governed_suites_pin_adopted_modules_and_exact_counts -v
```

Result: exit `1`; `Ran 1 test`; expected assertion failure. The actual Component Master evidence command was still:

```text
python -m unittest discover -s tests/component_master -t . -v
```

The regression required the four adopted Component Master modules explicitly, so it failed for the intended discovery-scope defect.

## Minimal change

- Added immutable tuples for the four adopted Component Master modules and the one adopted identity-tenancy module.
- Built the two governed exact-count commands as `python -m unittest <modules...> -v`.
- Preserved exact governed counts `20` and `7`.
- Kept full-suite discovery dynamic with its existing minimum floor.
- Updated the existing fake-run classifier for module-style commands.
- Added one focused test that asserts the literal evidence command arrays plus actual and expected suite counts; it does not derive its expected commands from the production constants.
- Did not change schema `1.1.0`, Git evidence, count rules, full-suite semantics, or residual NFP limitations.

## GREEN before commit

| Check | Result |
| --- | --- |
| Exact new regression | exit `0`; 1 test; `OK` |
| Focused verifier contract module | exit `0`; 12 tests; `OK` (one additional test) |
| Explicit Component Master adopted modules | exit `0`; exactly 20 tests; `OK` |
| Explicit identity-tenancy adopted module | exit `0`; exactly 7 tests; `OK` |
| Full repository discovery | exit `0`; dynamic count 270 tests; `OK` |
| Claim linter over `docs` | exit `0`; allowlisted debt 110 hits across 25 files |
| Certification linter over `docs` | exit `0`; 34 documents checked; allowlisted debt 5 hits across 3 files |
| Staged scope | exactly `tests/test_verify_kitchen_kernel_contract.py` and `tools/verify_kitchen_kernel.py` |
| Staged whitespace check | exit `0` |
| Native `git hook run pre-commit` | exit `0` |

The governed commands were:

```text
python -B -m unittest tests.component_master.test_boring_standard tests.component_master.test_catalog_baseline tests.component_master.test_finish_taxonomy tests.component_master.test_seed_integrity -v
python -B -m unittest tests.identity_tenancy.test_contracts -v
```

The dynamic full-suite command was:

```text
python -B -m unittest discover -s tests -q
```

## Commit

- Commit: `e048ec3fb765ab53ae0f3778dfbe3a3483129711`
- Message: `fix(kernel): scope governed baseline suites explicitly`
- Files: `tests/test_verify_kitchen_kernel_contract.py`, `tools/verify_kitchen_kernel.py`
- No push or merge was performed.

## Single clean-HEAD verifier evidence

The verifier was run once after confirming empty porcelain status at committed HEAD `e048ec3fb765ab53ae0f3778dfbe3a3483129711`.

```text
python -B tools/verify_kitchen_kernel.py
```

Result:

- schema: `1.1.0`
- overall: `PASS`
- checks: `13/13 PASS`; `0` failed
- governed Component Master: `20/20`
- governed identity-tenancy: `7/7`
- dynamic full suite: `270` tests, minimum `27`

The summary recorded these evidence commands:

```text
C:\Users\thai3\AppData\Local\Programs\Python\Python314\python.exe -m unittest tests.component_master.test_boring_standard tests.component_master.test_catalog_baseline tests.component_master.test_finish_taxonomy tests.component_master.test_seed_integrity -v
C:\Users\thai3\AppData\Local\Programs\Python\Python314\python.exe -m unittest tests.identity_tenancy.test_contracts -v
C:\Users\thai3\AppData\Local\Programs\Python\Python314\python.exe -m unittest discover -s tests -v
```

Generated summary before exact cleanup:

- Path: `artifacts/verification/kitchen-kernel-bootstrap-summary.json`
- Bytes: `57,788`
- SHA-256: `dd840f7aa4bd85e79c350d10201dc841519ae42550a874cda42041b44ea3f0b5`

## Native review package

- Range: `279bce44c57371e92af3c5d2a7482580c420f2d1..e048ec3fb765ab53ae0f3778dfbe3a3483129711`
- Path: `.superpowers/sdd/task-1-verifier-core-scope-review-package.diff`
- Bytes: `4,674`
- SHA-256: `d27bfbf0af31e9e0aef9ea2dcac2433b5c6932e487bf3746bb9a88aa08558e8a`

## Residual limitations and concerns

The verifier's existing residual limitations remain unchanged:

1. ADRs and fixtures are Proposed and are not deployed runtime evidence.
2. All 19 component specs are Proposed; only 2 of 20 SKU records are primary-source Verified.
3. MON-BS-001 and all variants prohibit manufacturing release.
4. Finish mappings do not establish physical equivalence.
5. Supplier/product/model completeness remains unknown without contracted feeds.

The explicit governed module list is intentionally stable. A future intentional change to the adopted legacy baseline must update the module tuple and its exact-count contract deliberately. This is not a blocker for Task 2 registry tests because those tests remain included by dynamic full-suite discovery without expanding the governed 20-test baseline.
