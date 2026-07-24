#!/usr/bin/env bash
# List smallest CLBS batch programs by line count.
set -euo pipefail
ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite/src/programs/batch"
ls "$ROOT" | head -25
python3 - <<'PY'
import os
root = os.path.expanduser("~/COBOL-Legacy-Benchmark-Suite/src/programs/batch")
rows = []
for n in os.listdir(root):
    if n.lower().endswith((".cbl", ".cob")):
        p = os.path.join(root, n)
        with open(p, errors="ignore") as f:
            rows.append((sum(1 for _ in f), n))
rows.sort()
for c, n in rows[:12]:
    print(f"{c:5d} {n}")
PY
