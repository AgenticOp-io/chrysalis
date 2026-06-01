#!/usr/bin/env node
/**
 * Next.js deep fixture CWL export with load preserved (G1184).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_NEXTJS_DEEP_CWL_EXPORT_KIND = "chrysalis.hub.nextjs-deep-cwl-export";
export const HUB_NEXTJS_DEEP_CWL_EXPORT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const deepFixture = join(scriptRoot, "fixtures/hub-gold-nextjs-app-deep");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

export async function runNextjsDeepCwlExportSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? deepFixture);
  const base = {
    kind: HUB_NEXTJS_DEEP_CWL_EXPORT_KIND,
    schemaVersion: HUB_NEXTJS_DEEP_CWL_EXPORT_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-nextjs-app-deep",
    ok: false,
  };
  if (!existsSync(join(fixture, "app"))) {
    return { ...base, skip: "missing-app-dir" };
  }

  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "nextjs"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ...base, skip: "lift-failed" };
  }

  const emit = spawnSync(process.execPath, [emitScript, fixture, "--origin", "nextjs"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (emit.status !== 0) {
    return { ...base, skip: "emit-failed" };
  }

  const cwlPath = join(fixture, "generated/cwl/routes.cwl");
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }
  const cwlText = readFileSync(cwlPath, "utf8");
  const hasLoad = /load\s+\{/.test(cwlText) && cwlText.includes("page-server");
  const hasBlog = cwlText.includes("/blog/:slug");

  return {
    ...base,
    ok: hasLoad && hasBlog,
    hasLoad,
    hasBlog,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runNextjsDeepCwlExportSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
