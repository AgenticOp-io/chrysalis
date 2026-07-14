#!/usr/bin/env node
/**
 * G9941 — Angular providedIn + component providers DI depth.
 *
 * Run: pnpm run hub:angular-provided-in-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ANGULAR_PROVIDED_IN_SMOKE_KIND = "chrysalis.hub.angular-provided-in-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runAngularProvidedInSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-angular");
  const entry = join(fixture, "src/app/login/login.component.ts");
  if (!existsSync(entry)) {
    return {
      kind: ANGULAR_PROVIDED_IN_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-angular-fixture",
    };
  }

  const ingest = await loadIngest();
  if (typeof ingest.parseAngularProvidedIn !== "function") {
    return {
      kind: ANGULAR_PROVIDED_IN_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      error: "parseAngularProvidedIn missing — rebuild @chrysalis/ingest",
    };
  }

  const graph = ingest.buildAngularDiGraph({ entryFile: entry, maxDepth: 4 });
  const pinScopes = new Map(graph.providedIn.map((p) => [p.className, p.scope]));
  const edgeKinds = new Set(graph.edges.map((e) => `${e.kind}:${e.from}→${e.to}`));

  const providedInOk =
    pinScopes.get("AuthService") === "root" &&
    pinScopes.get("SessionStore") === "root" &&
    pinScopes.get("LoginLogger") === undefined &&
    graph.holes.some(
      (h) =>
        h.reason === ingest.HOLE_ANGULAR_DI_PROVIDED_IN &&
        String(h.detail).includes("AuthService providedIn:root"),
    ) &&
    graph.holes.some(
      (h) =>
        h.reason === ingest.HOLE_ANGULAR_DI_PROVIDED_IN &&
        String(h.detail).includes("LoginLogger providedIn:(none)"),
    );

  const providersOk =
    edgeKinds.has("providers:LoginComponent→LoginLogger") &&
    graph.holes.some(
      (h) =>
        h.reason === ingest.HOLE_ANGULAR_DI_PROVIDERS &&
        String(h.detail).includes("LoginComponent providers:LoginLogger"),
    ) &&
    graph.nodes.includes("LoginLogger");

  const unitOk =
    ingest.parseAngularProvidedIn('@Injectable({ providedIn: "root" })\nexport class X {}') ===
      "root" &&
    ingest.parseAngularProvidersList("providers: [Foo, Bar]").join(",") === "Foo,Bar";

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
    reasons.has(ingest.HOLE_ANGULAR_DI_PROVIDED_IN) &&
    reasons.has(ingest.HOLE_ANGULAR_DI_PROVIDERS);

  const ok = unitOk && providedInOk && providersOk && convertOk;

  return {
    kind: ANGULAR_PROVIDED_IN_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    unitOk,
    providedInOk,
    providersOk,
    convertOk,
    providedIn: graph.providedIn,
    edges: graph.edges,
    note: "Angular providedIn scopes + component providers edges — no invented DI",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runAngularProvidedInSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-angular-provided-in-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
