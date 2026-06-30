#!/usr/bin/env node
/** Federation registry gate — syncs from Open Legacy Index (G8430). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEDERATION_REGISTRY_KIND,
  openLegacyIndexEntries,
  syncRegistryFromOpenLegacyIndex,
} from "../site-port-federation-lib.mjs";

export const HUB_SITE_PORT_FEDERATION_REGISTRY_KIND = "chrysalis.hub.site-port-federation-registry-smoke";
export const HUB_SITE_PORT_FEDERATION_REGISTRY_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runSitePortFederationRegistrySmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const expected = openLegacyIndexEntries(repoRoot);
  const registry = syncRegistryFromOpenLegacyIndex(repoRoot);
  const registryPath = join(repoRoot, "reports/federation/registry.v1.json");
  const ids = (registry.workUnits ?? []).map((w) => w.id);
  const checks = {
    registryKind: registry.kind === FEDERATION_REGISTRY_KIND,
    registryExists: existsSync(registryPath),
    workUnitCount: ids.length >= expected.length,
    allIndexIdsPresent: expected.every((e) => ids.includes(e.id)),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: HUB_SITE_PORT_FEDERATION_REGISTRY_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_REGISTRY_SCHEMA_VERSION,
    ok,
    checks,
    workUnits: ids,
    expectedIds: expected.map((e) => e.id),
    registryPath,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationRegistrySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
