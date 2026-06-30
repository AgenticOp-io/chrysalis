#!/usr/bin/env node
/** Merge crowd-sourced WVB cases from verified federation submissions (G8450 extension). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeFederationWvb } from "./site-port-federation-lib.mjs";

export const FEDERATION_MERGE_WVB_KIND = "chrysalis.site-port-federation.merge-wvb";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runFederationMergeWvb(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const merged = await mergeFederationWvb(repoRoot);
  return {
    kind: FEDERATION_MERGE_WVB_KIND,
    schemaVersion: 1,
    ...merged,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runFederationMergeWvb();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("site-port-federation-merge-wvb")) main();
