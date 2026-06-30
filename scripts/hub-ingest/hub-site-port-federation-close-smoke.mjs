#!/usr/bin/env node
/** Verified Migration Federation program close gate (G8460). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortFederationEntrySmoke } from "./hub-site-port-federation-entry-smoke.mjs";
import { runSitePortFederationRegistrySmoke } from "./hub-site-port-federation-registry-smoke.mjs";
import { runSitePortFederationSubmitSmoke } from "./hub-site-port-federation-submit-smoke.mjs";
import { runSitePortFederationLeagueSmoke } from "./hub-site-port-federation-league-smoke.mjs";

export const HUB_SITE_PORT_FEDERATION_CLOSE_KIND = "chrysalis.hub.site-port-federation-close-smoke";
export const HUB_SITE_PORT_FEDERATION_CLOSE_SCHEMA_VERSION = 1;

export async function runSitePortFederationCloseSmoke() {
  const entry = await runSitePortFederationEntrySmoke();
  const registry = await runSitePortFederationRegistrySmoke();
  const submit = await runSitePortFederationSubmitSmoke();
  const league = await runSitePortFederationLeagueSmoke();

  const ok =
    entry.ok === true &&
    registry.ok === true &&
    submit.ok === true &&
    league.ok === true;

  return {
    kind: HUB_SITE_PORT_FEDERATION_CLOSE_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_CLOSE_SCHEMA_VERSION,
    ok,
    entry,
    registry,
    submit,
    league,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationCloseSmoke();
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
