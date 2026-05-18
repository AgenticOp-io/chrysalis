#!/usr/bin/env bash
# Run on Debian/Ubuntu GCE: install Node 20, install WPTP matrix from GitHub, validate + harness.
set -euo pipefail

MATRIX_REPO="${WPTP_MATRIX_REPO:-https://github.com/theorem6/wptp-matrix.git}"
MATRIX_REF="${WPTP_MATRIX_REF:-v0.1.7}"
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
  rm -rf "${MATRIX}"
  mkdir -p "${ROOT}"
  if git clone --depth 1 --branch "${MATRIX_REF}" "${MATRIX_REPO}" "${MATRIX}" 2>/dev/null; then
    :
  else
    git clone --depth 1 "${MATRIX_REPO}" "${MATRIX}"
    git -C "${MATRIX}" checkout "${MATRIX_REF}"
  fi
  cd "${MATRIX}"
  echo "[gce-wptp-test-bootstrap] matrix ref: $(git rev-parse --short HEAD)"
  npm ci
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
  echo "[gce-wptp-test-bootstrap] fallback: cloning sibling repos..."
  clone_tag wptp-ir v0.1.3
  clone_tag wptp-adapter-openapi v0.1.1
  clone_tag wptp-adapter-browser v0.1.1
  clone_tag wptp-emit-nextjs v0.1.1
  clone_tag wptp-emit-hono v0.1.1
  clone_tag wptp-emit-fastify v0.1.0
  clone_tag wptp-matrix "${MATRIX_REF}"

  for pkg in wptp-ir wptp-adapter-openapi wptp-adapter-browser wptp-emit-nextjs wptp-emit-hono wptp-emit-fastify; do
    echo "[gce-wptp-test-bootstrap] build ${pkg}..."
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

if ! install_matrix_ci 2>/dev/null; then
  echo "[gce-wptp-test-bootstrap] npm ci failed; using sibling file: install"
  install_matrix_siblings
fi

cd "${MATRIX}"
npm run build
npm run validate
npm run site:validate
export VITEST_POOL_THREADS=1
npx vitest run --exclude tests/verify-harness.test.ts
npm run verify:harness
echo "[gce-wptp-test-bootstrap] OK: WPTP matrix validate + test + verify:harness passed."
