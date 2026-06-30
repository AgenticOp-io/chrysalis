#!/usr/bin/env node
/** Sync VMF work-unit registry (Phase 34b). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncRegistryFromOpenLegacyIndex, expectedOpenLegacyIndexCount } from "./site-port-federation-lib.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runFederationSyncRegistry(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const registry = syncRegistryFromOpenLegacyIndex(repoRoot);
  const min = expectedOpenLegacyIndexCount(repoRoot);
  return {
    ok: (registry.workUnits?.length ?? 0) >= min,
    workUnitCount: registry.workUnits?.length ?? 0,
    registryPath: resolve(repoRoot, "reports/federation/registry.v1.json"),
    generatedAt: registry.generatedAt,
  };
}

async function main() {
  const r = await runFederationSyncRegistry();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("site-port-federation-sync-registry")) main();
