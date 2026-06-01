#!/usr/bin/env node
/**
 * SvelteKit deep fixture → CWL export with load lines (G1171).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_SVELTEKIT_DEEP_CWL_EXPORT_KIND = "chrysalis.hub.sveltekit-deep-cwl-export";
export const HUB_SVELTEKIT_DEEP_CWL_EXPORT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const deepFixture = join(scriptRoot, "fixtures/hub-gold-svelte-kit-deep");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

export async function runSveltekitDeepCwlExportSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? deepFixture);
  const base = {
    kind: HUB_SVELTEKIT_DEEP_CWL_EXPORT_KIND,
    schemaVersion: HUB_SVELTEKIT_DEEP_CWL_EXPORT_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-svelte-kit-deep",
    ok: false,
  };
  if (!existsSync(join(fixture, "src/routes"))) {
    return { ...base, skip: "missing-routes-dir" };
  }

  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "svelte"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ...base, skip: "lift-failed" };
  }

  const emit = spawnSync(process.execPath, [emitScript, fixture, "--origin", "svelte"], {
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
  const hasPage = cwlText.includes("@page");
  const hasSearch = cwlText.includes("/search") && (cwlText.includes("q:") || cwlText.includes("query q"));
  const ok = hasLoad && hasPage && cwlText.includes("/blog/") && hasSearch;

  return {
    ...base,
    ok,
    hasLoad,
    hasPage,
    hasSearch,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSveltekitDeepCwlExportSmoke();
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
