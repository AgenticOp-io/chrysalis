#!/usr/bin/env node
/** Export Open Legacy Index contributor bundle (metadata only — no source). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportOpenLegacyBundle } from "./site-port-federation-lib.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runFederationExportBundle(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  return exportOpenLegacyBundle(repoRoot);
}

async function main() {
  const r = await runFederationExportBundle();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("site-port-federation-export-bundle")) main();
