# Agent Claim Guardrails Implementation Plan

> ## ✅ STATUS: COMPLETED 2026-07-23 — DO NOT RE-EXECUTE THIS PLAN
>
> All 7 tasks were executed, twice-reviewed (Claude adversarial workflows + GPT-5.6 Sol
> cross-vendor), and committed on `guardrails/claim-linters`: `fc99947` (Tasks 1+4),
> `11ddd0e` (2+3), `9c0ab40` (5), `7d8afab` (6), `9261ce3` (7). Execution record:
> `.superpowers/sdd/progress.md`. Checkboxes below are historical.
> Re-running RED steps against this now-GREEN code would overwrite reviewed work —
> the exact trap recorded at `worktrees/review-pr31/WORKTREE-SCOPE.en.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn two agreements from the 2026-07-21 grill into mechanisms that fire on the shape of written output, so a negative capability claim cannot be published without search evidence and a certification cannot be published without adversarial evidence.

**Estimated tasks:** 7 | **Estimated time:** ~230 min | **Touches:** tools/ · tests/ · docs template

## Current Problem / Current Solution

On 2026-07-21 an agent produced 12 recorded errors in one session. Seven shared a single signature: a search was run one way, it found nothing, and the result was published as absence. Examples, all wrong: *"ADR-065 does not exist"* (it is at `.kiro/steering/architecture-decisions.md:694`), *"431 test files"* (counted `node_modules`; real figure 259), *"HOMAG publishes no API"* (read marketing pages, not the technical portal).

Two tools now exist and are tested:

| Tool | Covers |
|---|---|
| `tools/verify_absence.py` | 4 search methods × 2 roots × spelling variants, EN+TH; a negative result explicitly refuses to license the words "does not exist" |
| `tools/change_budget.py` | snapshot/check with content digests; exit 1 when changes fall outside the declared budget |

**Both are opt-in.** Nothing forces either to run. That is the whole problem: the rule against publishing unverified absence was already written down in the Evidence Ledger §8 — by the same agent — and was violated four more times after being authored. Rules that depend on the agent noticing its own risk have a 100% failure rate in the recorded data.

Two grill decisions remain agreements rather than mechanisms:

- **Item 1** — a document making a negative capability claim must carry a pasted `verify_absence` evidence block.
- **Item 3** — a sentence certifying something is safe/clean/passing must be preceded by an adversarial check.

## Proposed Approach

Build two linters that detect the **shape of the sentence**, not the agent's intent, and fail the build when the required evidence is absent.

The governing principle from the grill:

> A mechanism must be triggered by the shape of output or an observable state, never by the agent recognising it is at risk.

The central design problem is **false positives**. Thai prose contains `ไม่มี` constantly (`ไม่มีปัญหา`, `ไม่มีอะไรเพิ่ม`), and a linter that fires on every occurrence becomes noise, gets disabled, and leaves the project worse off than with no linter at all.

The narrowing rule: **flag only a negative word co-occurring with a named artifact** — a backticked identifier, a file path, an ADR id, or a `CamelCase`/`snake_case` symbol. Every one of the seven recorded failures had that shape (`ADR-065`, `computePanelCutSize`, `tenant_id`, `API`, `MPR exporter`). Ordinary prose does not.

Shared detection logic lives in one module so both linters, and their regression corpus, agree on what a claim is.

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| Agent writes "`computePanelCutSize` is not implemented anywhere" in a doc | Published as fact; corrected hours later by an unrelated tool run | `lint_claims` exits 1 at that line: negative claim about a named symbol with no evidence block |
| Agent writes "the guard is safe" about `rm -rf` | Published; an adversary later found the guard is a prefix check that `/tmp/../home` walks out of | `lint_certifications` exits 1: certification with no adversary marker |
| Agent runs `verify_absence` and pastes the output | No difference — evidence was optional | Lint passes; the evidence block is the citation |
| Doc says "ไม่มีปัญหาเรื่องนี้" in ordinary prose | n/a | Not flagged — no named artifact in the sentence |

## Assumptions & Risks

- **Assumed:** the co-occurrence rule (negative word + named artifact) is narrow enough to keep the false-positive rate low enough that nobody disables the linter. This is the plan's main bet and Task 1 must measure it against the existing `docs/` corpus, not assume it.
- **Assumed:** `python -m unittest discover -s tests -t .` remains the runner. Verified today: 27 tests, OK.
- **Assumed:** agents paste tool output into documents rather than linking it. If they link, the evidence-block detector needs a second accepted form.
- **Risk:** the linter fires on the many existing docs written before this rule. Task 4 must measure the backlog and decide grandfathering explicitly rather than silently weakening the rule.
- **Risk:** an agent satisfies the linter by pasting a *stale or unrelated* `verify_absence` block. The linter checks presence and term match, not freshness. Named as a known gap, not solved here.
- **Risk:** certification phrases are far more open-ended than negation phrases. The Task 3 inventory will be incomplete on the first pass; the regression corpus is what grows it.

## Impact

- A negative capability claim cannot reach a committed document without search evidence attached.
- A safety or pass certification cannot reach a committed document without an adversary marker.
- Both failures become greppable by the owner, so skipping the mechanism is visible rather than silent.
- The regression corpus makes each recorded error permanently non-repeatable, which is the only property the 2026-07-21 data supports.

---

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code. Each task is a RED -> GREEN -> REFACTOR slice.
> **Parallel-first:** Spawn separate sub-agents for independent lanes. Do not parallelize tasks that can race on the same files, migrations, generated artifacts, or shared state.

1. **Claim detection library** - Lane A | Can run together: `Task 4` | Must wait for: `none` | TDD slice: sentence-classification tests over EN+TH fixtures, including attributed and refuted claims -> `tools/claim_detect.py` -> false-positive rate measured against real `docs/` (baseline: 402 negative + 190 certification hits across 171 docs)
2. **Negative-claim linter (Item 1)** - Lane B | Can run together: `Task 3` | Must wait for: `Task 1` | TDD slice: doc fixture with unevidenced absence claim exits 1 -> `tools/lint_claims.py` -> exit 0 once evidence block added
3. **Certification linter (Item 3)** - Lane C | Can run together: `Task 2` | Must wait for: `Task 1` | TDD slice: doc fixture certifying "safe" without adversary marker exits 1 -> `tools/lint_certifications.py` -> exit 0 with marker
4. **Evidence block format + doc template** - Lane D (docs/config-only) | Can run together: `Task 1` | Must wait for: `none` | Verification: `render_docs.py` renders the block; format is machine-parseable by Task 2
5. **Regression corpus from the 12 recorded errors** - Lane E | Can run together: `none` | Must wait for: `Task 2`, `Task 3` | TDD slice: each recorded 2026-07-21 error becomes a fixture the linters must catch -> tune detectors -> all 12 caught or explicitly out of scope
6. **Allowlist + deep mode** - Sequential | Can run together: `none` | Must wait for: `Task 5` | TDD slice: allowlisted file fails when its hit count rises -> `--write-allowlist` + `--deep` -> debt printed on every run
7. **Three-layer enforcement** - Sequential | Can run together: `none` | Must wait for: `Task 6` | Verification: a branch with a deliberately unevidenced claim must fail CI

---

### Task 1: Claim detection library

**Files:**

- Create: `tools/claim_detect.py`
- Create: `tests/agent_guardrails/__init__.py`
- Test: `tests/agent_guardrails/test_claim_detect.py`

**Parallelization:**

- Can run with: `Task 4`
- Must wait for: `none`
- Race risk: none — new files only

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development` before editing production code. RED -> GREEN -> REFACTOR.

- [ ] **Step 1: Write the failing test**

```python
from tools.claim_detect import find_negative_claims, find_certifications

def test_flags_negation_with_named_symbol():
    hits = find_negative_claims("`computePanelCutSize` is not implemented anywhere.")
    assert len(hits) == 1
    assert hits[0].term == "computePanelCutSize"

def test_flags_thai_negation_with_named_symbol():
    hits = find_negative_claims("`ADR-065` ไม่มีอยู่ในทั้งสองราก")
    assert len(hits) == 1

def test_ignores_ordinary_thai_prose():
    assert find_negative_claims("ตรวจแล้วไม่มีปัญหาอะไรเพิ่มเติม") == []

def test_ignores_negation_without_named_artifact():
    assert find_negative_claims("There is no reason to rush this.") == []

def test_flags_certification():
    hits = find_certifications("The `rm -rf` guard is safe.")
    assert len(hits) == 1
```

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

```
python -m unittest tests.agent_guardrails.test_claim_detect -v
```

Expected: FAIL on missing module `tools.claim_detect`, not on syntax or fixture errors.

- [ ] **Step 3: Implement the minimal code**

`find_negative_claims(text)` returns hits where a negation marker and a named artifact occur in the same sentence.

- Negation markers EN: `does not exist`, `there is no`, `is absent`, `not implemented`, `not found`, `lacks`, `no … anywhere`, `missing`
- Negation markers TH: `ไม่มี`, `ขาด`, `ไม่พบ`, `ไม่ได้มี`, `หายไป`
- Named artifact: backticked span, a path containing `/` or `\`, `ADR-\d+`, or a `camelCase`/`snake_case`/`SCREAMING_CASE` token of length ≥ 4

`find_certifications(text)` uses the same sentence split with certification markers: `is safe`, `is clean`, `passes`, `verified`, `no issues`, `works correctly`, `ปลอดภัย`, `สะอาด`, `ผ่านแล้ว`, `เรียบร้อย`, `ไม่มีปัญหา`.

Sentence splitting must handle Thai, which does not use spaces between words or a full stop. Split on newline, `.` followed by whitespace, `·`, and `—`.

- [ ] **Step 4: Run the test and confirm it passes**

```
python -m unittest tests.agent_guardrails.test_claim_detect -v
```

- [ ] **Step 5: Measure the false-positive rate before refactoring**

This step is the plan's main bet and must produce a number, not an impression.

```
python -c "from tools.claim_detect import find_negative_claims, find_certifications; import pathlib,sys; docs=list(pathlib.Path('docs').rglob('*.md')); n=sum(len(find_negative_claims(p.read_text(encoding='utf-8'))) for p in docs); c=sum(len(find_certifications(p.read_text(encoding='utf-8'))) for p in docs); print(f'{len(docs)} docs, {n} negative-claim hits, {c} certification hits')"
```

Then hand-inspect 20 random hits. If more than ~30% are ordinary prose rather than real claims, tighten the named-artifact rule before continuing — a noisy linter will be disabled, and a disabled linter is worse than none. Record the measured rate in the module docstring.

---

### Task 2: Negative-claim linter (Item 1)

**Files:**

- Create: `tools/lint_claims.py`
- Test: `tests/agent_guardrails/test_lint_claims.py`
- Create: `tests/agent_guardrails/fixtures/unevidenced_absence.md`
- Create: `tests/agent_guardrails/fixtures/evidenced_absence.md`

**Parallelization:**

- Can run with: `Task 3`
- Must wait for: `Task 1` — imports `claim_detect`
- Race risk: none — separate files from Task 3

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development`. RED -> GREEN -> REFACTOR.

- [ ] **Step 1: Write the failing test**

```python
def test_unevidenced_absence_claim_fails(tmp_path):
    assert lint_file(FIXTURES / "unevidenced_absence.md") != []

def test_evidenced_absence_claim_passes(tmp_path):
    assert lint_file(FIXTURES / "evidenced_absence.md") == []

def test_evidence_must_match_the_claimed_term():
    # a verify_absence block for a DIFFERENT term does not satisfy the claim
    assert lint_file(FIXTURES / "mismatched_evidence.md") != []
```

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

```
python -m unittest tests.agent_guardrails.test_lint_claims -v
```

- [ ] **Step 3: Implement the minimal code**

For each negative claim found by `claim_detect`, search the surrounding document for an evidence block whose recorded term matches the claimed artifact. Accept the format defined in Task 4. Report `file:line: unevidenced absence claim about '<term>'` and exit 1 when any remain.

CLI: `python tools/lint_claims.py [paths...]`, defaulting to `docs/`. Never walk `determined-williams/` or `worktrees/` — both hold uncommitted third-party work.

- [ ] **Step 4: Run the test and confirm it passes**

```
python -m unittest tests.agent_guardrails.test_lint_claims -v
```

- [ ] **Step 5: Refactor only after green**

---

### Task 3: Certification linter (Item 3)

**Files:**

- Create: `tools/lint_certifications.py`
- Test: `tests/agent_guardrails/test_lint_certifications.py`
- Create: `tests/agent_guardrails/fixtures/bare_certification.md`
- Create: `tests/agent_guardrails/fixtures/adversary_backed_certification.md`

**Parallelization:**

- Can run with: `Task 2`
- Must wait for: `Task 1` — imports `claim_detect`
- Race risk: none — separate files from Task 2

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development`. RED -> GREEN -> REFACTOR.

- [ ] **Step 1: Write the failing test**

```python
def test_bare_certification_fails():
    assert lint_file(FIXTURES / "bare_certification.md") != []

def test_certification_with_adversary_marker_passes():
    assert lint_file(FIXTURES / "adversary_backed_certification.md") == []

def test_certification_with_command_output_passes():
    # a pasted command + its output is also acceptable evidence
    assert lint_file(FIXTURES / "command_backed_certification.md") == []
```

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

```
python -m unittest tests.agent_guardrails.test_lint_certifications -v
```

- [ ] **Step 3: Implement the minimal code**

Accept two evidence forms adjacent to the certification: an `<!-- adversary: <label> -->` marker, or a fenced code block containing a command and its output. Report `file:line: uncorroborated certification` and exit 1.

- [ ] **Step 4: Run the test and confirm it passes**

- [ ] **Step 5: Refactor only after green**

---

### Task 4: Evidence block format + doc template

**Files:**

- Create: `docs/_templates/evidence-block.md`
- Modify: `tools/render_docs.py` — only if the block renders badly; verify first

**Parallelization:**

- Can run with: `Task 1`
- Must wait for: `none`
- Race risk: `tools/render_docs.py` is shared with no other task in this plan, but confirm no other agent is editing it before modifying

**Docs/config-only exception:** this task defines a text format and has no runtime behavior of its own. A failing behavior test belongs in Task 2, which consumes the format. Verification below is the smallest meaningful check.

- [ ] **Step 1: Define the format**

```markdown
<!-- verify_absence: computePanelCutSize @ 2026-07-21 -->
```
```
# verify_absence — computePanelCutSize
variants searched (5): ...
RESULT: NOT LOCATED by any method above.
```
```

The HTML comment carries the machine-readable term and date; the fenced block carries the human-readable proof. Task 2 parses the comment, not the prose.

- [ ] **Step 2: Verify it renders**

```
python tools/render_docs.py docs/_templates/evidence-block.md
```

Expected: exit 0; open the HTML and confirm the fenced block is readable and the HTML comment does not leak into visible text.

- [ ] **Step 3: Measure the existing backlog**

```
python tools/lint_claims.py docs/ | wc -l
```

Record the count. Decide explicitly with the owner whether to grandfather existing documents by date or to fix them. **Do not weaken the detector to make the number small** — that converts a real backlog into a hidden one.

---

### Task 5: Regression corpus from the 12 recorded errors

**Files:**

- Create: `tests/agent_guardrails/test_recorded_failures.py`
- Create: `tests/agent_guardrails/fixtures/recorded/*.md`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 2`, `Task 3` — needs both linters
- Race risk: tunes detector thresholds in `tools/claim_detect.py`, which Tasks 2 and 3 depend on; must not run concurrently with them

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development`. RED -> GREEN -> REFACTOR.

- [ ] **Step 1: Write the failing test**

One fixture per recorded 2026-07-21 error, using the actual published wording. Sources: `docs/reports/2026-07-21-monolith-repository-production-readiness-baseline.en.md` §1, `docs/research/2026-07-21-monolith-vendor-standards-evidence-ledger.en.md` §6, and `docs/research/competitors/pplx-corpus-errata.md`.

```python
RECORDED = [
    ("adr_065",        "`ADR-065`: No file found anywhere in either root", "negative"),
    ("cut_size",       "`computePanelCutSize` is not implemented anywhere", "negative"),
    ("no_api",         "No page mentions an `API` at all",                 "negative"),
    ("test_count",     "431 test files exist under `determined-williams/`", "count"),
    ("rm_guard",       "The `rm -rf` guard is safe",                        "certification"),
    ("only_touched",   "Only the intended files in `docs/plans/` were touched", "certification"),
    # ... one entry per recorded error
]

def test_every_recorded_failure_is_caught():
    missed = [name for name, text, kind in RECORDED if not _detected(text, kind)]
    assert missed == [], f"regression corpus not caught: {missed}"
```

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

```
python -m unittest tests.agent_guardrails.test_recorded_failures -v
```

Expected: FAIL listing the specific recorded errors the current detectors miss.

- [ ] **Step 3: Tune the detectors until every recorded failure is caught**

Tune `tools/claim_detect.py`. After each change re-run Task 1's false-positive measurement — tightening recall usually costs precision, and the trade must stay inside the threshold set in Task 1 Step 5.

Any recorded error the shape-based detectors cannot catch — the "one hour" estimate and the wrong-shadowing warning are the likely two — must be listed explicitly in the test file as out of scope with a one-line reason. **Do not delete them from the corpus to make the suite green.**

- [ ] **Step 4: Run the full suite and confirm nothing else broke**

```
python -m unittest discover -s tests -t .
```

Expected: the pre-existing 27 tests still pass, plus the new guardrail tests.

- [ ] **Step 5: Refactor only after green**

---

## Owner decisions — resolved 2026-07-21

All three previously-open items were decided by the owner. Measurements were taken before deciding, not after.

### Measured backlog

```
docs scanned        : 171
negative-claim hits : 402  across 49 files
certification hits  : 190  across 50 files
```

Top offenders are the documents written on 2026-07-21 to *record and refute* claims —
`plans-review-worktree-review-pr31.th.md` (71), `ima-audit-independent-claim-verification.th.md` (53),
`pplx-corpus-errata.md` (19).

**This changes the design.** Those files trip the detector because their whole purpose is quoting a
false claim and refuting it. A sentence like *"Perplexity claimed System 32 was absent — refuted at
`policy.ts:150`"* contains a negation and a named artifact while being the exact opposite of an
unevidenced claim. **A naive detector fires hardest on the most careful documents.** Task 1 must
therefore also recognise:

- **attributed claims** — negation inside a quote, or following `claimed`, `said`, `reported`, `อ้างว่า`, `ระบุว่า`
- **refuted claims** — a negation followed within the same or next sentence by a `file:line`, a commit sha, or a `CONTRADICTED`/`REFUTED` verdict marker

Neither form requires a `verify_absence` block. Add these as failing tests in Task 1 Step 1.

### Decision 1 — Grandfathering: shrinking allowlist

`tools/.lint_allowlist` records `path<TAB>accepted_hit_count` captured at adoption. A file in the
allowlist passes at or below its recorded count and **fails if the count increases**. Files not in
the allowlist must be clean.

- Chosen over fixing all 402 (many are legitimate attributed or refuted claims) and over date-based
  grandfathering (which hides the debt).
- **Accepted downside:** an allowlist prevents regression but does not force progress. If nobody
  reduces the numbers they stay forever. The total is printed on every run so the debt stays visible.

### Decision 2 — Evidence freshness: re-run the search in CI

The real staleness risk is not the document changing — it is the **repository** changing. If
`computePanelCutSize` is implemented tomorrow, a correct "not located" claim becomes false with no
edit to any document.

- **local mode** (default): presence and term match only. Milliseconds.
- **`--deep` mode** (CI): re-run `verify_absence` for every claimed term and **fail if the term is now
  found**. A dead claim surfaces immediately.

Chosen over a fixed TTL (an invented number), document mtime (measures the wrong thing), and HEAD-sha
pinning (goes stale every commit, becomes noise, gets disabled).

- **Accepted downside:** re-running hundreds of terms is slow. Mitigation: `--deep` runs only for terms
  in files touched by the diff, plus a full nightly sweep.

### Decision 3 — Enforcement: three layers

| Layer | Fires when | Bypassable |
|---|---|---|
| Claude Code `PostToolUse` hook on `Write`/`Edit` matching `docs/**.md` | the moment an agent writes the file | not by the agent; the owner can disable it in settings |
| `git` pre-commit hook | at commit; also catches human edits | yes, `--no-verify` |
| CI job | on push / PR | **no** |

All three. The first two are fast feedback; **CI is the only layer with actual authority.**

**This is not 100% coverage and must not be described as such.** Linters read files. A claim made in
chat is read by no linter, and the grill established that every recorded error was spoken in chat
before it reached a document. The chat-wording rule from grill decision 2 remains a convention
enforced only by the owner grepping for banned phrasing. Claiming complete coverage here would be the
same class of error this plan exists to prevent.

---

### Task 6: Allowlist and deep mode

**Files:**

- Create: `tools/.lint_allowlist`
- Modify: `tools/lint_claims.py` — add `--deep` and allowlist handling
- Test: `tests/agent_guardrails/test_allowlist.py`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 5` — thresholds must be settled before the allowlist is captured
- Race risk: edits `tools/lint_claims.py`, owned by Task 2

- [ ] **Step 0: Load the TDD discipline**

- [ ] **Step 1: Write the failing test**

```python
def test_allowlisted_file_passes_at_recorded_count():
    assert lint([FIX / "grandfathered.md"], allowlist={"grandfathered.md": 3}) == []

def test_allowlisted_file_fails_when_count_increases():
    assert lint([FIX / "grandfathered.md"], allowlist={"grandfathered.md": 2}) != []

def test_attributed_claim_is_not_flagged():
    assert find_negative_claims("Perplexity claimed `System 32` does not exist.") == []

def test_refuted_claim_is_not_flagged():
    assert find_negative_claims("Claimed absent — refuted at `policy.ts:150`.") == []

def test_deep_mode_fails_when_term_is_now_found():
    # evidence says NOT LOCATED, but verify_absence finds it today
    assert lint([FIX / "dead_claim.md"], deep=True) != []
```

- [ ] **Step 2: Run and confirm failure**

```
python -m unittest tests.agent_guardrails.test_allowlist -v
```

- [ ] **Step 3: Implement**

Capture the allowlist only after Task 5 has settled the detectors:

```
python tools/lint_claims.py docs/ --write-allowlist
```

- [ ] **Step 4: Run and confirm pass**

- [ ] **Step 5: Print the debt on every run**

Every invocation ends with `allowlisted debt: N hits across M files`. A number nobody sees is a number
nobody reduces.

---

### Task 7: Three-layer enforcement

**Files:**

- Create: `.github/workflows/claim-guardrails.yml`
- Create: `tools/hooks/pre-commit`
- Modify: `~/.claude/settings.json` — `PostToolUse` hook (owner-approved change outside the repo)

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 6` — enforcing a linter that still has an unsettled allowlist will block all work
- Race risk: `~/.claude/settings.json` is user-global; read it, merge, never overwrite. It already
  carries an `env` block and a `permissions.allow` list that must survive.

**Docs/config-only exception:** these are wiring, not behavior. The behavior is tested in Tasks 2, 3,
5 and 6. Verification below is the smallest meaningful check per layer.

- [ ] **Step 1: CI — the authoritative layer, build this first**

```yaml
- run: python tools/lint_claims.py docs/ --deep
- run: python tools/lint_certifications.py docs/
```

Verify by pushing a branch containing a deliberately unevidenced claim and confirming the job fails.
**A gate that has never been seen to fail has not been verified.**

- [ ] **Step 2: pre-commit**

Local mode only — a commit hook that re-runs searches would be too slow and would be removed.

- [ ] **Step 3: Claude Code PostToolUse hook**

Matcher on `Write|Edit` where the path matches `docs/.*\.md`. Runs local mode against the single file.
Merge into the existing `settings.json`; do not replace it.

- [ ] **Step 4: Verify each layer independently**

Three separate checks, one per layer. Confirm the CI layer still fails when the other two are
disabled — it is the only layer that cannot be bypassed, so it must stand alone.
