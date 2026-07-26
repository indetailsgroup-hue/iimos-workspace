# Governed Baseline Adoption Manifest

**Edition:** English  
**Date:** 26 July 2026  
**Status:** Proposed mechanical allowlist; source baseline files are not copied by this task  
**Source:** `C:\Users\thai3\determined-williams (2)` at `8b65a1e974c5a34ee5abc12edab87d1ec54d69a4`  
**Target:** `C:\tmp\monolith-global-connector-registry-parent` at base `13bcf5149570feb6ec5c7b15dbefd1fb88ef4161`

## Summary

- Included files: **77**
- Total source bytes: **712400**
- Inventory SHA-256: `1d25a3fdc6bb008d227fcfc80e865dd244396f8842778135e5afa833bbabb2db`
- Digest contract: **SHA-256** over the **UTF-8 compact JSON serialization of `/files`**, preserving manifest array and object-key order, with **no trailing newline** (`ConvertTo-Json -Depth 20 -Compress`).
- Actions: **77 ADD**, **0 REPLACE**
- Source states: **77 untracked**, **0 tracked**, **0 modified**

The JSON file is the machine-readable authority. Every entry pins a POSIX repository-relative path, exact byte length, SHA-256, purpose group, source Git state, target action, and requirement trace.

## Purpose groups

| Purpose group | Files | Bytes |
| --- | ---: | ---: |
| bootstrap-configuration | 2 | 859 |
| bounded-context-skeleton | 13 | 598 |
| component-master-engine | 6 | 31243 |
| component-master-seed | 6 | 34035 |
| identity-tenancy-contracts | 2 | 7706 |
| identity-tenancy-documentation | 4 | 19098 |
| intended-27-test-suite | 7 | 24573 |
| repository-context | 8 | 42279 |
| verification-entrypoint | 1 | 20150 |
| verifier-required-adrs | 16 | 154669 |
| verifier-required-bootstrap-plan | 4 | 95589 |
| verifier-required-bootstrap-report | 4 | 64133 |
| verifier-required-research | 4 | 217468 |
| **Total** | **77** | **712400** |

## Execution boundary

This allowlist covers the governed parent kitchen-kernel baseline only. A later reviewed task may copy an entry only when the source bytes still match the pinned size and hash and when the resolved target remains inside the isolated parent worktree. The nested runtime and every forbidden noise root remain outside scope. This manifest makes no runtime, deployment, manufacturing, or production-readiness claim.

## Exclusions

The allowlist excludes the nested `determined-williams/` repository, `Documents/`, `All aboute kitchen/`, `artifacts/`, `tmp/`, `.tmp.driveupload/`, `worktrees/`, downloads, archives, copied product systems, source PDF/catalog directories, `desktop.ini`, bytecode/cache files, generated verification output, dependency/build output, credentials, secret values, and unrelated neighboring documents or tools. Exclusion counts in JSON are rule-class counts; the dirty tree was not broadly scanned or hashed.

## Existing target dependencies

The target already tracks the agent-guardrail and render-doc tests, their governance tools/hooks and allowlist, and `.github/workflows/claim-guardrails.yml`. They are recorded in JSON as existing target dependencies and are intentionally outside the ADD entries.

## Unresolved verifier migrations

- `VERIFIER-TEST-COUNT-MIGRATION` — `tools/verify_kitchen_kernel.py` hard-codes an expected count of 27 tests. The intended kitchen-kernel baseline is 20 Component Master tests plus 7 identity-tenancy tests, while full source-root discovery currently runs 258 tests because existing agent-guardrail and render-doc tests also participate. The next authorized TDD task must migrate this assertion.
- `VERIFIER-GIT-BOOTSTRAP-MIGRATION` — `check_git` asserts `head_exists == false`, zero staged paths, and zero remotes. The isolated adoption target is an established linked worktree, so the next authorized TDD task must migrate this bootstrap-only assertion.

## Later-task mechanical gate

Before any copy, parse the JSON, re-read each source file, verify exact bytes and SHA-256, reject forbidden paths, resolve each target underneath the isolated target root, and refuse a target whose current state conflicts with the recorded ADD action.
