# Panel export audit

`computePanelCutSize` is not implemented anywhere in the exporter.

<!-- verify_absence: computePanelCutSize @ 2026-07-21 -->

```
$ python tools/verify_absence.py computePanelCutSize

# verify_absence — computePanelCutSize

variants searched (5): COMPUTEPANELCUTSIZE, compute-panel-cut-size, computePanelCutSize, compute_panel_cut_size, computepanelcutsize
roots: 2

========================================================================
RESULT: NOT LOCATED by any method above.
```

ตรวจทะเบียนแล้ว `ADR-065` ไม่มีในเอกสารชุดนี้

<!-- verify_absence: ADR-065 @ 2026-07-21 -->

```
$ python tools/verify_absence.py ADR-065

# verify_absence — ADR-065

variants searched (6): ADR-065, ADR065, ADR_065, adr-065, adr065, adr_065
roots: 2

========================================================================
RESULT: NOT LOCATED by any method above.
```
