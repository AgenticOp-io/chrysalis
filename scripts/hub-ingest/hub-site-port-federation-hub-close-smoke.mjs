#!/usr/bin/env node
/** Phase 38 VMF hub API program close (G8540). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortFederationHubApiSmoke } from "./hub-site-port-federation-hub-api-smoke.mjs";
import { runSitePortFederationCloseSmoke } from "./hub-site-port-federation-close-smoke.mjs";

export const HUB_SITE_PORT_FEDERATION_HUB_CLOSE_KIND = "chrysalis.hub.site-port-federation-hub-close-smoke";
export const HUB_SITE_PORT_FEDERATION_HUB_CLOSE_SCHEMA_VERSION = 1;

export async function runSitePortFederationHubCloseSmoke() {
  const hubApi = await runSitePortFederationHubApiSmoke();
  const federation = await runSitePortFederationCloseSmoke();
  const ok = hubApi.ok === true && federation.ok === true;
  return {
    kind: HUB_SITE_PORT_FEDERATION_HUB_CLOSE_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_HUB_CLOSE_SCHEMA_VERSION,
    ok,
    hubApi,
    federation,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationHubCloseSmoke();
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
