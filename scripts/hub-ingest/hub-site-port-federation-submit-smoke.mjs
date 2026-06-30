#!/usr/bin/env node
/** VMF shard submit gate (G8440, Phase 34c). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortToCwl } from "../site-port-to-cwl.mjs";
import { submitFederationShard, syncRegistryFromOpenLegacyIndex, listSubmissionFiles } from "../site-port-federation-lib.mjs";

export const HUB_SITE_PORT_FEDERATION_SUBMIT_KIND = "chrysalis.hub.site-port-federation-submit-smoke";
export const HUB_SITE_PORT_FEDERATION_SUBMIT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlog = join(scriptRoot, "fixtures/tiny-blog");

export async function runSitePortFederationSubmitSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const projectDir = resolve(opts.projectDir ?? tinyBlog);
  syncRegistryFromOpenLegacyIndex(repoRoot);

  const port = await runSitePortToCwl({
    projectDir,
    repoRoot,
    origin: "php",
    minRoutes: 5,
    verify: true,
    exportDataset: true,
  });

  const submit = await submitFederationShard({
    repoRoot,
    projectDir,
    fixtureId: "tinyBlog",
    contributor: "vmf-smoke",
  });

  const submissionsDir = join(repoRoot, "reports/federation/submissions");
  const checks = {
    portOk: port.ok === true,
    verifyCorrectness: (port.verify?.correctness ?? 0) >= 1,
    submitOk: submit.ok === true,
    submissionFile: submit.submissionPath ? existsSync(submit.submissionPath) : false,
    registryHasSubmission: listSubmissionFiles(submissionsDir).length >= 1,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_SITE_PORT_FEDERATION_SUBMIT_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_SUBMIT_SCHEMA_VERSION,
    ok,
    checks,
    port: { ok: port.ok, verifyCorrectness: port.verify?.correctness ?? null },
    submit,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationSubmitSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
