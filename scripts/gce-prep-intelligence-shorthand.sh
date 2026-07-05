#!/usr/bin/env bash
# G8560/G8610 prep — site-port exports + intelligence shorthands (CPU, no GPU).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
MARKER="${HOME}/.chrysalis/intelligence-shorthand-prep.ok"
HEAD_FILE="${HOME}/.chrysalis/intelligence-shorthand-prep.head"
LOG="${REPO}/reports/ci/gce-intelligence-shorthand-prep.log"

if [[ "${CHRYSALIS_SKIP_INTELLIGENCE_SHORTHAND_PREP:-}" == "1" ]]; then
  echo "[gce-prep-intelligence-shorthand] skip (CHRYSALIS_SKIP_INTELLIGENCE_SHORTHAND_PREP=1)"
  exit 0
fi

REPO_HEAD="unknown"
if [[ -f "${REPO}/.chrysalis/deployed-head" ]]; then
  REPO_HEAD="$(tr -d '\n\r' <"${REPO}/.chrysalis/deployed-head")"
elif git -C "${REPO}" rev-parse HEAD >/dev/null 2>&1; then
  REPO_HEAD="$(git -C "${REPO}" rev-parse HEAD)"
fi
CACHED_HEAD=""
if [[ -f "${HEAD_FILE}" ]]; then
  CACHED_HEAD="$(tr -d '\n\r' <"${HEAD_FILE}")"
fi

if [[ "${REPO_HEAD}" == "unknown" ]]; then
  echo "[gce-prep-intelligence-shorthand] WARN: no deployed HEAD — skipping cache"
elif [[ -f "${MARKER}" && "${CHRYSALIS_FORCE_INTELLIGENCE_SHORTHAND_PREP:-}" != "1" && "${CACHED_HEAD}" == "${REPO_HEAD}" ]]; then
  echo "[gce-prep-intelligence-shorthand] OK (cached ${MARKER} @ ${REPO_HEAD:0:12})"
  exit 0
fi

if [[ -f "${MARKER}" && "${CACHED_HEAD}" != "${REPO_HEAD}" ]]; then
  echo "[gce-prep-intelligence-shorthand] repo HEAD changed (${CACHED_HEAD:0:12} -> ${REPO_HEAD:0:12}); re-running prep"
fi

cd "${REPO}"
mkdir -p "${REPO}/reports/ci"

if [[ -f "${HOME}/.chrysalis/gce-hub-env.sh" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.chrysalis/gce-hub-env.sh"
fi

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_POC_SKIP_BUILD="${CHRYSALIS_POC_SKIP_BUILD:-1}"
export CHRYSALIS_WEB_LLM_TRAJECTORY="${CHRYSALIS_WEB_LLM_TRAJECTORY:-1}"

echo "[gce-prep-intelligence-shorthand] running hub:intelligence-shorthand-close-smoke..."
if command -v stdbuf >/dev/null 2>&1; then
  stdbuf -oL -eL pnpm run hub:intelligence-shorthand-close-smoke 2>&1 | tee "${LOG}"
else
  pnpm run hub:intelligence-shorthand-close-smoke 2>&1 | tee "${LOG}"
fi

date -Is >"${MARKER}"
echo "${REPO_HEAD}" >"${HEAD_FILE}"
echo "[gce-prep-intelligence-shorthand] OK marker ${MARKER} @ ${REPO_HEAD:0:12}"
