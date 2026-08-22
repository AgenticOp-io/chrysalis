#!/usr/bin/env bash
# Prefer AgenticOps platforms/wptp-* when present; else engines/ next to Convert.
# Source from GCE scripts after REPO is set. Does not override explicit WPTP_* env.

chrysalis_resolve_wptp_siblings_root() {
  local repo="${1:-${REPO:-}}"
  if [[ -n "${WPTP_SIBLINGS_ROOT:-}" ]]; then
    printf '%s\n' "${WPTP_SIBLINGS_ROOT}"
    return 0
  fi
  local portfolio_platforms engines_siblings
  portfolio_platforms="$(cd "${repo}/../.." 2>/dev/null && pwd)/platforms"
  engines_siblings="$(cd "${repo}/.." 2>/dev/null && pwd)"
  if [[ -f "${portfolio_platforms}/wptp-ir/package.json" ]]; then
    printf '%s\n' "${portfolio_platforms}"
  elif [[ -f "${engines_siblings}/wptp-matrix/package.json" || -f "${engines_siblings}/wptp-ir/package.json" ]]; then
    printf '%s\n' "${engines_siblings}"
  elif [[ -d "${portfolio_platforms}" ]]; then
    printf '%s\n' "${portfolio_platforms}"
  else
    printf '%s\n' "${engines_siblings}"
  fi
}

chrysalis_export_wptp_roots() {
  local repo="${1:-${REPO:-}}"
  local siblings
  siblings="$(chrysalis_resolve_wptp_siblings_root "${repo}")"
  export WPTP_SIBLINGS_ROOT="${WPTP_SIBLINGS_ROOT:-${siblings}}"
  export WPTP_IR_ROOT="${WPTP_IR_ROOT:-${WPTP_SIBLINGS_ROOT}/wptp-ir}"
  export WPTP_MATRIX_ROOT="${WPTP_MATRIX_ROOT:-${WPTP_SIBLINGS_ROOT}/wptp-matrix}"
  export WPTP_EMIT_NEXTJS_ROOT="${WPTP_EMIT_NEXTJS_ROOT:-${WPTP_SIBLINGS_ROOT}/wptp-emit-nextjs}"
}
