# Task 9 brief — declare the first-cohort brand and source denominator

## Boundary

Task 9 declares **what we intend to cover**. It does not fetch anything, read
anything, or ingest anything. Tasks 10–12 do that.

This is the most misreadable task in the plan. A file listing twelve brands and
twelve official URLs looks exactly like coverage and is the opposite of it:
it is a list of work not yet done. Every design decision below exists to make
that impossible to misread.

Task 9 grants no manufacturing, freeze, export, or production authority. It
signs nothing. `NOT-FOR-PRODUCTION` stays intact. Daph remains one tenant.

## The owner ruling this task is built on — OR-9.1, 31 July 2026

Recorded at `docs/reports/2026-07-31-global-connector-registry-owner-rulings.en.md`.

The question was: the module's types are built for sources that have been read
and hashed, but Task 9 declares sources **nobody has fetched yet**. Three
options were put to the owner — fetch everything first (A), add a third source
state meaning *named, not yet read* (B), or declare all twelve `BLOCKED` with
the reason "not yet fetched" (C, recommended against as a relabel-to-pass).

**The owner ruled B**, with one binding constraint:

> The third state must not be silent. `coverage_statement` must publish the
> count of declared-but-unread sources **in words**, so the published sentence
> cannot be read as coverage. A third state that is merely excluded from the
> registered count, without being spoken, is the coverage inflation this module
> exists to prevent.

Implement B. Do not implement A or C, and do not blend them.

## The conflict you are resolving, reproduced

Do not rediscover this mid-task. It is measured and it is real.

The plan's Task 9 Step 3 says, in prose:

> "Each row records publisher, official URL, edition when printed, region,
> language, access date, rights state and one of `DISCOVERED`,
> `SOURCE_BLOCKED`, `DORMANT_OR_DEFUNCT` or `REVIEWED`."

Against the module as it stands at `26d344e3`:

- A declared denominator row holds **exactly** `blocked_reason`, `sha256`,
  `source_id`, `state`. Seven extra fields are refused by name, under any
  spelling.
- **All four** of the plan's states are outside `SOURCE_DENOMINATOR_STATES`,
  which is `("BLOCKED", "REGISTERED")`. `SOURCE_BLOCKED` is not `BLOCKED`; the
  check is literal membership.
- `SourceDenominatorEntry` requires `sha256` as 64 lowercase hex. The plan
  supplies none.

Consequently the plan's own Step 4 command exits `2` where the plan states
*"Expected: exit 0."* Your job includes making that command exit `0` **by
making the model right**, not by weakening the check.

## Exact tracked scope

Create:

```
data/component-master/registry/v1/brand-universe.jsonl
data/component-master/registry/v1/source-denominator.jsonl
tests/component_master/registry/test_first_cohort_denominator.py
```

Modify — **explicitly authorized, unlike Task 8**:

```
packages/component-master/src/monolith_component_master/coverage.py
tests/component_master/registry/test_release.py
data/component-master/registry/v1/coverage-snapshot.json
```

`coverage.py` must change, because OR-9.1 adds a state to a vocabulary that
lives there. `coverage-snapshot.json` must be rebuilt, because the registry
root will no longer be empty and the committed snapshot is a measurement of it.

**Do not modify `evidence.py`.** Task 8's constraint stands. If the API cannot
express what you need, report that rather than editing it.

If a fix genuinely requires a seventh path, **stop and report**. Task 8's
seventh path was added by owner ruling, not by implementer discretion, and that
is the only way a scope grant widens.

## Required contract

### The third state

Name it. Justify the name in one sentence in the docstring. It must read, to
someone who has never seen this module, as *named but not yet read* — not as a
weaker form of registered.

- It carries **no `sha256`**, because no bytes exist. The row schema must make
  `sha256` required for the states that have bytes and refused for the state
  that does not — not optional for everyone. An optional digest is how a
  registered source silently loses its hash.
- It is **excluded from `registered_source_count`**, which continues to mean
  exactly *"readable and hash-verified"*.
- It gets its **own counted line in `coverage_statement`**, in words, carrying
  its denominator like every other count. This is the owner's binding
  constraint and it is the single most important line in the task.
- It is **not** `BLOCKED`. A blocked source is one somebody tried to read and
  could not. Nothing may collapse the two, in either direction.

### The evidence gate must refuse it distinctly

A record claiming `VERIFIED` whose assertion names a source in the new state
must be **refused**, and the refusal must name that state as the reason. It
must not collapse into `SOURCE_NOT_REGISTERED`, which means *this source is not
in the denominator at all* — a different and less alarming fact.

Follow `ae14fb66`'s discipline exactly: reachability is **derived** by a test
that drives every reason and asserts which surface produced it, never
hand-written. Add the new reason to that derivation, and confirm the guard
still fails when a reason is added without a demonstration.

### The `sha256`-on-`BLOCKED` question

`SourceDenominatorEntry` currently requires 64 hex for `BLOCKED` too — a digest
for a source nobody could read. Decide whether that is intended and say which:

- If it is intended, document what those bytes are, in the docstring.
- If it is a defect, **report it and do not fix it here** unless the same edit
  is unavoidable. Record it either way.

Do not quietly extend the new state's no-digest rule to `BLOCKED` as a
side-effect.

### The two row schemas

Both are yours to define; Task 8 deliberately refused to guess them.

`source-denominator.jsonl` — decide, and state in the docstring, what happens
to each of the plan's seven concepts. Any of three answers is acceptable if it
is argued: admit the field, refuse it with a reason that names where it belongs
instead, or defer it to a later task. **Silence is not an answer.** In
particular, `rights_state`: recording a URL is not asserting a right to use
what is behind it, and whatever you admit must not imply one.

`brand-universe.jsonl` — the twelve brands, exactly as the plan names them:
Häfele, Hettich, Titus, Lamello, Italiana Ferramenta, OVVO, Lockdowel,
Välinge/Threespine, KNAPP, Festool DOMINO, Hoffmann Machine Company, Blum.
A row must be refusable — a brand row that no rule validates is the same
silence Task 8 forbade for items.

### What the counts must not become

- No blended score. Each dimension keeps its own count, as today.
- Every count keeps its denominator and its `measured_by`.
- **Twelve brands is a first cohort, not the world.** Nothing in the payload,
  the statement, the tests, or the report may read as a worldwide or complete
  registry. The connector market is not twelve brands and this task does not
  claim it is.

## Determinism — unchanged, and now with real content

Task 8's rules carry over verbatim and are now exercised against non-empty
input for the first time:

- Canonical JSON, sorted keys, stable record order, LF, no wall-clock in the
  hashed payload.
- Two builds in separate processes, byte-identical, under `PYTHONHASHSEED=random`.
- Input order must not change output bytes.
- If a value cannot be canonicalized deterministically, refuse.

The rebuilt `coverage-snapshot.json` must be pinned by test to its new digest,
the way the empty-root digest is pinned today.

## Required tests

`tests/component_master/registry/test_first_cohort_denominator.py`, plus
additions to `test_release.py` where the contract it already pins moves.
At minimum:

1. **The exact brand set** — all twelve, no more, no fewer, and a thirteenth
   brand is a failure rather than a silent addition.
2. **A declared-but-unread source is counted, named, and spoken** — it appears
   in its own count, and the literal `coverage_statement` string contains the
   declared-but-unread clause. Assert the rendered sentence, not just the
   count.
3. **It is not registered** — `registered_source_count` does not move when a
   source in the new state is added.
4. **It is not blocked** — `blocked_source_count` does not move either, and the
   two states are distinguishable in the payload.
5. **A verified claim naming it is refused, with the new reason** — and the
   reason is distinct from `SOURCE_NOT_REGISTERED`.
6. **`sha256` on the new state is refused**, not ignored, because a digest for
   bytes nobody holds is a false claim.
7. **The plan's own Step 4 command exits `0`** over the real committed files.
8. **Determinism over non-empty input** — separate processes, reversed order,
   identical bytes and identical digest.
9. **The rebuilt snapshot digest is pinned**, and a fresh build reproduces the
   committed file byte-for-byte.
10. **Reachability derivation still guards** — adding a reason without a
    demonstration still fails.

RED first, and **observe the red yourself**. Reconstructed RED was ruled
inadmissible in Task 7 and that ruling stands.

## Process requirement — this one is not optional

Task 8 produced **no report artifact and no review-package diff**, unlike
Tasks 1–7. Its per-wave RED is consequently unevidenced by anything that
survives, and the ledger had to record that as a process regression.

Task 9 must not repeat it. Write to disk, before the ledger closeout:

```
.superpowers/sdd/task-9-denominator-report.md
.superpowers/sdd/task-9-denominator-review-package.diff
```

The review package must contain exactly the Task 9 paths and reverse-apply
cleanly at the accepted HEAD.

## Evidence discipline for the report

- Derive every figure from a live run or from git. Do not retype them.
- Any claim of the form "there are zero X" must cite the command that counted
  them, with the scope searched stated beside it.
- State which suites you observed in RED first-hand. Do not reconstruct RED.
- Label environment-derived digests as non-portable.
- The twelve URLs in the plan are **unvisited** by this task. Do not describe
  them as verified, reachable, current, or licensed. You have not looked.

## Out of scope

Fetching any source. Ingesting any assertion. Populating the registry with
component data. Rights review of the twelve publishers. Release signing.
Network access. Runtime integration. Freeze or export authority.

The Task 1 baseline manifest's 77 unreproducible digests are a separate,
unruled matter and are not Task 9's.

No production or manufacturing readiness claim may appear anywhere. No software
test in this task establishes physical qualification, coupon testing, machine
capability, first-article inspection, field validation, or owner ratification.
