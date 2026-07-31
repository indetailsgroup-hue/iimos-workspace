# Global Connector Registry — owner rulings of record

**Scope:** the `codex/global-connector-registry` lane, from Task 8 onward.
**Started:** 31 July 2026.

## Why this file exists

An independent review of the Task 8 ledger closeout found that the ledger
labels two commit waves **OWNER-RULED** and attributes review verdicts and
authorship in the chronology table, while **no artifact anywhere in the
repository records any of it**. Searched with
`grep -rl -iE "owner ruling|owner ruled|owner-ruled" --exclude-dir=.git .`
over all 263 non-`.git` files; it returns only the four editions of this
ledger, the Task 7 report and review package, and
`tests/component_master/registry/test_ingestion.py`. No Task 8 owner-ruling
record is among them. `51c6428b`'s commit message does carry the
contemporaneous line *"Scope is this directory only, by owner ruling"*;
`26d344e3`'s message carries no owner attribution at all. Git author metadata
cannot corroborate the distinction either, because every commit in the lane
carries one identity as both author and committer.

Deciding authority is the one axis the Task 7 ledger states must not blur.
A reader who wants to check who decided a wave currently cannot. This file is
the fix, going forward.

## What this file is, and what it is not

- It **is** a transcription, made by the orchestrator at the time of the
  ruling, of a decision the owner gave in the working session.
- It is **not** a signature, an approval record, or a countersigned document.
  Nothing here is owner-attested. If a ruling is transcribed wrongly, only the
  owner can say so.
- Rulings before Task 8 are not restated here. They are recorded inside the
  Task 1–7 closeouts in `.superpowers/sdd/global-connector-registry-progress.md`
  and are not moved.
- A ruling recorded here governs the lane until the owner changes it. A wave
  that cites a ruling must cite it by the identifier in the left column.

---

## OR-8.1 — End-of-line handling at the registry root

**Date:** 30 July 2026
**Governs:** `51c6428bf73fdeb41cc5faa5923f6143ad875633`
**Question put to the owner:** a fresh clone on Windows rewrote the committed
`coverage-snapshot.json` from LF to CRLF, so a reader could not confirm a
published digest against the file they received. Pin end-of-line handling, and
if so, over what scope?

**Ruling:** pin it, **at the registry root only**. The wider repository is not
to be renormalised in the same change.

**Recorded consequence:** the pinning is per-glob (`*.json -text`,
`*.jsonl -text`), so files inside the registry root that match neither glob —
`.gitattributes`, `.gitignore` — still convert on checkout. This is within the
ruling, not a deviation from it.

**Still open under this ruling:** the Task 1 baseline adoption manifest
publishes 77 path-and-SHA-256 pairs, none of which reproduce on a fresh
checkout. Whether that becomes its own wave has **not** been ruled.

## OR-8.2 — Explicit filename allowlist for non-item input

**Date:** 30 July 2026
**Governs:** `26d344e3edafb7a1e693c358087c001d51c0373b`
**Question put to the owner:** Task 9 will create `brand-universe.jsonl` and
`source-denominator.jsonl` in the registry root, and both would hard-fail
because every `*.jsonl` is read as item data. Add an allowlist?

**Ruling:** add it, with two binding constraints that the owner stated as part
of the option he selected:

1. The allowlist must be **explicit filenames, never a broad pattern**.
2. An unrecognized `.jsonl` must **still fail loudly** — never be skipped
   silently.

**Recorded consequence:** because no brand record type exists, a nonblank row
in `brand-universe.jsonl` is refused rather than given a guessed shape. That
row schema is Task 9's to define.

**Recorded gap, not covered by this ruling:** the loud-failure guarantee is
scoped to the `.jsonl` extension. A file at the registry root that is not
`*.jsonl` — for example a well-formed item object written as `items.json` — is
skipped silently and unannounced.

## OR-9.1 — How a named but unfetched source is represented

**Date:** 31 July 2026
**Governs:** Task 9, not yet implemented.
**Question put to the owner:** Task 9 declares the official source roots of 12
brands that **nobody has fetched yet**, but every type in the module is built
for sources that have been read and hashed. Three options were put:

- **A** — fetch and hash each source first; anything unfetchable becomes
  `BLOCKED` with a reason. No code change, but Task 9 becomes a network and
  rights-review task.
- **B** — add a third source state meaning *named, not yet read*, excluded from
  `registered_source_count`, with its own counted clause in
  `coverage_statement`.
- **C** — declare all 12 as `BLOCKED` with the reason "not yet fetched". No code
  change. **Recommended against**, because `BLOCKED` means *could not be read*,
  not *have not tried*, and reusing it that way is the relabel-to-pass-a-gate
  pattern the owner has forbidden.

**Ruling:** **B.**

**Binding constraint carried into the Task 9 brief:** the third state must not
be silent. `coverage_statement` must publish the count of declared-but-unread
sources in words, so the published sentence cannot be read as coverage. A third
state that is merely excluded from the registered count, without being spoken,
is the coverage inflation this module exists to prevent.

---

No ruling in this file grants manufacturing, freeze, export, or production
authority. `NOT-FOR-PRODUCTION` remains active. Daph remains one tenant and
does not own the shared registry or canonical platform data.
