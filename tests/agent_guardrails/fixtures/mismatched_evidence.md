# Panel export audit

`computePanelCutSize` is not implemented anywhere in the exporter.

The block below is real `verify_absence` output, but it records a different
term. A block for the wrong term is rejected exactly like a missing one.

<!-- verify_absence: computeEdgebandAllowance @ 2026-07-21 -->

```
$ python tools/verify_absence.py computeEdgebandAllowance

# verify_absence — computeEdgebandAllowance

variants searched (5): COMPUTEEDGEBANDALLOWANCE, compute-edgeband-allowance, computeEdgebandAllowance, compute_edgeband_allowance, computeedgebandallowance
roots: 2

========================================================================
RESULT: NOT LOCATED by any method above.
```
