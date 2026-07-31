#!/usr/bin/env python3
"""claim_detect — find the *shape* of a claim, so the guardrail never depends on
the agent noticing it is at risk.

Why this exists
---------------
`verify_absence.py` can prove a search was thorough, and `change_budget.py` can
prove a change stayed inside its declared scope. Both are opt-in, and the rule
that was supposed to make agents reach for them was violated four more times
after the agent itself wrote the rule down. Rules addressed to judgement failed
100% of the time in the 2026-07-21 record. Only something triggered by the
written output can work.

This module is that trigger. It classifies sentences, not intentions:

    negative claim   a negation marker + a *named artifact* in one sentence
                     ("`computePanelCutSize` is not implemented anywhere")
    certification    a safe/clean/passing marker + a named artifact
                     ("The `rm -rf` guard is safe")

The named-artifact requirement is the whole design. Thai prose says ไม่มี
constantly (ไม่มีปัญหา, ไม่มีอะไรเพิ่ม) and English says "there is no reason";
a detector that fires on every negation becomes noise, gets switched off, and
leaves the project worse than with no detector at all. Every one of the seven
recorded absence failures named something a search could have found —
`ADR-065`, `computePanelCutSize`, `tenant_id`, `MPR exporter`. Ordinary prose
does not.

Two exemptions, and they matter more than the detector
------------------------------------------------------
Measured against the real corpus before the exemptions existed, the detector's
worst offenders were the documents written to *record and refute* false claims:
71 hits in `plans-review-worktree-review-pr31.th.md`, 53 in
`ima-audit-independent-claim-verification.th.md`. A sentence like

    Perplexity claimed System 32 was absent — refuted at `policy.ts:150`

carries a negation and a named artifact while being the exact opposite of an
unevidenced claim. A naive detector fires hardest on the most careful writing in
the corpus, which is precisely how a linter earns its way into `# noqa`. So:

    attributed   the negation sits inside quotes, or follows claimed / said /
                 reported — or Thai อ้าง / ระบุ *reporting* a claim (followed by
                 ว่า, a colon, or a quote), not the ordinary verbs "cite"/"specify"
    refuted      the negation is answered, in the same or the next sentence, by
                 a file:line, a commit sha, or a CONTRADICTED / REFUTED verdict

Neither needs a `verify_absence` block, and neither is reported.

What the first measurement changed
----------------------------------
The rules above were written from the decision record, and they were not enough.
Run over the real `docs/` corpus they produced 448 negative and 217
certification hits — *worse* than the 402 / 190 naive baseline the plan
recorded. Hand-classifying twenty of each found 55% ordinary prose on negative
claims and 92% on certifications, both far past the point where a linter gets
disabled. Guessing rules from example sentences was not enough; the corpus had
failure modes nobody predicted. Each of the following is a rule the measurement
forced, and every one has a test naming the document it came from:

  * Thai has no word boundaries, so a marker is a substring and collides.
    ชี้ขาด ("decisive") contains ขาด ("lacking"). ความปลอดภัย ("safety", the
    noun) contains ปลอดภัย ("is safe"). These are not near-misses; ขาด matched
    a sentence presenting decisive evidence *for* something.
  * โดยไม่มี / ที่ไม่มี / แบบไม่มี are "without" and "that has no" — grammar,
    not an assertion that an artifact is missing. This was the single largest
    class of false positives.
  * Code spans and fenced blocks are displayed, not asserted. `missing []` is
    expected program output. Worse, a pasted `verify_absence` block contains the
    words "does not exist" inside its own wording guidance, so an unmasked
    detector flags the evidence it exists to demand.
  * `verified` alone is this corpus's evidence-grade *label* (`VERIFIED FACT`,
    a `verified` column in a JSONL schema). It only certifies anything in a
    predicative form — "is verified", "verified by". As a bare word it was 146
    of 217 certification hits and nearly all of them were prose.
  * `passes` is an ordinary verb ("when caller passes 0") and a noun ("3 passes
    and 7 failures"). It only certifies when it takes no object or takes a test.
  * A denied certification is not a certification: "ไม่ได้พิสูจน์ว่า X ปลอดภัย"
    says the opposite of what the marker suggests. Neither is a question:
    review documents head their rows with "…ปลอดภัยหรือไม่" ("…safely, or not?").
  * Markdown review tables put the citation column *before* the finding column,
    so reading the refutation rule strictly as "followed by" missed every review
    table in the corpus. A file:line anywhere in the same sentence now refutes.

Two judgement calls, recorded because they are not in the written decision and a
later reader will otherwise take them for accidents:

1. A CONTRADICTED / REFUTED verdict counts anywhere in the sentence, not only
   after the negation. The decision says "followed by", but the common form here
   is the label prefix — `CONTRADICTED: X ไม่มีอยู่`.
2. Certifications are exempted by attribution and by an explicit verdict marker,
   but *not* by a bare file:line or sha. A citation proves something exists; it
   is not an adversarial check, and Task 3 exists to demand an adversarial check.
   Silencing "`exportDxf` passes. See `exporter.ts:88`." would gut that linter.

What Task 5 changed (marker tuning for the recorded corpus)
----------------------------------------------------------
Four of the ten recorded 2026-07-21 probes were still missed after Task 1, so
Task 5 owns marker tuning and closed them, each with a test naming the probe:

  * `not located` (EN) — the wording `verify_absence` *licenses* on a negative
    result (review finding O-4). It was the one authoritative absence phrasing no
    linter inspected; the evidence-block template now passes honestly (its own
    claim detected and satisfied) rather than vacuously. ไม่พบใน is already
    covered by ไม่พบ.
  * `no … mentions X` — the shape of "no page mentions API" / "no production-zone
    page mentions tapio".
  * `not current` — "`PROVENANCE.md` is not current", a staleness claim about a
    named artifact.
  * `only … were touched/changed` (certification) — the change-scope claim
    change_budget.py checks; "only the intended files were touched".

Two review defects were also closed here:

  * M2 (inline-code false positive). A UI message quoted inside a backtick span
    fired because a period-plus-space *inside* the span split it, leaving each
    half with an unbalanced backtick that `_mask_shown_spans` could not mask.
    `split_sentences` now ignores separators that fall inside an inline-code
    span, so markers inside the span stay muted while a named artifact written in
    backticks still counts. Cost: one *evidenced* claim on a row with a
    malformed (unbalanced) backtick is no longer flagged, because the stray
    backtick makes `_INLINE_CODE` mis-pair the span — a data-quality artefact of
    one document, disclosed rather than special-cased.
  * M3 (Thai attribution over-suppression, the Task 1 survivor). ระบุ / อ้าง are
    attribution only when a ว่า particle, colon, or opening quote follows within
    a short window; see `_ATTRIBUTION_MARKERS`.

Measured false-positive rate
----------------------------
Against the live `docs/` corpus, Python 3.14:

    2026-07-21 (Task 1):   172 docs, 104 negative, 5 certification
    2026-07-22 (pre-Task5):178 docs, 105 negative, 5 certification
    2026-07-23 (Task 5 + cross-vendor fixes): 178 docs, 111 negative in 26
                                              files, 5 certification

The delta against the fc99947 baseline decomposes exactly, verified by
hit-level diffs at each step: +7 Thai-attribution recoveries (M3), +1 template
`not located` hit (M1; evidenced, so lint_claims still passes the template and
reports 110 in 25 files), -1 disclosed M2 loss (playbook.en.md:846, unbalanced
backtick), -1 correct suppression from the cross-vendor fixes
(homag-reference-corrections.md:92 — `ระบุไว้ชัดตามปลายทาง 3 เส้น:` is
attribution the 10-char window was too narrow to see) = net +6. The three
probe-closing markers added zero corpus hits outside the fixtures. An earlier
revision of this docstring recorded 115 (+10); that number did not reproduce —
three independent reviewers and the orchestrator all measured 112 before the
cross-vendor fixes — and the correction is recorded here rather than deleted,
because a calibration baseline that was itself wrong is exactly the failure
this module polices. The naive detector in the plan scored 402 negative / 190
certification over this corpus.

Hand inspection of the tuned output — 20 random negative hits at two independent
seeds, classified against the Task 1 standard (an assertion that a *findable*
thing is absent is a real claim; idiom, requirement, denial, reported-past-error
and pure description are prose):

    negative claims   20 sampled (x2 seeds)   15 real / 5 prose   25% prose
    certifications     5 sampled (whole pop.)  4 real / 1 prose    20% prose

against the 20.9% negative baseline and the plan's ~30% prose ceiling. The five
prose survivors are the pre-existing classes — a denied absence ("does not prove
X is absent"), a requirement ("no image-only equivalence [allowed]"), the idiom
ไม่มีทาง in a "does-not-prove" column, a reported-past-error the correction is
disavowing ("an earlier revision stated `ADR-065` did not exist" — `stated` is
not an attribution marker), plus one M3 side effect (a denied absence, "not that
they lack capability").

M3 measured in isolation on the live corpus: the bounded rule recovers 7 hits
the old unbounded rule suppressed (≈4 real absence claims — e.g. "107 spec docs
with no ADR file", "no protocol/controller/tapio documented" — and ≈3 prose) and
loses **zero** relative to the old rule; both pinned attributions
(`**รายงานระบุ:**`, `ระบุชัดว่า`) stay exempt. A missed real claim is the costly
error this project exists to prevent, so recovering real claims at that ratio is
a net gain; the choice is recorded here rather than argued.

These numbers describe *this* corpus, not a guarantee. They are recorded so a
future change to these rules is compared against a measurement instead of
argued about.

Public API (imported by lint_claims.py, lint_certifications.py, the regression
corpus, and the allowlist tooling):

    find_negative_claims(text) -> list[Hit]
    find_certifications(text)  -> list[Hit]
    split_sentences(text)      -> list[Sentence]
    named_artifacts(sentence)  -> list[str]
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Split on newline, "." followed by whitespace, "·", and "—".
#
# Thai writes no full stop and no space between words, so "." + whitespace alone
# would treat a whole Thai paragraph as one sentence and let a refutation three
# claims away silence an unrelated negation. The interpunct and em dash are the
# separators this corpus actually uses inside Thai lines.
#
# The lookbehind (rather than consuming the ".") is what keeps `policy.ts:150`
# and `verify_absence.py` intact: a dot ends a sentence only when whitespace
# follows it.
_SEPARATOR = re.compile(r"\r?\n|\s*·\s*|\s*—\s*|(?<=\.)\s+")

# Thai markers are plain substrings — there are no word boundaries to anchor to,
# and \b does not work against Thai script at all (re treats a whole Thai run as
# word characters, so \bไม่มี\b matches only at a line edge). The lookbehinds are
# therefore doing the job \b does in English, and each one was added because a
# real sentence in docs/ was misread without it.
_NEGATION_MARKERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"does not exist",
        r"do not exist",
        r"there is no\b",
        r"there are no\b",
        r"is absent",
        r"are absent",
        r"not implemented",
        r"not found",
        r"\blacks\b",
        r"\bmissing\b",
        # "no … anywhere" — the shape of "no MPR exporter anywhere in the repo".
        # Bounded so it cannot reach across a whole paragraph.
        r"\bno\b[^\n]{0,80}?\banywhere\b",
        # "not located" is the exact wording verify_absence *licenses* on a
        # negative result. Without it the most authoritative-sounding absence
        # sentence in the project — the one the guardrail itself prints, and the
        # one the evidence-block template teaches — is the phrasing no linter
        # inspects (review finding O-4). The Thai equivalent ไม่พบใน is already
        # covered by ไม่พบ below.
        r"not located",
        # "no page mentions X" / "no production-zone page mentions X" — an absence
        # claim about a named thing that a search over pages would settle.
        # Catches the recorded `no_api` and `tapio` misses.
        r"\bno\b[^\n]{0,80}?\bmentions?\b",
        # "X is not current" — a staleness claim about a named artifact, settled
        # by the git comparison the sentence does not show. Catches the recorded
        # `skills_behind` miss ("`PROVENANCE.md` is not current").
        r"\bnot current\b",
    )
) + tuple(
    re.compile(p)
    for p in (
        # โดยไม่มี "without" · ที่ไม่มี "that has no" · แบบไม่มี "in a …-less way".
        # All three are grammatical function words, not existence claims.
        r"(?<!โดย)(?<!ที่)(?<!แบบ)ไม่มี",
        r"ไม่ได้มี",
        r"ไม่พบ",
        # ชี้ขาด "decisive" · เด็ดขาด "absolute" · ตัดขาด "cut off" all contain ขาด.
        r"(?<!ชี้)(?<!เด็ด)(?<!ตัด)ขาด",
        r"หายไป",
    )
)

_CERTIFICATION_MARKERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"is safe",
        r"are safe",
        r"is clean",
        # An object means an ordinary verb ("passes 0"); no object, or a test as
        # the object, is the certifying form.
        r"\bpasses\b(?=\s*(?:[.,;)]|$)|\s+(?:all\s+)?(?:tests?|checks?|lint|CI|the\b|its\b))",
        # Predicative only. Bare "verified" is this corpus's evidence-grade label
        # and a JSONL column name.
        r"\b(?:is|are|was|were|been|fully|independently)\s+verified\b",
        r"\bverified\s+(?:by|that|against)\b",
        r"no issues",
        r"works correctly",
        # "only X were touched / changed" — a change-scope certification, exactly
        # the claim change_budget.py exists to check. An adversary later found the
        # 2026-07-21 "only the intended files were touched" claim did not add up.
        # Bounded so "only" and the verb stay in one clause. Catches the recorded
        # `only_touched` miss.
        r"\bonly\b[^\n]{0,60}?\b(?:were|was|are|is|got)\s+(?:touched|changed|modified|affected|edited)\b",
    )
) + tuple(
    re.compile(p)
    for p in (
        # ความปลอดภัย is the noun "safety"; ที่ปลอดภัย is the modifier "that is
        # safe", which describes a requirement rather than certifying a result.
        r"(?<!ความ)(?<!ที่)ปลอดภัย",
        r"(?<!ความ)สะอาด(?!กว่า)",  # สะอาดกว่า is the comparative "cleaner"
        r"ผ่านแล้ว",
        r"เรียบร้อย",
        r"ไม่มีปัญหา",
    )
)

# English reporting verbs suppress zero real claims and are matched bare. The
# Thai ระบุ / อ้าง are *also* ordinary verbs ("specify" / "cite"), and matching
# them bare over the whole sentence prefix suppressed 15 hits corpus-wide, ~3-4
# of them genuine claims (Task 1 review survivor). They are attribution only when
# they actually report a claim — followed, within a short window, by the ว่า
# particle, a colon, or an opening quote. The window (not an immediate lookahead)
# is what keeps ระบุชัดว่า ("states clearly that", ชัด between ระบุ and ว่า) bound;
# the colon and quote alternatives are what keep the pinned "**รายงานระบุ:**"
# form bound, which a naive ว่า-only rule would break. Measured on the live docs/
# corpus: this recovers genuine claims while the two pinned attributions stay
# exempt and the false-positive rate stays inside the Task 1 threshold — see the
# module docstring's "Measured false-positive rate".
#
# The window is 25 characters, not the original 10: the cross-vendor reviewer
# produced natural Thai report prose — "รายงานการตรวจสอบระบุอย่างชัดเจนในบทสรุปว่า …"
# — where 19 characters of modifiers sit between ระบุ and ว่า, and the 10-char
# bound wrongly flagged genuine attribution. Widening costs nothing measurable:
# the recovered ordinary-verb hits contain no ว่า/colon/quote at any distance,
# so they stay recovered.
_ATTRIBUTION_MARKERS = re.compile(
    r"\b(?:claimed|claims|said|says|reported|reports)\b"
    r"|(?:อ้าง|ระบุ)(?=[^\n]{0,25}?(?:ว่า|[:：\"“”`「]))",
    re.IGNORECASE,
)

# "ไม่ได้พิสูจน์ว่า X ปลอดภัย" — does not prove X is safe. A marker under a
# negation asserts the opposite of what it looks like.
_DENIAL = re.compile(r"\b(?:not|no|never|cannot|can't|isn't|aren't)\b|ไม่|ห้าม", re.IGNORECASE)

# Asking whether something is safe is the opposite of certifying that it is.
# Review documents in this corpus use interrogative row headings heavily —
# "ปล่อยไฟล์ผลิตได้อย่างปลอดภัยหรือไม่" ("can production files be released
# safely, or not?") was being read as a safety certification.
_INTERROGATIVE = re.compile(r"\?|หรือไม่|ไหม")

_FILE_LINE = re.compile(r"[\w.\-/\\]+\.\w+:\d+")

# A sha, not an English word. The digit requirement is why: "defaced" and
# "cabbage" are seven letters drawn entirely from [a-f], and without it the
# refutation exemption would silence any negation followed by one of them.
_COMMIT_SHA = re.compile(r"\b(?=[0-9a-f]{7,40}\b)[0-9a-f]*\d[0-9a-f]*\b")

_VERDICT_MARKER = re.compile(r"\b(?:CONTRADICTED|REFUTED)\b", re.IGNORECASE)

# Regions whose contents are shown rather than asserted.
#
# Code spans are paired CommonMark-style: a run of N backticks closes only
# against an equal run. The first version paired single backticks, so the
# ordinary Markdown idiom for showing a literal backtick — `` ` `` — mis-paired
# every backtick after it, merged the surrounding sentences into one, and both
# masked real claims and let an unrelated citation drift into a negation's
# refutation window. Found by the cross-vendor reviewer by reasoning, then
# reproduced by execution; the corpus carries 373 double-backtick spans across
# 22 files, so this was live exposure, not a curiosity.
_INLINE_CODE = re.compile(r"(?<!`)(`+)(?!`)((?:(?!\1).)+?)\1(?!`)")
_QUOTED = re.compile(r"\"[^\"\n]*\"|“[^”\n]*”")

_MIN_TOKEN_LEN = 4

# (pattern, applies_length_floor). Ordered by how strongly the match implies a
# human deliberately named the thing; earlier patterns win an overlap, so
# `computePanelCutSize` is reported once as a backticked span, not twice.
#
# The floor applies only to bare tokens: backticks, an ADR id, and a path are
# explicit acts of naming at any length, while a loose camelCase run is only
# evidence of naming once it is too long to be an ordinary word.
_ARTIFACT_PATTERNS = (
    (re.compile(r"`([^`\n]+)`"), False),
    (re.compile(r"\b(ADR-\d+)\b", re.IGNORECASE), False),
    # A path needs a slash *and* a dotted final segment. Requiring the extension
    # keeps "and/or", "24/7", and "TH/EN" out.
    (re.compile(r"(?<![\w/\\.-])([\w.\-]+(?:[/\\][\w.\-]+)*[/\\][\w-]+\.\w+)"), False),
    (re.compile(r"\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b"), True),
    (re.compile(r"\b([a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+)\b"), True),
    (re.compile(r"\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b"), True),
)


@dataclass(frozen=True)
class Sentence:
    """One split unit, carrying enough position to be cited."""

    text: str
    start: int  # offset into the original text
    line: int  # 1-based, for `path:line` output


@dataclass(frozen=True)
class Hit:
    """One reportable finding: a single sentence, however many artifacts it names.

    `terms` carries every artifact so `--deep` can re-run `verify_absence` on all
    of them; `term` is the first, for messages. Counting per sentence rather than
    per artifact is what keeps the Task 6 allowlist counts stable when a sentence
    is reworded.
    """

    kind: str  # "negative" or "certification"
    term: str
    terms: tuple[str, ...]
    marker: str  # the phrase that made it a claim, for the error message
    sentence: str
    line: int


def find_negative_claims(text: str) -> list[Hit]:
    """Negations that assert absence of a named artifact without evidence."""
    return _find(text, "negative", _NEGATION_MARKERS, citation_refutes=True, certifying=False)


def find_certifications(text: str) -> list[Hit]:
    """Assertions that a named artifact is safe / clean / passing."""
    return _find(
        text, "certification", _CERTIFICATION_MARKERS, citation_refutes=False, certifying=True
    )


def split_sentences(text: str) -> list[Sentence]:
    """Split `text` into citable units. Empty runs are dropped.

    A separator that falls *inside* an inline-code span is ignored: a
    "`… machine post. No groove …`" — a period-plus-space within a backtick span
    — must not break the span in two. Were it split, each half would hold one
    unbalanced backtick, which `_mask_shown_spans` cannot recognise as code, so
    the markers displayed inside the span would fire. The separators are found in
    the original text (not a blanked copy) so nothing shifts a boundary or drops
    a leading artifact; only the ones landing inside a span are dropped.
    """
    spans = [(m.start(), m.end()) for m in _INLINE_CODE.finditer(text)]

    def _inside_code(pos: int) -> bool:
        return any(start <= pos < end for start, end in spans)

    out: list[Sentence] = []
    pos = 0
    for sep in _SEPARATOR.finditer(text):
        if _inside_code(sep.start()):
            continue
        _append(out, text, pos, sep.start())
        pos = sep.end()
    _append(out, text, pos, len(text))
    return out


def named_artifacts(sentence: str) -> list[str]:
    """Things in `sentence` a search could be run against, in reading order.

    This is the narrowing rule the whole design rests on: a negation is only a
    claim when it is about something findable.
    """
    claimed: list[tuple[int, int, str]] = []
    for pattern, has_floor in _ARTIFACT_PATTERNS:
        for m in pattern.finditer(sentence):
            token = m.group(1)
            if has_floor and len(token) < _MIN_TOKEN_LEN:
                continue
            if any(m.start() < end and start < m.end() for start, end, _ in claimed):
                continue
            claimed.append((m.start(), m.end(), token))

    seen: set[str] = set()
    out = []
    for _, _, token in sorted(claimed):
        if token not in seen:
            seen.add(token)
            out.append(token)
    return out


def _append(out: list[Sentence], text: str, start: int, end: int) -> None:
    raw = text[start:end]
    stripped = raw.strip()
    if not stripped:
        return
    offset = start + (len(raw) - len(raw.lstrip()))
    out.append(Sentence(stripped, offset, text.count("\n", 0, offset) + 1))


def _blank(text: str) -> str:
    """Replace every character except newlines with a space.

    Length and line breaks are preserved so reported line numbers still point at
    the original document.
    """
    return "".join(c if c == "\n" else " " for c in text)


def _mask_fenced_blocks(text: str) -> str:
    """Blank out ``` / ~~~ fenced regions.

    A fenced block is pasted output or code. The case that forces this: a pasted
    `verify_absence` block contains the words "does not exist" in its own wording
    guidance, so without masking the detector flags the very evidence it demands.
    """
    out = []
    inside = False
    for line in text.splitlines(keepends=True):
        opener = line.lstrip()
        if opener.startswith("```") or opener.startswith("~~~"):
            inside = not inside
            out.append(_blank(line))
        else:
            out.append(_blank(line) if inside else line)
    return "".join(out)


def _mask_shown_spans(text: str) -> str:
    """Blank inline code and quoted spans, keeping offsets aligned.

    Both mean "this is being displayed", not "I assert this": `missing []` is
    expected program output, and a quoted negation is somebody else's claim.
    """
    chars = list(text)
    for pattern in (_INLINE_CODE, _QUOTED):
        for m in pattern.finditer(text):
            for i in range(m.start(), m.end()):
                chars[i] = " "
    return "".join(chars)


def _find(
    text: str,
    kind: str,
    markers: tuple[re.Pattern[str], ...],
    *,
    citation_refutes: bool,
    certifying: bool,
) -> list[Hit]:
    sentences = split_sentences(_mask_fenced_blocks(text))
    hits: list[Hit] = []

    for i, sentence in enumerate(sentences):
        marker = _first_unexcused_marker(sentences, i, markers, citation_refutes, certifying)
        if marker is None:
            continue
        terms = named_artifacts(sentence.text)
        if not terms:
            continue
        hits.append(
            Hit(
                kind=kind,
                term=terms[0],
                terms=tuple(terms),
                marker=marker,
                sentence=sentence.text,
                line=sentence.line,
            )
        )
    return hits


def _first_unexcused_marker(
    sentences: list[Sentence],
    index: int,
    markers: tuple[re.Pattern[str], ...],
    citation_refutes: bool,
    certifying: bool,
) -> str | None:
    body = sentences[index].text
    # Markers are searched in the masked text so code and quotes cannot trigger
    # one; artifacts and citations are read from the original, because a symbol
    # or a `file.ts:12` reference is usually backticked.
    searchable = _mask_shown_spans(body)

    # Sentence-level excuses, checked once rather than per marker.
    if certifying and _INTERROGATIVE.search(searchable):
        return None  # asking whether X is safe is not certifying that it is
    if _is_refuted(sentences, index, citation_refutes):
        return None

    for pattern in markers:
        for m in pattern.finditer(searchable):
            if _ATTRIBUTION_MARKERS.search(searchable, 0, m.start()):
                continue  # "Perplexity claimed X is absent"
            if certifying and _DENIAL.search(searchable, 0, m.start()):
                continue  # "does not prove X is safe"
            return m.group(0)
    return None


def _is_refuted(sentences: list[Sentence], index: int, citation_refutes: bool) -> bool:
    """Whether evidence answers this sentence's claim, here or in the next one.

    The window is two sentences by decision. A file:line at the far end of a long
    document is not an answer to this claim, and treating it as one would let a
    single citation anywhere in a file disarm every claim in it.
    """
    window = [sentences[index].text]
    if index + 1 < len(sentences):
        window.append(sentences[index + 1].text)

    if any(_VERDICT_MARKER.search(t) for t in window):
        return True
    if not citation_refutes:
        return False
    return any(_FILE_LINE.search(t) or _COMMIT_SHA.search(t) for t in window)
