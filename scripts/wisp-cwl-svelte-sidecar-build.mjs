#!/usr/bin/env node
/**
 * Build WISP Module_Manager adapter-static client and pack sidecar tarball for GCE.
 * Usage: node scripts/wisp-cwl-svelte-sidecar-build.mjs [--root WISP/Module_Manager] [--out dir]
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWispClient } from "./wisp-cwl-client-build.mjs";
import { resolveWispModuleRoot } from "./lib/wisp-origin-paths.mjs";

export const WISP_SVELTE_SIDECAR_BUILD_KIND = "chrysalis.wisp.svelte-sidecar-build";
export const WISP_SVELTE_SIDECAR_BUILD_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot =
  resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR);
const defaultOut = join(scriptRoot, "generated/wisp-svelte-sidecar");

/** @param {string} src @param {string} dest */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, ent.name);
    const d = join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {string} [opts.outDir]
 */
export function buildWispSvelteSidecar(opts = {}) {
  const wispRoot = resolve(opts.wispRoot ?? defaultRoot);
  const outDir = resolve(opts.outDir ?? defaultOut);
  const clientDir = join(wispRoot, "build/client");
  const base = {
    kind: WISP_SVELTE_SIDECAR_BUILD_KIND,
    schemaVersion: WISP_SVELTE_SIDECAR_BUILD_SCHEMA_VERSION,
    ok: false,
    wispRoot,
    outDir,
    deployTarget: "gce",
  };

  const build = buildWispClient({ wispRoot, deployTarget: "gce" });
  if (!build.ok) {
    return { ...base, skip: build.skip ?? "wisp-build-failed", detail: build.detail, clientBuild: build };
  }

  const bundleRoot = join(outDir, "bundle");
  rmSync(bundleRoot, { recursive: true, force: true });
  mkdirSync(join(bundleRoot, "build/client"), { recursive: true });
  copyDir(clientDir, join(bundleRoot, "build/client"));
  copyFileSync(join(scriptRoot, "scripts/wisp-svelte-static-server.mjs"), join(bundleRoot, "wisp-svelte-static-server.mjs"));
  writeFileSync(
    join(bundleRoot, "sidecar.meta.json"),
    `${JSON.stringify({ kind: "chrysalis.wisp.svelte-sidecar", builtAt: new Date().toISOString(), mode: "gce-chimera", deployTarget: "gce" }, null, 2)}\n`,
  );

  return { ...base, ok: true, clientDir, bundleRoot, clientBuild: build };
}

function parseArgs(argv) {
  let root = defaultRoot;
  let out = defaultOut;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) root = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return { root, out };
}

async function main() {
  const { root, out } = parseArgs(process.argv);
  const r = buildWispSvelteSidecar({ wispRoot: root, outDir: out });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-svelte-sidecar-build")) main().catch((e) => { console.error(e); process.exit(1); });
