#!/usr/bin/env bash
# G10120 COBOL gates on GCE only (clone corpora → census → full prove).
# Do not run Node COBOL prove on Windows — use scripts/gce-cobol-prove.ps1.
set -euo pipefail
ROOT="${HOME}/chrysalis-test"
export CHRYSALIS_COBOL_CLBS_ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite"
export CHRYSALIS_COBOL_CORPORA_ROOT="${HOME}/chrysalis-cobol-corpora"
cd "$ROOT"
mkdir -p reports/ci reports/cobol
rm -f reports/ci/gce-cobol-prove.ok reports/ci/gce-cobol-prove.fail

{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) gce-cobol-prove start ==="
  echo "=== clone public corpora (G10120) ==="
  bash scripts/gce-clone-cobol-corpora.sh

  echo "=== hub:cobol-corpus-census ==="
  set +e
  pnpm run hub:cobol-corpus-census >/tmp/cobol-corpus-census.out 2>&1
  CENSUS_CODE=$?
  set -e
  python3 <<'PY'
import json
r=json.load(open("reports/cobol/corpus-census.json",encoding="utf-8"))
print("ok", r.get("ok"), "totalFiles", r.get("totalFiles"), "failed", r.get("failed"))
print("byExt", r.get("byExt"))
print("features", r.get("featureFileCounts"))
PY
  if [[ "$CENSUS_CODE" -ne 0 ]]; then
    echo "--- census tail ---"
    tail -n 40 /tmp/cobol-corpus-census.out
  fi

  echo "=== hub:cobol-peel-candidates ==="
  set +e
  pnpm run hub:cobol-peel-candidates >/tmp/cobol-peel-candidates.out 2>&1
  PEEL_CODE=$?
  set -e
  python3 <<'PY'
import json
r=json.load(open("reports/cobol/peel-candidates.json",encoding="utf-8"))
print("ok", r.get("ok"), "indexArtifacts", r.get("indexArtifacts"), "top", len(r.get("top") or []))
for b,v in (r.get("buckets") or {}).items():
    print(" bucket", b, "count", v.get("count"))
PY
  if [[ "$PEEL_CODE" -ne 0 ]]; then
    echo "--- peel-candidates tail ---"
    tail -n 40 /tmp/cobol-peel-candidates.out
  fi

  echo "=== full prove gates ==="
  set +e
  bash scripts/gce-cobol-full-prove-gates.sh
  PROVE_CODE=$?
  set -e

  echo "=== SUMMARY census=$CENSUS_CODE peel=$PEEL_CODE prove=$PROVE_CODE ==="
  if [[ "$CENSUS_CODE" -eq 0 && "$PEEL_CODE" -eq 0 && "$PROVE_CODE" -eq 0 ]]; then
    touch reports/ci/gce-cobol-prove.ok
    echo STATUS_OK
    exit 0
  fi
  echo fail > reports/ci/gce-cobol-prove.fail
  echo STATUS_FAILED
  exit 1
} 2>&1 | tee -a reports/ci/gce-cobol-prove-run.log
