#!/usr/bin/env node
/** Migration Evidence unified POC close gate (G8480). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationEvidenceDemo } from "../migration-evidence-demo.mjs";
import { expectedOpenLegacyIndexCount } from "../site-port-federation-lib.mjs";

export const HUB_MIGRATION_EVIDENCE_POC_CLOSE_KIND = "chrysalis.hub.migration-evidence-poc-close-smoke";
export const HUB_MIGRATION_EVIDENCE_POC_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runMigrationEvidencePocCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  process.env.CHRYSALIS_POC_SKIP_BUILD = "1";
  process.env.CHRYSALIS_FEDERATION_CONTRIBUTOR = opts.contributor ?? "evidence-close-smoke";

  const demo = await runMigrationEvidenceDemo({
    repoRoot,
    skipBuild: true,
    contributor: "evidence-close-smoke",
  });

  const hubPath = join(repoRoot, "reports/migration-evidence/poc/index.html");
  const expectedCount = expectedOpenLegacyIndexCount(repoRoot);
  const federationPorts = demo.federation?.ports ?? [];
  const checks = {
    demoOk: demo.ok === true,
    hubExists: existsSync(hubPath),
    federationHubExists: existsSync(join(repoRoot, "reports/federation/poc/index.html")),
    webLlmHubExists: existsSync(join(repoRoot, "reports/web-llm/poc/index.html")),
    vmfFixtureCount: federationPorts.length >= expectedCount,
    vmfPortsGreen: federationPorts.every((p) => p.portOk === true),
    vmfSubmitsGreen: federationPorts.every((p) => p.submitOk === true),
    webLlmGreen: demo.webLlm?.ok === true,
    webLlmPassCount: (demo.webLlm?.passCount ?? 0) >= 4,
    corpusShards: (demo.federation?.corpus?.shardCount ?? 0) >= expectedCount,
    shorthandCount: (demo.federation?.shorthand?.count ?? 0) >= expectedCount * 2,
    shorthandHubExists: existsSync(join(repoRoot, "reports/web-llm/shorthand/poc/index.html")),
    hubProgramsGreen:
      (demo.hub?.programsGreen ?? 0) >= (demo.hub?.programCount ?? 4) &&
      (demo.hub?.programCount ?? 0) >= 4,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_MIGRATION_EVIDENCE_POC_CLOSE_KIND,
    schemaVersion: HUB_MIGRATION_EVIDENCE_POC_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    demo,
    hubPath,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationEvidencePocCloseSmoke();
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
