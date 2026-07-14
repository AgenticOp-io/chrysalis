#!/usr/bin/env node
/**
 * G9924 — Vue structural-shell depth: named holes for v-if/v-for/interp (not static-only smoke).
 *
 * Run: pnpm run hub:vue-structural-shell-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND = "chrysalis.hub.vue-structural-shell-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runVueStructuralShellDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-vue");
  if (!existsSync(fixture)) {
    return {
      kind: VUE_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-vue-fixture",
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
  const holeOk =
    login?.liftMode === "structural-shell" &&
    reasons.has("legacy:markup-lift-vue-if") &&
    reasons.has("legacy:markup-lift-vue-for") &&
    reasons.has("legacy:markup-lift-vue-interp") &&
    (reasons.has("legacy:markup-lift-vue-event") || reasons.has("legacy:markup-lift-vue-component"));

  const unit = ingest.liftStructuralVueTemplateHtml(
    `<template><p v-if="x">{{ y }}</p></template>`,
  );
  const unitOk =
    unit !== null &&
    unit.liftMode === "structural-shell" &&
    unit.holes.some((h) => h.reason === "legacy:markup-lift-vue-if");

  const ok = convert.ok === true && markup?.ok === true && holeOk && unitOk;

  return {
    kind: VUE_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    framework: markup && "framework" in markup ? markup.framework : null,
    loginLiftMode: login?.liftMode ?? null,
    holeReasons: [...reasons].sort(),
    holeCount: holes.length,
    unitOk,
    note: "Vue structural-shell emits named holes — not a static-only proof",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runVueStructuralShellDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-vue-structural-shell-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
