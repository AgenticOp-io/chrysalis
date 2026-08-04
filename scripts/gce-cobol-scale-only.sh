#!/usr/bin/env bash
# G10120 scale-only: clone new corpora + census + peel-candidates (no full prove).
set -euo pipefail
cd "${HOME}/chrysalis-test"
export CHRYSALIS_COBOL_CORPORA_ROOT="${HOME}/chrysalis-cobol-corpora"
export CHRYSALIS_COBOL_CLBS_ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite"
mkdir -p reports/ci reports/cobol
rm -f reports/ci/gce-cobol-scale.ok reports/ci/gce-cobol-scale.fail
{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) gce-cobol-scale start ==="
  bash scripts/gce-clone-cobol-corpora.sh
  pnpm run hub:cobol-corpus-census
  pnpm run hub:cobol-peel-candidates
  python3 <<'PY'
import json
c=json.load(open("reports/cobol/corpus-census.json",encoding="utf-8"))
p=json.load(open("reports/cobol/peel-candidates.json",encoding="utf-8"))
print("SCALE_OK", c.get("totalFiles"), "index", c.get("featureIndexArtifacts"), "peelTop", len(p.get("top") or []))
print("byExt", c.get("byExt"))
PY
  touch reports/ci/gce-cobol-scale.ok
  echo STATUS_OK
} 2>&1 | tee -a reports/ci/gce-cobol-scale.log
