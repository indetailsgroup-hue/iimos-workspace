# MONOLITH LINE Trust Foundation Program Plan

**Edition:** English<br>
**Date:** 26 July 2026<br>
**Status:** Program sequencing approved by the written design; implementation not started<br>
**Authoritative design:** `docs/superpowers/specs/2026-07-26-line-trust-foundation-design.en.md`<br>
**Active product repository:** nested `determined-williams/` Git repository<br>
**Governance repository:** parent workspace root

## 1. Executive outcome

MONOLITH will deliver the LINE Trust Foundation through six independently reviewable waves. Each wave must produce testable software, fresh evidence, a rollback boundary, and a commit that can be reviewed without accepting the next wave.

The program is not a live customer-messaging expansion. Its first commercial proof remains a second-tenant shadow journey with delivery blocked.

## 2. Mandatory program invariants

1. LINE remains the Human Surface, not the system of record or authorization authority.
2. Every business resource has exactly one owner tenant.
3. Daph is one pilot tenant and does not own platform governance or shared canonical data.
4. External organizations collaborate through scoped, expiring, revocable grants.
5. Unknown LINE participants can submit quarantined evidence only.
6. High-risk actions require action-bound step-up.
7. Delegation is explicit, bounded, revocable, non-transitive, and non-amplifying.
8. `site_code` remains a compatibility alias during migration and never becomes the canonical tenant boundary.
9. Business state, decision audit, and delivery intent commit atomically.
10. No live Tenant-2 messaging or broader customer messaging is enabled until every release gate passes.

## 3. Repository and execution controls

- Inspect the parent and nested Git roots before every wave.
- Read `CONTEXT.md` and the 21 July 2026 repository-scope correction before making maturity, runtime, migration, or readiness claims.
- Execute each wave in an isolated Git worktree created through `using-git-worktrees`.
- Preserve all pre-existing changes in both roots.
- Use `test-driven-development` for every feature or defect change.
- Use `verification-before-completion` before every success, test, build, migration, or release claim.
- Use `requesting-code-review` at the end of every wave.
- Produce all project-facing Markdown in English and Thai with matching standalone HTML.
- Keep live customer delivery disabled throughout Waves 1–6.

## 4. Dependency map

| Wave | Deliverable | Depends on | Enables |
|---|---|---|---|
| 1 | Trust Kernel contracts, canonical tenant bridge, shadow inbound observation | Approved design | Every later policy and isolation decision |
| 2 | Unified LINE ingress and dispatcher enforcement | Wave 1 shadow evidence | One webhook path for message, postback, group, room, and lifecycle events |
| 3 | LINE identity binding and risk-based step-up | Waves 1–2 | Consequential approvals and orders |
| 4 | Group authorization and quarantined evidence | Waves 1–3 | Safe field evidence and customer-group actions |
| 5 | Atomic outbox and reliable LINE delivery | Waves 1–4 | Retry-safe push/reply/group delivery |
| 6 | Tamper-evident audit, privacy lifecycle, Tenant-2 shadow proof, release dossier | Waves 1–5 | Executive go/no-go decision |

## 5. Wave 1 — Trust Kernel and shadow ingress

**Executable plan:** `docs/superpowers/plans/2026-07-26-line-trust-kernel-wave-1.en.md`

### Scope

- Create the canonical TypeScript decision contract.
- Add Tenant, Organization, Site, profile, membership, grant, delegation, and mapping structures additively.
- Preserve Daph behavior through a deterministic compatibility bridge.
- Add policy-decision records and a default-deny decision RPC.
- Observe verified LINE webhook events in a shadow inbox without changing business outcomes or sending messages.
- Produce a machine-readable shadow report.

### Exit gate

- New policy contract tests pass.
- Database isolation and mapping tests pass.
- Existing Daph LINE tests remain unchanged or pass with documented, reviewed updates.
- Every observed event has either a resolved owner tenant or an explicit unresolved reason.
- Shadow observation emits zero delivery intents.
- No live behavior is enforced.

## 6. Wave 2 — Unified ingress and dispatcher

### File boundary

- Modify `supabase/functions/line-webhook/index.ts`.
- Modify `supabase/functions/approval-postback/index.ts` into a compatibility adapter that invokes the same ingress contract.
- Create `supabase/functions/_shared/line-oa/dispatcher.ts`.
- Create `supabase/functions/_shared/line-oa/dispatcher.test.ts`.
- Create `supabase/migrations/0165_line_trust_unified_ingress.sql` after confirming Wave 1 owns migrations `0162`–`0164`.
- Add `tests/line-oa-commerce/py/test_unified_ingress_property.py`.

### Required behavior

1. Verify the LINE signature on the raw body before parsing.
2. Resolve the receiving channel and owner tenant.
3. Persist an idempotent receipt.
4. Claim processing with a lease.
5. Dispatch all supported event types through one registry.
6. Mark `SUCCEEDED` only after domain, audit, and delivery-intent transactions commit.
7. Record retryable failures as `RETRYABLE`; do not convert returned error values into success.
8. Reclaim stale leases safely.
9. Keep the separate approval URL disabled in LINE channel configuration.

### Exit gate

- Message, postback, follow, join, leave, group, room, and unsupported events have explicit test outcomes.
- Duplicate `SUCCEEDED` events no-op.
- Failed events are retryable or dead-lettered, never falsely succeeded.
- Approval postbacks traverse the unified dispatcher.
- Daph regression evidence passes before enforcement is enabled.

## 7. Wave 3 — Identity binding and action-bound step-up

### File boundary

- Modify `supabase/functions/line-login/index.ts`.
- Create `supabase/functions/line-login/index.test.ts`.
- Create `supabase/functions/line-auth-start/index.ts`.
- Create `supabase/functions/line-auth-start/index.test.ts`.
- Create `src/pages/LineStepUpPage.tsx` and its component test.
- Modify `src/routes/index.tsx` to add the authoritative step-up route.
- Create `supabase/migrations/0166_line_trust_identity_step_up.sql`.
- Add `tests/line-oa-commerce/py/test_identity_step_up_property.py`.

### Required behavior

1. Issue unpredictable server-side `state` and OIDC `nonce`.
2. Bind exact redirect URI, tenant, profile, action digest, expected revision, expiry, and one-time token digest.
3. Consume the transaction atomically before identity binding or session minting.
4. Reject missing, expired, mismatched, replayed, callback-swapped, or previously consumed transactions.
5. Show the exact consequence before confirmation.
6. Invalidate the transaction when revision, amount, scope, or payload changes.

### Exit gate

- Positive and negative state/nonce tests pass.
- Replays and callback swaps fail closed.
- A high-risk action produces `STEP_UP` until the exact transaction is consumed.
- No generic login session can approve a different action.

## 8. Wave 4 — Group authorization and quarantine

### File boundary

- Create `supabase/functions/_shared/line-oa/group-action-classifier.ts`.
- Create its unit test.
- Create `supabase/migrations/0167_line_trust_group_quarantine.sql`.
- Add `tests/line-oa-commerce/py/test_group_quarantine_property.py`.
- Add a quarantine review surface under `src/pages/` using the existing route and component conventions.

### Required behavior

1. Resolve group, owner tenant, project, organization party, human profile, membership, grants, and delegation independently.
2. Treat group membership as context only.
3. Store unknown-actor photos and issue reports as quarantined evidence.
4. Prohibit quarantined evidence from changing workflow state.
5. Require exact-action authorization for approval, acceptance, ordering, scope, price, and workflow transition.
6. Record review, promotion, rejection, retention, and purge events.

### Exit gate

- Wrong group, wrong project, wrong tenant, spoofed source, expired grant, and transitive delegation tests deny.
- Unknown actor evidence is retained without business mutation.
- Authorized low-risk evidence is linked to the correct project.
- High-risk group action requires Wave 3 step-up.

## 9. Wave 5 — Atomic outbox and delivery reliability

### File boundary

- Modify `supabase/functions/line-outbound-sender/index.ts`.
- Extend `tests/line-oa-commerce/ts/senderClaimAndRecord.integration.test.ts`.
- Create `tests/line-oa-commerce/ts/senderLeaseAndRetry.integration.test.ts`.
- Create `supabase/migrations/0168_line_trust_atomic_outbox.sql`.
- Add `tests/line-oa-commerce/py/test_atomic_outbox_property.py`.

### Required behavior

1. Persist delivery intent in the same transaction as business state and decision audit.
2. Atomically claim rows with owner, lease token, and lease expiry.
3. Use one stable retry key per delivery intent for LINE APIs that support it.
4. Distinguish success, duplicate acceptance, retryable failure, permanent failure, and unknown-after-send.
5. Use bounded backoff and dead letter.
6. Require audited operator reconciliation for unknown-after-send.
7. Never mark delivery successful when result recording fails.

### Exit gate

- Concurrent workers cannot own the same lease.
- Crash-before-send and crash-after-send scenarios reconcile without uncontrolled duplicates.
- `429`, `5xx`, permanent `4xx`, duplicate acceptance, and lease expiry tests pass.
- Secrets and access tokens do not appear in logs, audits, or error details.

## 10. Wave 6 — Audit, privacy, Tenant-2 proof, and release dossier

### File boundary

- Create `supabase/migrations/0169_line_trust_audit_privacy.sql`.
- Create `scripts/line-trust-shadow-report.mjs`.
- Create its Vitest test.
- Add `tests/line-oa-commerce/py/test_audit_privacy_property.py`.
- Create bilingual runbooks and matching HTML under `docs/runbooks/line-trust-foundation/`.
- Create machine-readable release evidence under `artifacts/line-trust/`.

### Required behavior

1. Record transport actor, human principal, tenant profile, delegated-by principal, action, resource, revision, digest, policy version, assurance, decision, reason, causation, retention class, and data classification.
2. Provide digest chaining or an external immutable archive proof.
3. Block secrets, raw authorization codes, bind tokens, and unnecessary PII.
4. Enforce retention, export, review, pseudonymization, and purge rules.
5. Create a second tenant in a non-live or blocked-delivery environment.
6. Prove negative tenant isolation, scoped collaboration, revocation, expiry, step-up, retry, backup/restore, rollback, and operator recovery.
7. Produce a release dossier naming commit, migrations, configuration, tests, environment, evidence hashes, reviewers, and approvers.

### Exit gate

- All ten release gates in the approved design pass with fresh complete output.
- Tenant-2 live delivery remains blocked.
- No open Critical or High finding remains.
- Executive reviewers receive an explicit go/no-go recommendation; the program does not self-enable production messaging.

## 11. Rollback strategy

| Wave | Rollback boundary |
|---|---|
| 1 | Disable shadow observer; retain additive canonical tables and mappings |
| 2 | Return routing to legacy behavior only after verifying no events remain leased; keep inbox records |
| 3 | Disable step-up initiation and preserve consumed transaction audit |
| 4 | Disable governed group actions; retain quarantined evidence under retention policy |
| 5 | Stop workers, expire leases, reconcile unknown-after-send, then restore the previous sender |
| 6 | Keep Tenant 2 blocked and retain release evidence; no live state needs reversal |

Rollback must never delete audit or evidence required to explain actions already taken.

## 12. Program decision gates

At the end of each wave, the owner chooses one:

- **Proceed:** every exit criterion passed with complete evidence.
- **Remediate:** scope stays fixed and failed evidence receives an owner and correction.
- **Stop:** disable the new runtime path and retain the evidence.
- **Redesign:** return to brainstorming when the approved invariant or architecture must change.

No wave may proceed on “expected to pass,” partial output, or source inspection alone.

## 13. Execution handoff

Wave 1 is the only implementation scope authorized by this program plan. Waves 2–6 each require their own reviewed agentic plan before code changes begin.

Recommended execution mode for Wave 1 is `subagent-driven-development`; inline execution may use `executing-plans`. Either mode must begin from an isolated worktree and preserve the current dirty repositories.
