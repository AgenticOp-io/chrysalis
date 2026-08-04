#!/usr/bin/env bash
# G10121/G10122 — layout inventory peels (ODO + RENAMES) on GCE.
set -euo pipefail
cd "${HOME}/chrysalis-test"
export CHRYSALIS_COBOL_CLBS_ROOT="${HOME}/COBOL-Legacy-Benchmark-Suite"
export CHRYSALIS_COBOL_CORPORA_ROOT="${HOME}/chrysalis-cobol-corpora"
mkdir -p reports/ci reports/cobol
rm -f reports/ci/gce-cobol-layout.ok reports/ci/gce-cobol-layout.fail
{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) layout peels G10121/G10122 ==="
  bash scripts/gce-clone-cobol-corpora.sh
  pnpm run hub:cobol-corpus-census >/tmp/census-layout.out 2>&1 || true
  python3 <<'PY'
import json
c=json.load(open("reports/cobol/corpus-census.json",encoding="utf-8"))
print("census_files", c.get("totalFiles"), "odo", (c.get("featureFileCounts") or {}).get("odo"), "renames", (c.get("featureFileCounts") or {}).get("renames"))
print("copybook2json", (c.get("byCorpus") or {}).get("copybook2json"))
print("proleap", (c.get("byCorpus") or {}).get("proleap-cobol-parser"))
PY
  set +e
  pnpm run hub:cobol-best-fit-smoke >/tmp/best-layout.out 2>&1
  BEST=$?
  set -e
  python3 <<'PY'
import json
text=open("/tmp/best-layout.out",encoding="utf-8",errors="replace").read()
start=text.find("{"); end=text.rfind("}")
r=json.loads(text[start:end+1]) if start>=0 and end>start else {}
checks=r.get("results") or []
want={"webir-hole-attrs-occurs-depending","webir-hole-attrs-renames"}
hits=[c for c in checks if c.get("id") in want]
failed=r.get("failed") or []
print("best_ok", r.get("ok"), "layout_checks", hits, "failed_n", len(failed))
open("reports/cobol/best-fit-layout-snippet.json","w",encoding="utf-8").write(
  json.dumps({"ok": r.get("ok"), "layout": hits, "failed": failed[:12]}, indent=2)+"\n"
)
PY
  if [[ "$BEST" -eq 0 ]]; then
    touch reports/ci/gce-cobol-layout.ok
    echo STATUS_OK
    exit 0
  fi
  echo fail > reports/ci/gce-cobol-layout.fail
  echo STATUS_FAILED
  tail -n 80 /tmp/best-layout.out
  exit 1
} 2>&1 | tee -a reports/ci/gce-cobol-layout-run.log
