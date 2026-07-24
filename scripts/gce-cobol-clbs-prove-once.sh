#!/usr/bin/env bash
set -euo pipefail
cp /tmp/hub-cobol-clbs-prove-smoke.mjs ~/chrysalis-test/scripts/hub-ingest/
export CHRYSALIS_COBOL_CLBS_ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite"
cd ~/chrysalis-test
set +e
pnpm run hub:cobol-clbs-prove-smoke >/tmp/cobol-clbs-prove.out 2>&1
code=$?
set -e
python3 <<'PY'
import json
r=json.load(open("reports/cobol/clbs-prove.json",encoding="utf-8"))
inv=r.get("clbsInventory") or {}
print("ok", r["ok"])
print("overall", r["scores"]["overallPercent"])
print("cics", inv.get("sampleExecCics"), "sql", inv.get("sampleExecSql"), "ids", len(inv.get("sampleProgramIds") or []))
print("online", inv.get("onlineProgramCount"), "batch", inv.get("batchProgramCount"))
print("failed", r.get("failed"))
print("ids", (inv.get("sampleProgramIds") or [])[:12])
print("behavioral_weighted", r["scores"]["behavioralFidelity"].get("weighted"))
print("multiLang", (r["scores"]["behavioralFidelity"].get("detail") or {}).get("multiLangRefs"))
PY
exit "$code"
