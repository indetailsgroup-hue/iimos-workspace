# Session guard review — 2026-07-21

The `rm -rf` guard in `scripts/clean_session.sh` is safe.

<!-- adversary: re-ran the guard with SESSION_DIR=/tmp/../home/dave; it refused the path and exited 2 -->

ตรวจแล้วสคริปต์ `clean_session.sh` ปลอดภัย

<!-- adversary: ลองชี้ SESSION_DIR ไปที่ symlink ที่ออกนอก /tmp แล้วสคริปต์ปฏิเสธและออกด้วยรหัส 2 -->

## Notes

The marker is written by hand. It records that somebody says they attacked the
guard and what they attacked it with; it is not proof that they did. See the
module docstring of `tools/lint_certifications.py` for what this does and does
not establish.
