#!/usr/bin/env node
/** VMF local hub HTTP API gate (G8530, Phase 38). */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFederationHubHandler } from "../federation-hub-server.mjs";
import { runSitePortToCwl } from "../site-port-to-cwl.mjs";
import { syncRegistryFromOpenLegacyIndex } from "../site-port-federation-lib.mjs";

export const HUB_SITE_PORT_FEDERATION_HUB_API_KIND = "chrysalis.hub.site-port-federation-hub-api-smoke";
export const HUB_SITE_PORT_FEDERATION_HUB_API_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlog = join(scriptRoot, "fixtures/tiny-blog");

function listenEphemeral(handler) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      handler(req, res).catch((e) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

/**
 * @param {object} [opts]
 */
export async function runSitePortFederationHubApiSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  syncRegistryFromOpenLegacyIndex(repoRoot);

  const port = await runSitePortToCwl({
    projectDir: tinyBlog,
    repoRoot,
    origin: "php",
    minRoutes: 5,
    verify: true,
    exportDataset: true,
  });

  const portReport = JSON.parse(readFileSync(join(tinyBlog, ".chrysalis", "site-port.json"), "utf8"));
  const handler = createFederationHubHandler({ repoRoot });
  const { server, baseUrl } = await listenEphemeral(handler);

  try {
    const health = await fetch(`${baseUrl}/api/vmf/health`).then((r) => r.json());
    const index = await fetch(`${baseUrl}/api/vmf/index`).then((r) => r.json());
    const bundle = await fetch(`${baseUrl}/api/vmf/bundle`).then((r) => r.json());
    const registryBefore = await fetch(`${baseUrl}/api/vmf/registry`).then((r) => r.json());

    const submitRes = await fetch(`${baseUrl}/api/vmf/submit-shard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectDir: tinyBlog,
        fixtureId: "tinyBlog",
        contributor: "hub-api-smoke",
      }),
    });
    const submit = await submitRes.json();
    const submitPayload = submit.submissionPath
      ? JSON.parse(readFileSync(submit.submissionPath, "utf8"))
      : null;

    const remoteRes = await fetch(`${baseUrl}/api/vmf/submit-shard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fixtureId: "tinyBlog",
        contributor: "hub-api-remote",
        portReport,
        shard: submitPayload?.shard ?? null,
      }),
    });
    const remote = await remoteRes.json();

    const publishAllRes = await fetch(`${baseUrl}/api/vmf/publish-all`, { method: "POST" });
    const publishAll = await publishAllRes.json();

    const exportShorthandRes = await fetch(`${baseUrl}/api/vmf/export-shorthand`, { method: "POST" });
    const exportShorthand = await exportShorthandRes.json();
    const shorthandGet = await fetch(`${baseUrl}/api/vmf/shorthand`).then((r) => r.json());

    const leagueGet = await fetch(`${baseUrl}/api/vmf/league`).then((r) => r.json());

    const checks = {
      healthOk: health.ok === true,
      indexEntries: (index.entries?.length ?? 0) >= 6,
      bundleOk: bundle.kind === "chrysalis.site-port-federation.open-legacy-bundle.v1",
      registryOk: (registryBefore.workUnits?.length ?? 0) >= 6,
      portOk: port.ok === true,
      submitOk: submit.ok === true,
      remoteSubmitOk: remote.ok === true,
      remoteMode: remote.mode === "remote-payload",
      publishAllOk: publishAll.ok === true,
      exportShorthandOk: exportShorthand.ok === true,
      shorthandGetOk: (shorthandGet.count ?? 0) >= 1,
      leagueGetOk: (leagueGet.entries?.length ?? 0) >= 1,
      submissionsRecorded: submit.ok === true && remote.ok === true,
    };
    const ok = Object.values(checks).every(Boolean);

    return {
      kind: HUB_SITE_PORT_FEDERATION_HUB_API_KIND,
      schemaVersion: HUB_SITE_PORT_FEDERATION_HUB_API_SCHEMA_VERSION,
      ok,
      checks,
      baseUrl,
      submit,
      remote,
      publishAll,
      exportShorthand,
      shorthandGet,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve(undefined))));
  }
}

async function main() {
  const report = await runSitePortFederationHubApiSmoke();
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
