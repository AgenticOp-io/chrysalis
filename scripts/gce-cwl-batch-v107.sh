#!/usr/bin/env bash
# Run all v107 verify-standalone-mega slices sequentially (local / manual; GCE uses sub-phases).
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_RUN_VERIFY_STANDALONE_MEGA=1
node --input-type=module -e "
import { VERIFY_STANDALONE_MEGA_SLICE_IDS, runVerifyStandaloneMegaSubSmoke } from './scripts/hub-ingest/hub-verify-standalone-mega-batch-smoke.mjs';
for (const id of VERIFY_STANDALONE_MEGA_SLICE_IDS) {
  const r = await runVerifyStandaloneMegaSubSmoke(id);
  if (!r.ok) { console.error(r); process.exit(1); }
}
console.log('v107 ok verify-standalone-mega', VERIFY_STANDALONE_MEGA_SLICE_IDS.length, 'slices');
"
