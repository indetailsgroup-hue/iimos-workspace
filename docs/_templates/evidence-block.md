# Evidence block — pasted `verify_absence` proof

Attach one of these to every sentence that claims a named artifact is absent. A
negative claim about a named thing — a backticked identifier, a file path, an
ADR id — is not publishable in this repository without one.

The block has two parts that must stay together:

1. **An HTML comment** carrying the machine-readable term and date. Linters read this and only this. It never appears in rendered output.
2. **A fenced code block** carrying the human-readable proof: the exact command you ran, followed by the `verify_absence` output pasted unedited.

Prose is not evidence. A linter will never parse your sentence, so anything you
assert outside these two parts is unverified by construction.

## Comment grammar

The comment records exactly one term and one date:

```
<!-- verify_absence: TERM @ YYYY-MM-DD -->
```

The parser is this regular expression:

```
<!--\s*verify_absence:\s*(?P<term>\S.*?)\s+@\s+(?P<date>\d{4}-\d{2}-\d{2})\s*-->
```

Rules that follow from it:

- **One term per comment.** Two absent artifacts need two blocks. Writing `TERM_A, TERM_B` captures the literal string `TERM_A, TERM_B` as the term, which then matches neither claim — the block fails closed rather than silently covering both.
- **The date is ISO 8601 `YYYY-MM-DD`,** the date you ran the search. Any other ordering does not match and the block counts as missing.
- **Whitespace is required on both sides of the `@`.** This is what lets a term begin with `@`, as package names do.
- **The term must not contain `<`, `>`, or `--`.** Those cannot survive an HTML comment.
- **The recorded term must be the artifact the sentence actually claims is absent,** written the same way. A block whose term differs from the claimed artifact is a *mismatched* block: it is detected and rejected exactly like a missing one. Pasting a real block for a different term is not evidence.

Place the comment immediately before its fenced block, separated by one blank
line, and put the pair directly after the paragraph making the claim.

## Worked example

`computeEdgebandAllowance` was not located in 2 root(s) by filename, content,
git-tracked, and git-history search on 2026-07-21.

<!-- verify_absence: computeEdgebandAllowance @ 2026-07-21 -->

```
$ python tools/verify_absence.py computeEdgebandAllowance --root docs --root tools

# verify_absence — computeEdgebandAllowance

variants searched (5): COMPUTEEDGEBANDALLOWANCE, compute-edgeband-allowance, computeEdgebandAllowance, compute_edgeband_allowance, computeedgebandallowance
roots: 2
  - docs
  - tools
content extensions: all text types
excluded directories: .cache, .git, .next, .pytest_cache, .venv, __pycache__, build, coverage, dist, node_modules, venv
encoding: utf-8 (Thai comments and identifiers are in scope)

## docs

### filename / directory-name matches: 0

### content matches: 0

### git grep (tracked files only): 0 — searched, nothing tracked matches
### git history (commits adding/removing the term): 0

## tools

### filename / directory-name matches: 0

### content matches: 0

### git grep (tracked files only): 0 — searched, nothing tracked matches
### git history (commits adding/removing the term): 0

========================================================================
RESULT: NOT LOCATED by any method above.

This still does NOT license the words "does not exist".
The only wording this output supports is:

    "computeEdgebandAllowance was not located in 2 root(s) by filename,
     content, git-tracked, and git-history search on <date>."

Absence remains UNKNOWN until a search of the places this tool cannot
reach also comes back empty: binary assets, licensed or paywalled vendor
documentation, external services, other branches, and anything stored
under a name that shares no substring with the term.
```

Note that the pasted output names its own roots. A block produced with narrowed
`--root` or `--ext` flags supports a correspondingly narrower claim, and the
reader can see that without trusting the sentence.

On a Windows console, set `PYTHONIOENCODING=utf-8` before running the tool. The
default code page cannot encode the em dash or the Thai text the output can
contain, so the tool either mangles those characters or aborts mid-run — and a
truncated paste is not proof of an empty search.

## What this block proves — and what it does not

It proves that on the recorded date, the four search methods over the listed
roots returned nothing for that term and its spelling variants.

It does **not** prove the artifact does not exist. It says nothing about places
the tool cannot reach — binary assets, vendor documentation, external services,
other branches, names sharing no substring with the term — and nothing about the
repository as it stands today, since an artifact added after the search date
makes a correct block describe a claim that is now false.

## Wording

`verify_absence` deliberately refuses to license the words "does not exist" on a
negative result. This block does not restore that licence, and neither does any
number of blocks. Use the tool's own sentence — this is the licensed *format*,
with `TERM`, `N` and the date filled in from your own run:

```
TERM was not located in N root(s) by filename, content, git-tracked, and
git-history search on YYYY-MM-DD.
```

`not located` is a linted phrase: written about a real artifact outside a fence,
it is a negative claim and needs its own evidence block, exactly like the worked
example above. Do not upgrade it to "does not exist", "there is no `TERM`", "`TERM` is not
implemented anywhere", or "confirmed absent". Each of those asserts something
the search did not establish. If you need the stronger claim, you need a
stronger method than this tool — searching harder in the same places cannot
produce it.
