#!/usr/bin/env bash
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
node --input-type=module -e "
import { runCwlAuthoringBatchV60Smoke } from './scripts/hub-ingest/hub-cwl-authoring-batch-v60-smoke.mjs';
const r = await runCwlAuthoringBatchV60Smoke({ skipPriorChain: true });
if (!r.ok) { console.error(r); process.exit(1); }
console.log('v60 ok', r.gate60Mode);
"
