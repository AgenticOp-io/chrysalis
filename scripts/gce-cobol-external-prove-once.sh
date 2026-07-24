#!/usr/bin/env bash
set -euo pipefail
cp /tmp/hub-cobol-external-prove-smoke.mjs /tmp/hub-cobol-clbs-prove-smoke.mjs /tmp/cobol-pattern-lift.mjs ~/chrysalis-test/scripts/hub-ingest/
cp /tmp/package.json ~/chrysalis-test/package.json
cp /tmp/COBOL-EXTERNAL-PROVE-CORPORA.md ~/chrysalis-test/docs/ 2>/dev/null || true
# Ensure mini fixtures + refs for clbs prove exist
export CHRYSALIS_COBOL_CORPORA_ROOT="${HOME}/chrysalis-cobol-corpora"
export CHRYSALIS_COBOL_CLBS_ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite"
cd ~/chrysalis-test
set +e
pnpm run hub:cobol-external-prove-smoke >/tmp/cobol-external-prove.out 2>&1
code=$?
set -e
python3 <<'PY'
import json
r=json.load(open("reports/cobol/external-prove.json",encoding="utf-8"))
print("ok", r["ok"])
print("corporaRoot", r.get("corporaRoot"))
print("clbsProve", r.get("clbsProve"))
print("--- scoreboard ---")
for c in r.get("corpora") or []:
    inv=c.get("inventory") or {}
    cobc=c.get("cobcProbe") or {}
    lift=c.get("patternLift") or {}
    print(f"{c.get('id'):24} files={c.get('fileCount'):4} ids={len(inv.get('programIds') or []):3} cics={inv.get('execCics')} sql={inv.get('execSql')} lift_ok={lift.get('ok')} cobc={cobc.get('ok')} skip_cobc={cobc.get('skipped')} struct={c.get('structuralOk')}")
print("--- failed ---")
for f in r.get("failed") or []:
    print(f.get("id"), f.get("reason"))
PY
exit "$code"
