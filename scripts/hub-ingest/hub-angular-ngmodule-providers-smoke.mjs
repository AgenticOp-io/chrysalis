#!/usr/bin/env node
/**
 * G9945 — Angular NgModule providers DI depth.
 *
 * Run: pnpm run hub:angular-ngmodule-providers-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ANGULAR_NGMODULE_PROVIDERS_SMOKE_KIND =
  "chrysalis.hub.angular-ngmodule-providers-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runAngularNgmoduleProvidersSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-angular");
  const entry = join(fixture, "src/app/login/login.component.ts");
  if (!existsSync(entry) || !existsSync(join(fixture, "src/app/login/login.module.ts"))) {
    return {
      kind: ANGULAR_NGMODULE_PROVIDERS_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-angular-ngmodule-fixture",
    };
  }

  const ingest = await loadIngest();
  const graph = ingest.buildAngularDiGraph({ entryFile: entry, maxDepth: 4 });
  const edgeKinds = new Set(graph.edges.map((e) => `${e.kind}:${e.from}→${e.to}`));

  const ngOk =
    graph.nodes.includes("LoginModule") &&
    graph.nodes.includes("FeatureAudit") &&
    edgeKinds.has("ngmodule:LoginModule→FeatureAudit") &&
    edgeKinds.has("ngmodule:LoginModule→LoginLogger") &&
    graph.holes.some(
      (h) =>
        h.reason === ingest.HOLE_ANGULAR_DI_NGMODULE &&
        String(h.detail).includes("LoginModule"),
    );

  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
  });
  const bundles =
    convert.uiMarkup && "bundles" in convert.uiMarkup && Array.isArray(convert.uiMarkup.bundles)
      ? convert.uiMarkup.bundles
      : [];
  const login = bundles.find((b) => b.routeId === "/login");
  const reasons = new Set((login?.holes ?? []).map((h) => h.reason));
  const convertOk =
    convert.ok === true &&
    reasons.has(ingest.HOLE_ANGULAR_DI_NGMODULE) &&
    (login?.holes ?? []).some((h) => String(h.detail).includes("LoginModule→FeatureAudit"));

  const ok = ngOk && convertOk;

  return {
    kind: ANGULAR_NGMODULE_PROVIDERS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    ngOk,
    convertOk,
    nodes: graph.nodes,
    edges: graph.edges.filter((e) => e.kind === "ngmodule"),
    note: "Angular NgModule providers walked as named holes — no invented services",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runAngularNgmoduleProvidersSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-angular-ngmodule-providers-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
