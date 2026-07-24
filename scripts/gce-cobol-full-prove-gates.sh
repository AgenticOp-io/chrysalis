#!/usr/bin/env bash
# Full COBOL prove gates on chrysalis-test-vm (upload via scp first).
set -euo pipefail
ROOT="${HOME}/chrysalis-test"
export CHRYSALIS_COBOL_CLBS_ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite"
export CHRYSALIS_COBOL_CORPORA_ROOT="${HOME}/chrysalis-cobol-corpora"
cd "$ROOT"

echo "=== cobc ==="
cobc --version | head -1

echo "=== hub:cobol-clbs-prove-smoke ==="
set +e
pnpm run hub:cobol-clbs-prove-smoke >/tmp/cobol-clbs-prove.out 2>&1
CLBS_CODE=$?
set -e
python3 <<'PY'
import json
r=json.load(open("reports/cobol/clbs-prove.json",encoding="utf-8"))
print("ok", r["ok"])
print("overall", r["scores"]["overallPercent"])
print("behavioralGreen", r.get("behavioralGreen"))
print("behavioralSubjects", r.get("behavioralSubjects"))
bf=r["scores"]["behavioralFidelity"]
print("behavioral_weighted", bf.get("weighted"), "skipped", bf.get("skipped"))
detail=bf.get("detail") or {}
for s in detail.get("subjects") or []:
    print(" subject", s.get("id"), "ok", s.get("ok"), "reason", s.get("reason"))
print("failed", r.get("failed"))
PY
if [[ "$CLBS_CODE" -ne 0 ]]; then
  echo "--- clbs prove stdout/err (tail) ---"
  tail -n 60 /tmp/cobol-clbs-prove.out
fi

echo "=== hub:cobol-best-fit-smoke ==="
set +e
pnpm run hub:cobol-best-fit-smoke >/tmp/cobol-best-fit.out 2>&1
BEST_CODE=$?
set -e
python3 <<'PY'
import json,sys
# best-fit prints JSON to stdout; also parse from out file
text=open("/tmp/cobol-best-fit.out",encoding="utf-8",errors="replace").read()
start=text.find("{")
end=text.rfind("}")
r=json.loads(text[start:end+1]) if start>=0 and end>start else {}
print("ok", r.get("ok"))
print("passed", r.get("passed"), "/", r.get("suiteCount"))
print("failed", r.get("failed"))
PY
if [[ "$BEST_CODE" -ne 0 ]]; then
  echo "--- best-fit tail ---"
  tail -n 80 /tmp/cobol-best-fit.out
fi

echo "=== hub:cobol-external-prove-smoke ==="
set +e
pnpm run hub:cobol-external-prove-smoke >/tmp/cobol-external-prove.out 2>&1
EXT_CODE=$?
set -e
python3 <<'PY'
import json
r=json.load(open("reports/cobol/external-prove.json",encoding="utf-8"))
print("ok", r["ok"])
print("clbsProve", r.get("clbsProve"))
print("cobcBar", r.get("cobcBar"))
print("emitRefs", r.get("emitRefContracts"))
print("emitGenerated", r.get("emitGeneratedContracts"))
print("--- scoreboard ---")
for c in r.get("scoreboard") or []:
    print(f"{c.get('id'):24} files={c.get('files')} ids={c.get('programIds')} cics={c.get('cics')} sql={c.get('sql')} evalT={c.get('evaluateTrue')} using={c.get('procedureUsing')} lift={c.get('liftOk')} cobc={c.get('cobcOk')} curated={c.get('cobcViaCurated')} struct={c.get('structuralOk')}")
print("--- failed ---")
for f in r.get("failed") or []:
    print(f.get("id"), f.get("reason"))
PY
if [[ "$EXT_CODE" -ne 0 ]]; then
  echo "--- external prove tail ---"
  tail -n 80 /tmp/cobol-external-prove.out
fi

echo "=== SUMMARY ==="
echo "clbs=$CLBS_CODE best=$BEST_CODE external=$EXT_CODE"
exit $(( CLBS_CODE != 0 || BEST_CODE != 0 || EXT_CODE != 0 ? 1 : 0 ))
