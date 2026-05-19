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
MATRIX_REF="${WPTP_MATRIX_REF:-main}"
ROOT="${HOME}/wptp-src"
MATRIX="${ROOT}/wptp-matrix"

export DEBIAN_FRONTEND=noninteractive
export GIT_TERMINAL_PROMPT=0
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null || true)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
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
  mkdir -p "${ROOT}"
  if [[ "$force" == "1" ]] || [[ ! -d "${MATRIX}/.git" ]]; then
    rm -rf "${MATRIX}"
    if git clone --depth 1 --branch "${MATRIX_REF}" "${MATRIX_REPO}" "${MATRIX}" 2>/dev/null; then
      :
    else
      git clone --depth 1 "${MATRIX_REPO}" "${MATRIX}"
      git -C "${MATRIX}" checkout "${MATRIX_REF}"
    fi
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
log "verify:harness (12 cases; may take several minutes)..."
npm run verify:harness
log "OK: WPTP matrix validate + test + verify:harness passed."
