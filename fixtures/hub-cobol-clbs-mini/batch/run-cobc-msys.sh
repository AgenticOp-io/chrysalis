#!/usr/bin/env bash
set -euo pipefail
export PATH="/clangarm64/bin:/usr/bin:/bin:$PATH"
cobc --version
SRC="/c/Users/david/AgenticOps/engines/PHP_converter/fixtures/hub-cobol-clbs-mini/batch/CLBSMATH.cbl"
OUT="/c/Users/david/AgenticOps/engines/PHP_converter/fixtures/hub-cobol-clbs-mini/batch/.chrysalis-cobc"
/usr/bin/mkdir -p "$OUT"
cobc -x -free -o "$OUT/CLBSMATH.exe" "$SRC"
"$OUT/CLBSMATH.exe"
