#!/usr/bin/env node
/** Verified Migration Federation program entry gate (G8420, Phase 34 entry). */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortCloseSmoke } from "./hub-site-port-close-smoke.mjs";
import { runSitePortVerifyMatrixSmoke } from "./hub-site-port-verify-matrix-smoke.mjs";

export const HUB_SITE_PORT_FEDERATION_ENTRY_KIND = "chrysalis.hub.site-port-federation-entry-smoke";
export const HUB_SITE_PORT_FEDERATION_ENTRY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const charterPath = join(scriptRoot, "fixtures/site-port-federation/chrysalis.site-port-federation.v1.json");

export async function runSitePortFederationEntrySmoke() {
  const charter = JSON.parse(readFileSync(charterPath, "utf8"));
  const charterOk =
    charter.kind === "chrysalis.site-port-federation.v1" &&
    Array.isArray(charter.publicTier?.workUnits) &&
    charter.publicTier.workUnits.length >= 3 &&
    Array.isArray(charter.publicTier?.forbidden) &&
    charter.publicTier.forbidden.includes("unverified-llm-output");

  const portClose = await runSitePortCloseSmoke();
  const verifyMatrix = await runSitePortVerifyMatrixSmoke();

  const ok = charterOk && portClose.ok === true && verifyMatrix.ok === true;

  return {
    kind: HUB_SITE_PORT_FEDERATION_ENTRY_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_ENTRY_SCHEMA_VERSION,
    ok,
    charter: {
      path: charterPath,
      name: charter.name ?? null,
      ok: charterOk,
      workUnitCount: charter.publicTier?.workUnits?.length ?? 0,
    },
    portClose: { ok: portClose.ok === true, kind: portClose.kind },
    verifyMatrix: { ok: verifyMatrix.ok === true, kind: verifyMatrix.kind, results: verifyMatrix.results },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationEntrySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
