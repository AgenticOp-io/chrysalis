#!/usr/bin/env bash
# Shared mega-gate sub-phases for gce-run-all-tests and resume scripts.
# Requires: run_phase, log (defined by caller).

run_mega_subphases() {
  export CHRYSALIS_GCE_MEGA_DEDUPE="${CHRYSALIS_GCE_MEGA_DEDUPE:-1}"
  export CHRYSALIS_HUB_SMOKE_PROGRESS="${CHRYSALIS_HUB_SMOKE_PROGRESS:-1}"
  log "phase group: cwl v106 oracle product ultra (7 sub-phases)"
  run_phase cwl-v106-oracle-standalone bash scripts/gce-run-mega-slice.sh oracle-ultra oracle-standalone
  run_phase cwl-v106-laravel-min-oracle bash scripts/gce-run-mega-slice.sh oracle-ultra laravel-min-oracle
  run_phase cwl-v106-tiny-blog-oracle bash scripts/gce-run-mega-slice.sh oracle-ultra tiny-blog-oracle
  run_phase cwl-v106-evidence-standalone bash scripts/gce-run-mega-slice.sh oracle-ultra evidence-standalone
  run_phase cwl-v106-php-oracle-micro bash scripts/gce-run-mega-slice.sh oracle-ultra php-oracle-micro
  run_phase cwl-v106-php-nextjs-verify bash scripts/gce-run-mega-slice.sh oracle-ultra php-nextjs-verify
  run_phase cwl-v106-php-wedge bash scripts/gce-run-mega-slice.sh oracle-ultra php-wedge

  log "phase group: cwl v107 verify standalone mega (3 sub-phases)"
  run_phase cwl-v107-verify-playbooks bash scripts/gce-run-mega-slice.sh verify-mega verify-playbooks
  run_phase cwl-v107-post-translate-verify bash scripts/gce-run-mega-slice.sh verify-mega post-translate-verify
  run_phase cwl-v107-node-express-oracle bash scripts/gce-run-mega-slice.sh verify-mega node-express-oracle

  log "phase group: cwl v110 graduation lock (verify-gaps + migration; megas deferred to v106/v107 slices)"
  export CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS="${CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS:-1}"
  run_phase cwl-v110-verify-gaps-parallel bash scripts/gce-run-mega-slice.sh v110-graduation verify-gaps-parallel
  run_phase cwl-v110-migration-mega bash scripts/gce-run-mega-slice.sh v110-graduation migration-mega
}
