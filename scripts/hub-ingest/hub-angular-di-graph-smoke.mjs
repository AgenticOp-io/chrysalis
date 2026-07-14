#!/usr/bin/env node
/**
 * G9931 — Angular DI graph: inject targets + service edges (not inject()-presence only).
 *
 * Run: pnpm run hub:angular-di-graph-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ANGULAR_DI_GRAPH_SMOKE_KIND = "chrysalis.hub.angular-di-graph-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runAngularDiGraphSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-angular");
  const entry = join(fixture, "src/app/login/login.component.ts");
  if (!existsSync(entry)) {
    return { kind: ANGULAR_DI_GRAPH_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-angular-fixture" };
  }

  const ingest = await loadIngest();
  const graph = ingest.buildAngularDiGraph({ entryFile: entry, maxDepth: 3 });

  const edgeDetails = new Set(
    graph.edges.map((e) => `${e.from}→${e.to}`),
  );
  const graphOk =
    graph.entryClass === "LoginComponent" &&
    graph.nodes.includes("LoginComponent") &&
    graph.nodes.includes("AuthService") &&
    graph.nodes.includes("SessionStore") &&
    edgeDetails.has("LoginComponent→AuthService") &&
    edgeDetails.has("AuthService→SessionStore") &&
    graph.holes.some((h) => h.reason === "legacy:markup-lift-angular-di-edge") &&
    graph.holes.some((h) => h.reason === "legacy:markup-lift-angular-di-service");

  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
  });
  const markup = convert.uiMarkup;
  const bundles =
    markup && "bundles" in markup && Array.isArray(markup.bundles) ? markup.bundles : [];
  const login = bundles.find((b) => b.routeId === "/login");
  const reasons = new Set((login?.holes ?? []).map((h) => h.reason));
  const convertOk =
    convert.ok === true &&
    reasons.has("legacy:markup-lift-angular-di-edge") &&
    reasons.has("legacy:markup-lift-angular-di") &&
    (login?.holes ?? []).some((h) => String(h.detail).includes("LoginComponent→AuthService")) &&
    (login?.holes ?? []).some((h) => String(h.detail).includes("AuthService→SessionStore"));

  const ok = graphOk && convertOk;

  return {
    kind: ANGULAR_DI_GRAPH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    graphOk,
    convertOk,
    nodes: graph.nodes,
    edges: graph.edges,
    holeCount: graph.holes.length,
    note: "Angular DI graph walks relative inject() targets — no invented services",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runAngularDiGraphSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-angular-di-graph-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
