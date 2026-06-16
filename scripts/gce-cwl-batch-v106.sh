#!/usr/bin/env bash
# Run all v106 oracle-product-ultra slices sequentially (local / manual; GCE uses sub-phases).
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_RUN_ORACLE_PRODUCT_ULTRA=1
export CHRYSALIS_GCE_MEGA_DEDUPE="${CHRYSALIS_GCE_MEGA_DEDUPE:-1}"
export CHRYSALIS_HUB_SMOKE_PROGRESS="${CHRYSALIS_HUB_SMOKE_PROGRESS:-1}"
node --input-type=module -e "
import { ORACLE_PRODUCT_ULTRA_SLICE_IDS, runOracleProductUltraSubSmoke } from './scripts/hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs';
for (const id of ORACLE_PRODUCT_ULTRA_SLICE_IDS) {
  const r = await runOracleProductUltraSubSmoke(id);
  if (!r.ok) { console.error(r); process.exit(1); }
}
console.log('v106 ok oracle-product-ultra', ORACLE_PRODUCT_ULTRA_SLICE_IDS.length, 'slices');
"
