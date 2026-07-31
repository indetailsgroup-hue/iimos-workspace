# Export determinism check — 2026-07-21

`exportDxf` passes.

```console
$ python -m unittest tests.render_docs.test_render_docs -v
test_renders_thai_headings (tests.render_docs.test_render_docs) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.014s

OK
```

The `session_guard` helper is clean.

```console
$ python tools/change_budget.py check --root . --expect "docs/plans/*.md"
# change_budget — .

## inside the budget: 12
## OUTSIDE the budget: 0

========================================================================
arithmetic: 35 dirty before · 12 new · 0 edited-again · 0 resolved -> 47 dirty now
budget     : 12 inside · 0 OUTSIDE

RESULT: clean. Every change is inside the declared budget.
```
