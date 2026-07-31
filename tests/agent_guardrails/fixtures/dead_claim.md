# Dead absence claim

`zombieSymbol` is not implemented anywhere in the exporter.

<!-- verify_absence: zombieSymbol @ 2026-07-21 -->

```
$ python tools/verify_absence.py zombieSymbol
RESULT: NOT LOCATED by any method above.
```

The evidence block above records NOT LOCATED. If `zombieSymbol` is later
implemented in the product tree, this claim is dead and `--deep` must catch it.
