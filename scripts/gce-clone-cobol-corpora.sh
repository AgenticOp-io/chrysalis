#!/usr/bin/env bash
# Clone public COBOL prove/demo corpora for Chrysalis external prove + layout census.
# Blobs stay under CHRYSALIS_COBOL_CORPORA_ROOT — never commit to main (G10120).
# Does not close copy:EXTFMAP (licensed/ABSENT only).
set -euo pipefail
ROOT="${CHRYSALIS_COBOL_CORPORA_ROOT:-$HOME/chrysalis-cobol-corpora}"
mkdir -p "$ROOT"
clone1() {
  local url="$1" dir="$2"
  if [[ -d "$ROOT/$dir/.git" ]]; then
    echo "have $dir"
    return 0
  fi
  echo "clone $dir ..."
  git clone --depth 1 "$url" "$ROOT/$dir"
}
clone1 https://github.com/aws-samples/aws-mainframe-modernization-carddemo.git aws-carddemo
clone1 https://github.com/IBM/cobol-is-fun.git ibm-cobol-fun
clone1 https://github.com/openmainframeproject/cobol-programming-course.git cobol-course
clone1 https://github.com/dscobol/Cobol-Projects.git dscobol-projects
clone1 https://github.com/OlegKunitsyn/gnucobol-examples.git gnucobol-examples
clone1 https://github.com/bhbandam/AZ-Legacy-Engineering.git az-legacy-engineering
clone1 https://github.com/RocketSoftwareCOBOLandMainframe/BankDemo.git rocket-bank
# Layout peel gold — COMP/COMP-3/OCCURS/REDEFINES/national (not EXTFMAP substitute)
clone1 https://github.com/bmTas/JRecord.git jrecord
clone1 https://github.com/bmTas/cb2xml.git cb2xml
# Phase 2 — IBM Z Open Editor public sample (not Restricted Materials)
clone1 https://github.com/IBM/zopeneditor-sample.git ibm-zopeneditor-sample
# Phase 7 — additional layout fixture trees
clone1 https://github.com/EffortlessMetrics/copybook-rs.git copybook-rs
clone1 https://github.com/zalmane/copybook.git zalmane-copybook
clone1 https://github.com/arunkumars-mf/cobol-copybook-to-json.git cobol-copybook-to-json
# Phase 3 — cobol-check samples
clone1 https://github.com/neopragma/cobol-check.git cobol-check
clone1 https://github.com/openmainframeproject/cobol-check.git omp-cobol-check
clone1 https://github.com/neopragma/cobol-unit-test.git cobol-unit-test
clone1 https://github.com/avishek-sen-gupta/cobol-rekt.git cobol-rekt
clone1 https://github.com/IBM/db2-samples.git ibm-db2-samples
clone1 https://github.com/douglaspands/copybook2json.git copybook2json
# proleap: repair truncated dir name then clone if still missing
if [[ -d "$ROOT/proleap-cobol-parse" && ! -d "$ROOT/proleap-cobol-parser" ]]; then
  mv "$ROOT/proleap-cobol-parse" "$ROOT/proleap-cobol-parser"
fi
clone1 https://github.com/uwol/proleap-cobol-parser.git proleap-cobol-parser
# Large — GnuCOBOL source+tests (parser torture); depth-1 still sizable
clone1 https://github.com/OCamlPro/gnucobol.git gnucobol-src
# CLBS expected at ~/COBOL-Legacy-Benchmark-Suite (separate)
if [[ ! -d "$HOME/COBOL-Legacy-Benchmark-Suite/.git" ]]; then
  git clone --depth 1 https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite.git "$HOME/COBOL-Legacy-Benchmark-Suite"
fi
echo "DONE root=$ROOT"
echo "--- file census (cbl/cob/cpy/bms) ---"
find "$ROOT" \( -iname '*.cbl' -o -iname '*.cob' -o -iname '*.cpy' -o -iname '*.bms' -o -iname '*.dcl' \) 2>/dev/null | wc -l
echo "Registry: fixtures/ci/cobol-public-corpus-registry.json"
echo "Next: pnpm run hub:cobol-corpus-census"