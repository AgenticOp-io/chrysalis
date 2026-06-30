#!/usr/bin/env node
/** Site port verify matrix — all Open Legacy Index fixtures (G8410). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortToCwl } from "../site-port-to-cwl.mjs";
import { loadOpenLegacyIndex } from "../site-port-federation-lib.mjs";

export const HUB_SITE_PORT_VERIFY_MATRIX_KIND = "chrysalis.hub.site-port-verify-matrix-smoke";
export const HUB_SITE_PORT_VERIFY_MATRIX_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runSitePortVerifyMatrixSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const index = loadOpenLegacyIndex(repoRoot);
  const results = [];
  let ok = true;
  for (const entry of index.entries ?? []) {
    const projectDir = join(repoRoot, entry.fixtureRel);
    if (!existsSync(projectDir)) {
      results.push({ id: entry.id, ok: false, skip: "missing-fixture" });
      ok = false;
      continue;
    }
    const port = await runSitePortToCwl({
      projectDir,
      repoRoot,
      origin: entry.origin,
      minRoutes: entry.minRoutes,
      verify: true,
      verifyTarget: "hono",
      exportDataset: true,
    });
    const block = {
      id: entry.id,
      ok:
        port.ok === true &&
        port.verify?.ok === true &&
        (port.verify?.correctness ?? 0) >= 1 &&
        (port.cwl?.routeCount ?? 0) >= entry.minRoutes,
      routeCount: port.cwl?.routeCount ?? null,
      correctness: port.verify?.correctness ?? null,
      verifyMode: port.verify?.mode ?? null,
    };
    if (!block.ok) ok = false;
    results.push(block);
  }
  return {
    kind: HUB_SITE_PORT_VERIFY_MATRIX_KIND,
    schemaVersion: HUB_SITE_PORT_VERIFY_MATRIX_SCHEMA_VERSION,
    ok,
    fixtureCount: results.length,
    results,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortVerifyMatrixSmoke();
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
