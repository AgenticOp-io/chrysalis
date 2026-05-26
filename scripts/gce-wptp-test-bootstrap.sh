#!/usr/bin/env bash
# Run on Debian/Ubuntu GCE: install Node 20, install WPTP matrix from GitHub, validate + harness.
set -euo pipefail
export PYTHONUNBUFFERED=1
export NPM_CONFIG_LOGLEVEL="${NPM_CONFIG_LOGLEVEL:-info}"
export NPM_CONFIG_PROGRESS="${NPM_CONFIG_PROGRESS:-true}"
export NPM_CONFIG_FETCH_RETRIES="${NPM_CONFIG_FETCH_RETRIES:-5}"
export NPM_CONFIG_MAXSOCKETS="${NPM_CONFIG_MAXSOCKETS:-2}"
# One install job at a time: avoids 4+ parallel `tsc` on 2 GiB RAM (looks hung).
export NPM_CONFIG_JOBS="${NPM_CONFIG_JOBS:-1}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}"

run_npm_ci() {
  log "npm ci starting (git deps compile via prepare; often 5-15 min on e2-small)..."
  (
    npm ci --no-audit --no-fund
  ) &
  local pid=$!
  local n=0
  while kill -0 "$pid" 2>/dev/null; do
    n=$((n + 1))
    log "npm ci still running (${n}m elapsed)..."
    sleep 60
  done
  wait "$pid"
}

log() {
  echo "[gce-wptp-test-bootstrap] $(date -u +%H:%M:%S) $*"
}

MATRIX_REPO="${WPTP_MATRIX_REPO:-https://github.com/theorem6/wptp-matrix.git}"
MATRIX_REF="${WPTP_MATRIX_REF:-v0.1.10}"
ROOT="${HOME}/wptp-src"
MATRIX="${ROOT}/wptp-matrix"

export DEBIAN_FRONTEND=noninteractive
export GIT_TERMINAL_PROMPT=0
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git php-cli php-xml unzip composer || sudo apt-get install -y ca-certificates curl git php-cli

# Chrysalis verify-tiny-blog uses node:sqlite (Node 22+); matrix vitest runs on 20+.
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null || true)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo corepack enable || true
corepack prepare pnpm@9.0.0 --activate 2>/dev/null || true

if [[ ! -f /swapfile ]]; then
  sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
fi

install_matrix_ci() {
  local force="${WPTP_MATRIX_FORCE_CI:-0}"
  local stamp="${MATRIX}/.chrysalis-matrix-ref"
  local prev_ref=""
  if [[ -f "${stamp}" ]]; then
    prev_ref="$(tr -d '\r\n' < "${stamp}")"
  fi
  mkdir -p "${ROOT}"
  if [[ "$force" == "1" ]] || [[ ! -d "${MATRIX}/.git" ]] || [[ "${prev_ref}" != "${MATRIX_REF}" ]]; then
    if [[ "${prev_ref}" != "${MATRIX_REF}" ]] && [[ -n "${prev_ref}" ]]; then
      log "matrix ref changed (${prev_ref} -> ${MATRIX_REF}); recloning"
    fi
    rm -rf "${MATRIX}"
    if git clone --depth 1 --branch "${MATRIX_REF}" "${MATRIX_REPO}" "${MATRIX}" 2>/dev/null; then
      :
    else
      git clone --depth 1 "${MATRIX_REPO}" "${MATRIX}"
      git -C "${MATRIX}" checkout "${MATRIX_REF}"
    fi
    printf '%s' "${MATRIX_REF}" > "${stamp}"
    force="1"
  fi
  cd "${MATRIX}"
  log "matrix ref: $(git rev-parse --short HEAD) (tag ${MATRIX_REF})"
  if [[ -d node_modules ]] && [[ "$force" != "1" ]]; then
    log "reusing node_modules (export WPTP_MATRIX_FORCE_CI=1 to reinstall)"
  else
    run_npm_ci
    log "npm ci done"
  fi
}

install_matrix_siblings() {
  clone_tag() {
    local name="$1"
    local tag="$2"
    local dest="${ROOT}/${name}"
    rm -rf "${dest}"
    if git clone --depth 1 --branch "${tag}" "https://github.com/theorem6/${name}.git" "${dest}" 2>/dev/null; then
      return 0
    fi
    git clone --depth 1 "https://github.com/theorem6/${name}.git" "${dest}"
    git -C "${dest}" checkout "${tag}"
  }

  rm -rf "${ROOT}"
  mkdir -p "${ROOT}"
  log "fallback: cloning sibling repos..."
  clone_tag wptp-ir v0.1.3
  clone_tag wptp-adapter-openapi v0.1.1
  clone_tag wptp-adapter-browser v0.1.1
  clone_tag wptp-emit-nextjs v0.1.1
  clone_tag wptp-emit-hono v0.1.1
  clone_tag wptp-emit-fastify v0.1.0
  clone_tag wptp-matrix "${MATRIX_REF}"

  for pkg in wptp-ir wptp-adapter-openapi wptp-adapter-browser wptp-emit-nextjs wptp-emit-hono wptp-emit-fastify; do
    log "build ${pkg}..."
    (cd "${ROOT}/${pkg}" && npm install && npm run build)
  done

  export WPTP_MATRIX_DIR="${MATRIX}"
  node <<'NODE'
const fs = require("fs");
const path = require("path");
const matrixDir = process.env.WPTP_MATRIX_DIR;
const parent = path.dirname(matrixDir);
const pkgPath = path.join(matrixDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const map = {
  "@wptp/ir": "wptp-ir",
  "@wptp/adapter-openapi": "wptp-adapter-openapi",
  "@wptp/adapter-browser": "wptp-adapter-browser",
  "@wptp/emit-nextjs": "wptp-emit-nextjs",
  "@wptp/emit-hono": "wptp-emit-hono",
  "@wptp/emit-fastify": "wptp-emit-fastify",
};
for (const [dep, dir] of Object.entries(map)) {
  pkg.dependencies[dep] = "file:" + path.join(parent, dir).replace(/\\/g, "/");
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
NODE

  cd "${MATRIX}"
  rm -f package-lock.json
  npm install
}

if ! install_matrix_ci; then
  log "npm ci failed; using sibling file: install"
  install_matrix_siblings
fi

CHRYSALIS_GCE_FULL_HARNESS="${CHRYSALIS_GCE_FULL_HARNESS:-1}"
CHRYSALIS_ROOT="${CHRYSALIS_ROOT:-${HOME}/chrysalis-test}"
CHRYSALIS_REPO="${CHRYSALIS_REPO:-https://github.com/AgenticOp-io/chrysalis.git}"
CHRYSALIS_REF="${CHRYSALIS_REF:-main}"
WPTP_EMIT_NEXTJS_ROOT="${WPTP_EMIT_NEXTJS_ROOT:-${ROOT}/wptp-emit-nextjs}"
WPTP_EMIT_NEXTJS_REF="${WPTP_EMIT_NEXTJS_REF:-v0.1.1}"

ensure_chrysalis_for_harness() {
  if [[ "${CHRYSALIS_GCE_FULL_HARNESS}" != "1" ]]; then
    return 0
  fi
  local stamp="${CHRYSALIS_ROOT}/.chrysalis-gce-ref"
  local prev_ref=""
  if [[ -f "${stamp}" ]]; then
    prev_ref="$(tr -d '\r\n' < "${stamp}")"
  fi
  if [[ -f "${CHRYSALIS_ROOT}/packages/cli/dist/bin.js" ]] \
    && [[ -f "${CHRYSALIS_ROOT}/scripts/emit-webir-bundle-nextjs.mjs" ]] \
    && [[ "${prev_ref}" == "${CHRYSALIS_REF}" ]] \
    && [[ "${CHRYSALIS_GCE_FORCE_CHRYSALIS_BUILD:-0}" != "1" ]]; then
    log "reuse Chrysalis at ${CHRYSALIS_ROOT} (ref ${CHRYSALIS_REF})"
    return 0
  fi
  if [[ -d "${CHRYSALIS_ROOT}" ]] && [[ ! -f "${CHRYSALIS_ROOT}/scripts/emit-webir-bundle-nextjs.mjs" ]]; then
    log "Chrysalis tree lacks WPTP emit scripts; recloning ${CHRYSALIS_REPO}"
    rm -rf "${CHRYSALIS_ROOT}"
  fi
  if [[ "${prev_ref}" != "${CHRYSALIS_REF}" ]] && [[ -n "${prev_ref}" ]] && [[ -d "${CHRYSALIS_ROOT}/.git" ]]; then
    log "chrysalis ref changed (${prev_ref} -> ${CHRYSALIS_REF}); recloning"
    rm -rf "${CHRYSALIS_ROOT}"
  fi
  if [[ -d "${CHRYSALIS_ROOT}" ]] && [[ -f "${CHRYSALIS_ROOT}/package.json" ]] && [[ ! -d "${CHRYSALIS_ROOT}/.git" ]]; then
    log "reuse existing Chrysalis tree at ${CHRYSALIS_ROOT} (hub or tarball; no git)"
  elif [[ -d "${CHRYSALIS_ROOT}/.git" ]]; then
    log "git pull Chrysalis ${CHRYSALIS_REF} at ${CHRYSALIS_ROOT}"
    git -C "${CHRYSALIS_ROOT}" fetch --depth 1 origin "${CHRYSALIS_REF}" 2>/dev/null || true
    git -C "${CHRYSALIS_ROOT}" checkout "${CHRYSALIS_REF}" 2>/dev/null || git -C "${CHRYSALIS_ROOT}" checkout -B "${CHRYSALIS_REF}" "origin/${CHRYSALIS_REF}" 2>/dev/null || true
    git -C "${CHRYSALIS_ROOT}" pull --ff-only 2>/dev/null || true
  elif [[ ! -d "${CHRYSALIS_ROOT}" ]]; then
    log "clone Chrysalis ${CHRYSALIS_REF} -> ${CHRYSALIS_ROOT}"
    mkdir -p "$(dirname "${CHRYSALIS_ROOT}")"
    if git clone --depth 1 --branch "${CHRYSALIS_REF}" "${CHRYSALIS_REPO}" "${CHRYSALIS_ROOT}" 2>/dev/null; then
      :
    else
      git clone --depth 1 "${CHRYSALIS_REPO}" "${CHRYSALIS_ROOT}"
      git -C "${CHRYSALIS_ROOT}" checkout "${CHRYSALIS_REF}"
    fi
  else
    log "WARN: ${CHRYSALIS_ROOT} exists but is not a Chrysalis tree; remove it and re-run"
    return 1
  fi
  printf '%s' "${CHRYSALIS_REF}" > "${stamp}"
  log "build Chrysalis workspace (pnpm -r build; often 10-20 min on e2-small)..."
  (
    cd "${CHRYSALIS_ROOT}"
    pnpm install
    pnpm -r build
  )
  if command -v php >/dev/null 2>&1; then
    (cd "${CHRYSALIS_ROOT}" && pnpm run vendor:parser-bridge) || log "WARN: parser-bridge vendor failed"
  else
    log "WARN: php missing; gold php-webir-hono may be limited"
  fi
}

ensure_wptp_emit_nextjs() {
  if [[ "${CHRYSALIS_GCE_FULL_HARNESS}" != "1" ]]; then
    return 0
  fi
  local install_script="${HOME}/install-wptp-hub-deps.mjs"
  if [[ ! -f "${install_script}" ]]; then
    install_script="${CHRYSALIS_ROOT}/scripts/install-wptp-hub-deps.mjs"
  fi
  if [[ ! -f "${install_script}" ]]; then
    log "WARN: missing install-wptp-hub-deps.mjs; silver Next.js harness cases may skip"
    return 0
  fi
  log "install wptp-emit-nextjs (${WPTP_EMIT_NEXTJS_REF})..."
  WPTP_SIBLINGS_ROOT="${ROOT}" \
    WPTP_EMIT_NEXTJS_ROOT="${WPTP_EMIT_NEXTJS_ROOT}" \
    WPTP_EMIT_NEXTJS_REF="${WPTP_EMIT_NEXTJS_REF}" \
    node "${install_script}"
}

ensure_chrysalis_for_harness
ensure_wptp_emit_nextjs

cd "${MATRIX}"
log "build..."
npm run build
log "validate matrix JSON..."
npm run validate
log "site:validate..."
npm run site:validate
export VITEST_POOL_THREADS=1
log "vitest (unit + compose; excludes verify-harness.test.ts)..."
npx vitest run --exclude tests/verify-harness.test.ts

export CHRYSALIS_ROOT
export WPTP_EMIT_NEXTJS_ROOT
export WPTP_PHP_WEBIR_MIN_CORRECTNESS_PCT="${WPTP_PHP_WEBIR_MIN_CORRECTNESS_PCT:-60}"

if [[ "${CHRYSALIS_GCE_FULL_HARNESS}" == "1" ]] && [[ -f "${CHRYSALIS_ROOT}/scripts/verify-tiny-blog.mjs" ]]; then
  log "verify-tiny-blog (oracle replay for php-webir-hono gold)..."
  if ! (cd "${CHRYSALIS_ROOT}" && node scripts/verify-tiny-blog.mjs); then
    log "ERROR: verify-tiny-blog failed (need Node 22+ and php on PATH)"
    exit 1
  fi
fi

log "verify:harness (full when CHRYSALIS_ROOT set; may take several minutes)..."
npm run verify:harness
if [[ "${CHRYSALIS_GCE_FULL_HARNESS}" == "1" ]]; then
  log "OK: WPTP matrix validate + test + full verify:harness (Chrysalis gold/silver) passed."
else
  log "OK: WPTP matrix validate + test + verify:harness passed."
fi
