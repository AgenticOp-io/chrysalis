#!/usr/bin/env node
/** Site-Port + VMF unified POC close gate (G8470). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFederationDemo } from "../site-port-federation-demo.mjs";
import { runSitePortFederationCloseSmoke } from "./hub-site-port-federation-close-smoke.mjs";
import { expectedOpenLegacyIndexCount } from "../site-port-federation-lib.mjs";

export const HUB_SITE_PORT_FEDERATION_POC_CLOSE_KIND = "chrysalis.hub.site-port-federation-poc-close-smoke";
export const HUB_SITE_PORT_FEDERATION_POC_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runSitePortFederationPocCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  process.env.CHRYSALIS_FEDERATION_CONTRIBUTOR = opts.contributor ?? "poc-close-smoke";
  process.env.CHRYSALIS_POC_SKIP_BUILD = "1";

  const expectedCount = expectedOpenLegacyIndexCount(repoRoot);

  const demo = await runFederationDemo({ repoRoot, skipBuild: true, contributor: "poc-close-smoke" });
  const federationClose = await runSitePortFederationCloseSmoke();

  const hubPath = join(repoRoot, "reports/federation/poc/index.html");
  const wvbPath = join(repoRoot, "reports/federation/wvb/chrysalis.web-verify-benchmark.federation.v1.json");
  const corpusPath = join(repoRoot, "reports/federation/corpus/training-shards.v1.jsonl");

  const checks = {
    demoOk: demo.ok === true,
    federationCloseOk: federationClose.ok === true,
    hubExists: existsSync(hubPath),
    wvbExists: existsSync(wvbPath),
    corpusExists: existsSync(corpusPath),
    indexFixtureCount: (demo.ports?.length ?? 0) >= expectedCount,
    allPortsGreen: (demo.ports ?? []).every((p) => p.portOk === true),
    allSubmitsGreen: (demo.ports ?? []).every((p) => p.submitOk === true),
    corpusShards: (demo.corpus?.shardCount ?? 0) >= expectedCount,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_SITE_PORT_FEDERATION_POC_CLOSE_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_POC_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    demo,
    federationClose: { ok: federationClose.ok === true },
    hubPath,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationPocCloseSmoke();
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
