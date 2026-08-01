# Task 9 fix wave 3 — brief

Read this section twice before you write any code.

## The finding that matters more than the three defects

Fix wave 2 was convened to close a defect shape:

> **a fix applied to the named instance, while its own prose generalises to the class.**

The independent review found that wave 2 **committed that exact shape three more times — inside the fixes written to close it.** Every one was reproduced first-hand by the orchestrator.

The mechanism is not carelessness. It is this:

> **the tests were written *from* the prose instead of *against* it.**

The docstring names three invisible characters, so the test refuses those three. The docstring says "an authority that names no host", so the test tries the empty authority. The docstring says "not a list anybody maintains by hand", and nobody checks whether the list is hand-maintained. The suite goes green — **849 tests, verifier 13/13** — and detects none of it, because a test derived from a claim can never falsify the claim.

So the deliverable of this wave is not three fixes. **It is that every completeness claim in this module either becomes true, or becomes narrower.** A sentence you cannot attack is a sentence you must not write.

### The rule this wave introduces, and every later wave inherits

1. **A docstring may state a class only if a test attacks the class.** If you can only test instances, write instance-scoped prose: *"refuses U+200B, U+FEFF and U+2060"*, not *"refuses the characters that render as nothing"*.
2. **Every rule gets a `what this does not close` section, and that section gets a test asserting each named residual is genuinely still admitted.** `DeclaredUrlResidualTests` already does this for URLs. It is the pattern; apply it to every rule you touch.
3. **The residual list lives where a reader meets the rule** — in the docstring — not only in a report. A reader who never opens `.superpowers/` must still learn what the rule does not do.

## Scope

```
packages/component-master/src/monolith_component_master/coverage.py
packages/component-master/src/monolith_component_master/releases.py
tests/component_master/registry/test_first_cohort_denominator.py
tests/component_master/registry/test_release.py
data/component-master/registry/v1/coverage-snapshot.json
.superpowers/sdd/task-9-fix-wave-report.md
.superpowers/sdd/task-9-denominator-review-package.diff
```

`evidence.py` stays untouched. An eighth path means stop and report.

## H1 — brand_name closes two named invisibles; its prose closes the class

Reproduced by the orchestrator at `277d508b`:

```
[ADMIT] 'Häfele' + U+3164 HANGUL FILLER              cat=Lo
[ADMIT] 'Häfele' + U+115F HANGUL CHOSEONG FILLER     cat=Lo
[ADMIT] 'Häfele' + U+2800 BRAILLE PATTERN BLANK      cat=So
[ADMIT] 'Häfele' + U+034F COMBINING GRAPHEME JOINER  cat=Mn
[ADMIT] 'Häfele' + U+FFA0 HALFWIDTH HANGUL FILLER    cat=Lo

a name made ONLY of invisibles:
[ADMIT] U+3164 ×3 -> stored 'ㅤㅤㅤ'
[ADMIT] U+2800 ×3 -> stored '⠀⠀⠀'

[ADMIT] 'Festool DOMINO'      [ADMIT] 'Festool DOMINO '
-> two brands that render identically: True
```

The docstring claims *"A name with nothing visible left in it needs no separate check"* and *"``Cc`` control and ``Cf`` format — the characters that render as nothing."* Neither survives contact: the class "renders as nothing" spans `Lo`, `So` and `Mn`, and a name of pure fillers is stored intact.

**The trailing-space row is the sharpest.** The docstring closes U+00A0 with the reason *"``Festool DOMINO`` spelled with U+00A0 renders exactly like ``Festool DOMINO`` spelled with U+0020 and would sit beside it as a second brand"* — and then admits the U+0020 spelling of the same collision. One character away from the case it argues.

**Required.** Decide and state which, with the reason, in the docstring:

- Strip leading and trailing whitespace before validation and before the duplicate check, so `'X'` and `'X '` collide. This is the minimum; without it the argument the docstring already makes is false.
- For the invisible-but-not-`Cf` class, either extend the refusal (naming what you extended it to and why that boundary), or **narrow the prose to the characters you actually refuse** and put the rest in a tested residual list. Both are acceptable. Silence is not.
- A name that is empty *after* removing everything invisible must be refused. Today `'ㅤㅤㅤ'` is a brand.

`BrandUniverseEntry` currently has **no residual section at all**, while its sibling `_require_declared_url` has one and tests it. That asymmetry is the finding.

## H2 — the "class-level" guard is a hand-typed list checked against a hand-typed list

The module docstring says the guarantee is *"a count-by-count comparison of the record against the payload — **not a list anybody maintains by hand**"*. Measured:

```
counts is hand-typed (no introspection): True
    collected = [ self.classified_item_count, self.unclassified_item_count,
                  self.verified_item_count, self.unbacked_verified_item_count,
                  self.blocked_source_count, self.registered_source_count,
                  self.declared_unread_source_count, self.first_cohort_brand_count,
                  *self.classification_counts.values(),
                  *self.dimension_verified_counts.values() ]
```

The review demonstrated the gap: a real `MeasuredCount` property added to `CoverageSnapshot` but **not enrolled in `counts`** is invisible to the guard and to the payload, and the whole suite stays green.

**Required.** Derive the enrollment, or pin it: enumerate the class's `MeasuredCount`-returning properties by introspection and assert `counts` covers every one. Then the sentence becomes true. Also record the remaining limit the review named — **the comparison is label-only**, so a count published with the right label and a wrong value would pass — or close it.

## H3 — the URL rule states "names no host", implements "authority is empty"

```
[ADMIT ] https://:8443/x   host=None
[ADMIT ] https://:80       host=None
[ADMIT ] https://:/x       host=None
[refuse] https:///x        host=None
```

`_require_hostful_authority_without_userinfo` tests `if not authority:` — the authority *string*, not the host. Per RFC 3986 §3.2 an authority is `[userinfo "@"] host [":" port]`, so `":8443"` is an authority whose host is empty. The docstring's sentence is *"An authority that names no host at all is refused"*.

**Required.** Check the host, not the authority string. Keep every currently-refused case refused and every currently-admitted case admitted — the ten-case matrix and the six residuals are regression surface now.

Also add to the residual list, which the review found omitted: `https://www.hafele.com%40evil.invalid/` is admitted. It is **not** a live spoof — `%40` is not a literal `@`, so no fetcher reaches `evil.invalid` — but it is not in the list either, and the list is the thing this wave is about.

## H4 — adopt 8 for the wave-1 disclosure

The report headlines **7** pass-by-construction tests for wave 1, from a proxy it defines honestly. The review adjudicated: under the report's **own** definition — *"a claim about authoring order"* — the answer is **8**, and the report's own named candidate is the eighth (`test_the_anchor_admits_a_path_inside_the_root`, which at `b50b0c96` fails only with `AttributeError` because `_require_inside_root` did not exist, so it never had a meaningful RED).

Adopt 8. Keep the proxy and its 7 as corroboration, clearly labelled. Reporting the proxy's answer as the answer is the same substitution this wave exists to stop.

## Required tests

1. **H1 attacked as a class**: invisibles across `Lo`, `So`, `Mn` and `Cf`; a name of pure invisibles; `'X'` versus `'X '` colliding; the twelve committed names still admitted byte-unchanged.
2. **H2**: introspect the class's `MeasuredCount` properties and assert `counts` covers all of them. Prove it by adding a property in the test and watching it fail.
3. **H3**: `https://:8443/x`, `https://:80`, `https://:/x` refused; the ten-case matrix and six residuals unchanged.
4. **A residual test for every rule you touch**, in the `DeclaredUrlResidualTests` shape — each named residual asserted still admitted, so the list cannot rot in either direction.
5. Snapshot digest re-pinned; fresh build byte-identical **with no normalization**; determinism across processes and reversed order.

RED first, observed first-hand. **List every test that passes by construction** — and note that "I wrote the test from the docstring" is exactly how the last two waves produced green suites over false claims.

## Regressions that must hold

`coverage_statement` byte-identical to `b50b0c96`; the fourteen URLs and twelve brand names byte-unchanged; F1 order-independence and content attestation; per-state row schema; source counts partitioning their denominator; `_require_brand_source_agreement` dual-enforced; the reachability derivation still failing on an undemonstrated reason; the G4 anchor still reading the resolved path; `git status --porcelain` empty when you finish.

## Out of scope

`evidence.py`. Fetching, ingesting, rights review. The `items.json` silent skip. The Task 1 baseline manifest. Task 10. The check-then-open race, which is recorded and stays recorded.

No production or manufacturing readiness claim. Twelve brands is a first cohort, not the connector market. `NOT-FOR-PRODUCTION` stays intact.
