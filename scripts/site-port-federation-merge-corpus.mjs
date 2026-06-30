#!/usr/bin/env node
/** Merge federation submissions into public training corpus. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeFederationCorpus } from "./site-port-federation-lib.mjs";

export const FEDERATION_MERGE_CORPUS_KIND = "chrysalis.site-port-federation.merge-corpus";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runFederationMergeCorpus(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const merged = await mergeFederationCorpus(repoRoot);
  return {
    kind: FEDERATION_MERGE_CORPUS_KIND,
    schemaVersion: 1,
    ...merged,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runFederationMergeCorpus();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("site-port-federation-merge-corpus")) main();
