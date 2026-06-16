#!/usr/bin/env bash
# Run v110 graduation lock slices (local / manual; GCE uses sub-phases + skips repeat megas by default).
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_RUN_FULL_GRADUATION_LOCK=1
export CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS="${CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS:-1}"
node --input-type=module -e "
import { runPost90HubGraduationLockGate } from './scripts/hub-ingest/hub-cwl-fullstack-gates.mjs';
const r = await runPost90HubGraduationLockGate();
if (!r.ok) { console.error(r); process.exit(1); }
console.log('v110 ok post90-hub-graduation-lock skipRepeatMegas=', r.skipRepeatMegas);
"
