#!/usr/bin/env node
/**
 * Print **SHA-256** routing fingerprint for a chimera deploy JSON file (same payload as
 * **`chrysalis.chimera.operator-snapshot`** **`deployRoutingFingerprintSha256`**, DESIGN D258).
 * Requires **`pnpm -r build`** so **`@chrysalis/runtime-chimera`** **`dist/`** exists.
 *
 *   node scripts/chimera-routing-fingerprint.mjs fixtures/chimera-deploy-config-v1-smoke.json
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node scripts/chimera-routing-fingerprint.mjs <chimera.json>");
    process.exit(2);
  }
  const abs = resolve(file);
  const text = readFileSync(abs, "utf8");
  const rc = await import(
    pathToFileURL(resolve(ROOT, "packages/runtime-chimera/dist/index.js")).href,
  );
  const parsed = rc.parseChimeraDeployConfigJson(text, abs, {});
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exit(2);
  }
  const v = parsed.value;
  const routing = {
    ...(v.mode !== undefined ? { mode: v.mode } : {}),
    ...(v.legacy !== undefined ? { legacy: v.legacy } : {}),
    ...(v.modern !== undefined ? { modern: v.modern } : {}),
    ...(v.host !== undefined ? { host: v.host } : {}),
    ...(v.port !== undefined ? { port: v.port } : {}),
    rules: v.rules ?? [],
    ...(v.shadowLogDir !== undefined ? { shadowLogDir: v.shadowLogDir } : {}),
    ...(v.canary !== undefined ? { canary: v.canary } : {}),
    ...(v.toolVersion !== undefined ? { toolVersion: v.toolVersion } : {}),
  };
  const hex = rc.computeChimeraDeployRoutingFingerprintSha256(routing);
  console.log(hex);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(2);
});
