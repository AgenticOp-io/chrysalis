#!/usr/bin/env bash
# Run one mega-gate sub-phase (oracle ultra slice, verify mega slice, or v110 graduation slice).
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_GCE_MEGA_DEDUPE="${CHRYSALIS_GCE_MEGA_DEDUPE:-1}"
export CHRYSALIS_HUB_SMOKE_PROGRESS="${CHRYSALIS_HUB_SMOKE_PROGRESS:-1}"

KIND="${1:?usage: gce-run-mega-slice.sh <oracle-ultra|verify-mega|v110-graduation> <slice-id>}"
SLICE="${2:?missing slice id}"

case "${KIND}" in
  oracle-ultra)
    export CHRYSALIS_ORACLE_ULTRA_SLICE="${SLICE}"
    node --input-type=module -e "
import { runOracleProductUltraSubSmoke } from './scripts/hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs';
const r = await runOracleProductUltraSubSmoke(process.env.CHRYSALIS_ORACLE_ULTRA_SLICE);
if (!r.ok) { console.error(JSON.stringify(r, null, 2)); process.exit(1); }
console.log('oracle-ultra ok', r.sliceId);
"
    ;;
  verify-mega)
    export CHRYSALIS_VERIFY_MEGA_SLICE="${SLICE}"
    node --input-type=module -e "
import { runVerifyStandaloneMegaSubSmoke } from './scripts/hub-ingest/hub-verify-standalone-mega-batch-smoke.mjs';
const r = await runVerifyStandaloneMegaSubSmoke(process.env.CHRYSALIS_VERIFY_MEGA_SLICE);
if (!r.ok) { console.error(JSON.stringify(r, null, 2)); process.exit(1); }
console.log('verify-mega ok', r.sliceId);
"
    ;;
  v110-graduation)
    export CHRYSALIS_V110_GRADUATION_SLICE="${SLICE}"
    export CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS="${CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS:-1}"
    if [[ "${SLICE}" == "verify-gaps-parallel" || "${SLICE}" == "migration-mega" ]]; then
      bash "${REPO}/scripts/gce-ensure-fixture-emits.sh"
    fi
    node --input-type=module -e "
import { runPost90HubGraduationLockGate } from './scripts/hub-ingest/hub-cwl-fullstack-gates.mjs';
const r = await runPost90HubGraduationLockGate({ onlySlice: process.env.CHRYSALIS_V110_GRADUATION_SLICE });
if (!r.ok) { console.error(JSON.stringify(r, null, 2)); process.exit(1); }
console.log('v110-graduation ok', process.env.CHRYSALIS_V110_GRADUATION_SLICE);
"
    ;;
  *)
    echo "unknown kind: ${KIND} (expected oracle-ultra, verify-mega, or v110-graduation)" >&2
    exit 2
    ;;
esac
