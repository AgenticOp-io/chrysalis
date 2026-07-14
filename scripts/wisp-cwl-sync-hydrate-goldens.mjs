#!/usr/bin/env node
/**
 * Sync hydrate-samples/*.json into wisp-api-goldens GET handlers (showcase oracle bodies).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { goldenFileName } from "./wisp-cwl-api-oracle-contract.mjs";

export const WISP_SYNC_HYDRATE_GOLDENS_KIND = "chrysalis.wisp.sync-hydrate-goldens";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const samplesDir = join(fixtureDir, "hydrate-samples");
const goldensDir = join(fixtureDir, "wisp-api-goldens");

/** Sample basename (without .json) → API path(s) to write as GET goldens. */
const SAMPLE_TO_PATHS = {
  "api-admin": ["/api/admin"],
  "api-coverage": ["/api/coverage"],
  "api-customer-billing": ["/api/customer-billing", "/api/billing"],
  "api-customers": ["/api/customers"],
  "api-deploy": ["/api/deploy"],
  "api-hss": ["/api/hss"],
  "api-inventory": ["/api/inventory", "/api/hardware"],
  "api-maintain": ["/api/maintain"],
  "api-monitoring": ["/api/monitoring"],
  "api-monitoring-graphs": ["/api/monitoring/graphs"],
  "api-network": ["/api/network"],
  "api-network-sites": ["/api/network/sites"],
  "api-network-sectors": ["/api/network/sectors"],
  "api-network-cpe": ["/api/network/cpe"],
  "api-network-equipment": ["/api/network/equipment"],
  "api-plans": ["/api/plans"],
  "api-snmp": ["/api/snmp"],
  "api-tenants": ["/api/tenants"],
  "api-users": ["/api/users"],
  "api-voice": ["/api/voice"],
  "api-work-orders": ["/api/work-orders"],
};

/**
 * @param {object} [opts]
 * @param {string} [opts.samplesDir]
 * @param {string} [opts.goldensDir]
 */
export function syncWispHydrateGoldens(opts = {}) {
  const fromDir = resolve(opts.samplesDir ?? samplesDir);
  const toDir = resolve(opts.goldensDir ?? goldensDir);
  const base = {
    kind: WISP_SYNC_HYDRATE_GOLDENS_KIND,
    schemaVersion: 1,
    ok: false,
    samplesDir: fromDir,
    goldensDir: toDir,
  };
  if (!existsSync(fromDir)) return { ...base, skip: "missing-hydrate-samples" };
  mkdirSync(toDir, { recursive: true });

  /** @type {string[]} */
  const written = [];
  const files = readdirSync(fromDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const stem = file.replace(/\.json$/i, "");
    const paths = SAMPLE_TO_PATHS[stem];
    if (!paths) continue;
    const body = JSON.parse(readFileSync(join(fromDir, file), "utf8"));
    for (const apiPath of paths) {
      const outName = goldenFileName("GET", apiPath);
      writeFileSync(join(toDir, outName), `${JSON.stringify(body, null, 2)}\n`, "utf8");
      written.push(outName);
    }
  }

  // Auth me — always present for chimera/native verify (gateway also special-cases).
  const meBody = {
    ok: true,
    authenticated: true,
    email: "preview@wisptools.local",
    surface: "wisp-auth-native",
  };
  const meName = goldenFileName("GET", "/api/me");
  writeFileSync(join(toDir, meName), `${JSON.stringify(meBody, null, 2)}\n`, "utf8");
  written.push(meName);

  // Pilot tenants golden used by older apply path.
  const tenantsGolden = join(toDir, goldenFileName("GET", "/api/tenants"));
  if (existsSync(tenantsGolden)) {
    writeFileSync(
      join(fixtureDir, "wisp-api-tenants-get.golden.json"),
      readFileSync(tenantsGolden, "utf8"),
      "utf8",
    );
  }

  return {
    ...base,
    ok: written.length > 0,
    written,
    writtenCount: written.length,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = syncWispHydrateGoldens();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-sync-hydrate-goldens")) main();
