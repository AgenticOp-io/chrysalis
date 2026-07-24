#!/usr/bin/env bash
# Clone public COBOL prove/demo corpora for Chrysalis external prove smoke.
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
# CLBS expected at ~/COBOL-Legacy-Benchmark-Suite (separate)
if [[ ! -d "$HOME/COBOL-Legacy-Benchmark-Suite/.git" ]]; then
  git clone --depth 1 https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite.git "$HOME/COBOL-Legacy-Benchmark-Suite"
fi
echo "DONE root=$ROOT"
find "$ROOT" \( -iname '*.cbl' -o -iname '*.cob' -o -iname '*.cpy' \) | wc -l
