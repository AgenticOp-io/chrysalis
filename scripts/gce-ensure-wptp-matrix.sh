#!/usr/bin/env bash
# Ensure wptp-matrix (+ wptp-emit-nextjs) siblings for contract-first hub gold on GCE.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

SIBLINGS_ROOT="${WPTP_SIBLINGS_ROOT:-$(dirname "${REPO}")}"
MATRIX_ROOT="${WPTP_MATRIX_ROOT:-${SIBLINGS_ROOT}/wptp-matrix}"
EMIT_NEXTJS_ROOT="${WPTP_EMIT_NEXTJS_ROOT:-${SIBLINGS_ROOT}/wptp-emit-nextjs}"
MATRIX_REPO="${WPTP_MATRIX_REPO:-https://github.com/theorem6/wptp-matrix.git}"
MATRIX_REF="${WPTP_MATRIX_REF:-v0.1.10}"

export NPM_CONFIG_JOBS="${NPM_CONFIG_JOBS:-1}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning --max-old-space-size=1024}"

log() { echo "[gce-ensure-wptp] $(date -Is) $*"; }

if [[ "${CHRYSALIS_SKIP_WPTP_MATRIX:-}" == "1" ]]; then
  log "SKIP (CHRYSALIS_SKIP_WPTP_MATRIX=1)"
  exit 0
fi

ensure_matrix() {
  local stamp="${MATRIX_ROOT}/.chrysalis-matrix-ref"
  local prev_ref=""
  if [[ -f "${stamp}" ]]; then
    prev_ref="$(tr -d '\r\n' < "${stamp}")"
  fi

  local silver="${MATRIX_ROOT}/dist/compose-chrysalis-hono.js"
  if [[ -f "${silver}" ]] && [[ "${prev_ref}" == "${MATRIX_REF}" ]] && [[ "${CHRYSALIS_FORCE_WPTP_MATRIX:-}" != "1" ]]; then
    log "reuse wptp-matrix at ${MATRIX_ROOT} (${MATRIX_REF})"
    return 0
  fi

  if [[ ! -d "${MATRIX_ROOT}/.git" ]] || [[ "${prev_ref}" != "${MATRIX_REF}" ]]; then
    if [[ -n "${prev_ref}" ]] && [[ "${prev_ref}" != "${MATRIX_REF}" ]]; then
      log "matrix ref changed (${prev_ref} -> ${MATRIX_REF}); recloning"
    fi
    log "clone wptp-matrix ${MATRIX_REF} -> ${MATRIX_ROOT}"
    rm -rf "${MATRIX_ROOT}"
    if git clone --depth 1 --branch "${MATRIX_REF}" "${MATRIX_REPO}" "${MATRIX_ROOT}" 2>/dev/null; then
      :
    else
      git clone --depth 1 "${MATRIX_REPO}" "${MATRIX_ROOT}"
      git -C "${MATRIX_ROOT}" checkout "${MATRIX_REF}"
    fi
    printf '%s' "${MATRIX_REF}" > "${stamp}"
  fi

  log "npm ci + build wptp-matrix (may take several minutes on first run)..."
  (cd "${MATRIX_ROOT}" && npm ci --no-audit --no-fund && npm run build)
}

ensure_matrix

log "ensure wptp-emit-nextjs"
WPTP_SIBLINGS_ROOT="${SIBLINGS_ROOT}" \
  WPTP_EMIT_NEXTJS_ROOT="${EMIT_NEXTJS_ROOT}" \
  WPTP_MATRIX_ROOT="${MATRIX_ROOT}" \
  node scripts/install-wptp-hub-deps.mjs

log "OK matrix=${MATRIX_ROOT} emit-nextjs=${EMIT_NEXTJS_ROOT}"
