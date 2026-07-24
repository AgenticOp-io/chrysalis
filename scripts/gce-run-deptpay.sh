#!/usr/bin/env bash
# Compile/run Chrysalis DEPTPAY extract on GCE to lock expected output.
set -euo pipefail
SRC="${1:-$HOME/chrysalis-test/fixtures/hub-cobol-clbs-mini/batch/DEPTPAY.cbl}"
cobc -x -free -o /tmp/deptpay "$SRC"
/tmp/deptpay | tee /tmp/deptpay.out
