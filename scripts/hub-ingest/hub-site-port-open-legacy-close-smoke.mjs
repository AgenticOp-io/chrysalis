#!/usr/bin/env node
/** Phase 37 Open Legacy expansion program close (G8520). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortOpenLegacyIndexCloseSmoke } from "./hub-site-port-open-legacy-index-close-smoke.mjs";
import { runSitePortOpenLegacyNightlySmoke } from "./hub-site-port-open-legacy-nightly-smoke.mjs";
import { runSitePortOpenLegacyWedgeSmoke } from "./hub-site-port-open-legacy-wedge-smoke.mjs";

export const HUB_SITE_PORT_OPEN_LEGACY_CLOSE_KIND = "chrysalis.hub.site-port-open-legacy-close-smoke";
export const HUB_SITE_PORT_OPEN_LEGACY_CLOSE_SCHEMA_VERSION = 2;

export async function runSitePortOpenLegacyCloseSmoke() {
  const indexClose = await runSitePortOpenLegacyIndexCloseSmoke();
  const wedge = await runSitePortOpenLegacyWedgeSmoke();
  const nightly = await runSitePortOpenLegacyNightlySmoke();

  const ok = indexClose.ok === true && wedge.ok === true && nightly.ok === true;

  return {
    kind: HUB_SITE_PORT_OPEN_LEGACY_CLOSE_KIND,
    schemaVersion: HUB_SITE_PORT_OPEN_LEGACY_CLOSE_SCHEMA_VERSION,
    ok,
    indexClose,
    wedge,
    nightly,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortOpenLegacyCloseSmoke();
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
