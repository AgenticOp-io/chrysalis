#!/usr/bin/env node
/**
 * G9943 — Shared multi-origin convert-site orchestration (no per-framework forks).
 *
 * Run: pnpm run hub:multi-origin-convert-orch-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MULTI_ORIGIN_CONVERT_ORCH_SMOKE_KIND =
  "chrysalis.hub.multi-origin-convert-orch-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runMultiOriginConvertOrchSmoke() {
  const vue = join(ROOT, "fixtures/ui-markup-vue");
  const next = join(ROOT, "fixtures/ui-markup-next");
  const angular = join(ROOT, "fixtures/ui-markup-angular");
  if (![vue, next, angular].every((p) => existsSync(p))) {
    return {
      kind: MULTI_ORIGIN_CONVERT_ORCH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-origin-fixtures",
    };
  }

  const ingest = await loadIngest();
  if (typeof ingest.convertMultiOriginProjects !== "function") {
    return {
      kind: MULTI_ORIGIN_CONVERT_ORCH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      error: "convertMultiOriginProjects missing — rebuild @chrysalis/ingest",
    };
  }

  const batch = ingest.convertMultiOriginProjects({
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
    projects: [
      { id: "vue", projectDir: vue },
      { id: "next", projectDir: next },
      { id: "angular", projectDir: angular },
    ],
  });

  const byId = Object.fromEntries(batch.projects.map((p) => [p.id, p]));
  const frameworksOk =
    byId.vue?.framework === "vite-vue" &&
    byId.next?.framework === "next-app" &&
    (byId.angular?.framework === "angular" ||
      byId.angular?.markupFramework === "angular" ||
      (byId.angular?.ok === true && byId.angular.markupBundleCount >= 1));

  const countsOk =
    (byId.vue?.assetBundleCount ?? 0) >= 1 &&
    (byId.next?.assetBundleCount ?? 0) >= 1 &&
    (byId.angular?.markupBundleCount ?? 0) >= 1;

  const ok = batch.ok === true && batch.kind === ingest.MULTI_ORIGIN_CONVERT_KIND && frameworksOk && countsOk;

  return {
    kind: MULTI_ORIGIN_CONVERT_ORCH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    batchOk: batch.ok,
    frameworksOk,
    countsOk,
    projects: batch.projects.map((p) => ({
      id: p.id,
      ok: p.ok,
      framework: p.framework,
      markupFramework: p.markupFramework,
      assetBundleCount: p.assetBundleCount,
      markupBundleCount: p.markupBundleCount,
      skip: p.skip,
    })),
    note: "One convertMultiOriginProjects API lifts Vue/Next/Angular — Tier C precondition",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMultiOriginConvertOrchSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-multi-origin-convert-orch-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
