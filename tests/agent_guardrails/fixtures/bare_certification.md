# Session guard review — 2026-07-21

The `rm -rf` guard in `scripts/clean_session.sh` is safe.

ตรวจแล้วสคริปต์ `clean_session.sh` ปลอดภัย

## Notes

Both sentences above were published in the 2026-07-21 session. The guard they
certify was `[[ "$SESSION_DIR" == /tmp/* ]]`, a prefix test that
`/tmp/../home/dave` walks straight out of. An adversary found it minutes later.

Nothing in this document records anyone having tried to break the thing being
certified, which is exactly the shape this linter exists to refuse.
