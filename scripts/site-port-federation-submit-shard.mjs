#!/usr/bin/env node
/** Submit verify-gated trajectory shard to VMF registry (Phase 34c). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { submitFederationShard } from "./site-port-federation-lib.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  let projectDir = null;
  let fixtureId = null;
  let contributor = null;
  let shardPath = null;
  let repoRoot = scriptRoot;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (a === "--fixture" && argv[i + 1]) fixtureId = argv[++i];
    else if (a === "--contributor" && argv[i + 1]) contributor = argv[++i];
    else if (a === "--shard" && argv[i + 1]) shardPath = resolve(argv[++i]);
    else if (a === "--repo-root" && argv[i + 1]) repoRoot = resolve(argv[++i]);
    else if (!a.startsWith("-") && !projectDir) projectDir = resolve(a);
  }
  if (!projectDir) {
    throw new Error(
      "usage: site-port-federation-submit-shard.mjs <project-dir> [--fixture id] [--contributor name] [--shard path]",
    );
  }
  return { projectDir, fixtureId, contributor, shardPath, repoRoot };
}

export async function runFederationSubmitShard(opts) {
  return submitFederationShard(opts);
}

async function main() {
  const args = parseArgs(process.argv);
  const r = await runFederationSubmitShard(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("site-port-federation-submit-shard")) main();
