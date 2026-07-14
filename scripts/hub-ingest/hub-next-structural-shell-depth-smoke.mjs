#!/usr/bin/env node
/**
 * G9925 — Next structural-shell depth: named holes (no silent `{…}` strip).
 *
 * Run: pnpm run hub:next-structural-shell-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NEXT_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND = "chrysalis.hub.next-structural-shell-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runNextStructuralShellDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-next");
  if (!existsSync(fixture)) {
    return {
      kind: NEXT_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-next-fixture",
    };
  }

  const ingest = await loadIngest();
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
  const holes = login?.holes ?? [];
  const reasons = new Set(holes.map((h) => h.reason));
  const html = login?.html ?? "";
  const holeOk =
    login?.liftMode === "structural-shell" &&
    reasons.has("legacy:markup-lift-next-client") &&
    reasons.has("legacy:markup-lift-next-interp") &&
    reasons.has("legacy:markup-lift-next-component") &&
    html.includes("data-cwl-hole") &&
    !/\{title\}/.test(html);

  const unit = ingest.liftStructuralNextPageJsx(`
"use client";
export default function P() {
  return (<main><h1>{title}</h1><Chip /></main>);
}
`);
  const unitOk =
    unit !== null &&
    unit.liftMode === "structural-shell" &&
    unit.holes.some((h) => h.reason === "legacy:markup-lift-next-interp") &&
    unit.holes.some((h) => h.reason === "legacy:markup-lift-next-client");

  const staticRefuse = ingest.liftStaticNextPageJsx(`export default function P(){return (<h1>{x}</h1>);}`);
  const staticOk = staticRefuse === null;

  const ok = convert.ok === true && markup?.ok === true && holeOk && unitOk && staticOk;

  return {
    kind: NEXT_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    framework: markup && "framework" in markup ? markup.framework : null,
    loginLiftMode: login?.liftMode ?? null,
    holeReasons: [...reasons].sort(),
    holeCount: holes.length,
    unitOk,
    staticOk,
    note: "Next structural-shell records holes — static mode refuses silent strip",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNextStructuralShellDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-next-structural-shell-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
