#!/usr/bin/env node
/**
 * G9944 — Next App Router loading.tsx + next/font honesty holes.
 *
 * Run: pnpm run hub:next-loading-font-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NEXT_LOADING_FONT_SMOKE_KIND = "chrysalis.hub.next-loading-font-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runNextLoadingFontSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-next");
  const loginPage = join(fixture, "app/login/page.tsx");
  if (!existsSync(loginPage) || !existsSync(join(fixture, "app/login/loading.tsx"))) {
    return {
      kind: NEXT_LOADING_FONT_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-next-loading-fixture",
    };
  }

  const ingest = await loadIngest();
  if (typeof ingest.scanNextCompanionHoles !== "function") {
    return {
      kind: NEXT_LOADING_FONT_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      error: "scanNextCompanionHoles missing — rebuild @chrysalis/ingest",
    };
  }

  const unitFont =
    ingest.scanNextFontHoles(`import { Inter } from "next/font/google"`).some(
      (h) => h.reason === ingest.HOLE_NEXT_FONT && String(h.detail).includes("next/font"),
    );

  const companions = ingest.scanNextCompanionHoles({
    pageSource: `import "./page.module.css";\nexport default function P(){ return <main/> }`,
    pageAbsPath: loginPage,
  });
  const companionOk =
    companions.some((h) => h.reason === ingest.HOLE_NEXT_LOADING && h.detail === "loading.tsx") &&
    companions.some((h) => h.reason === ingest.HOLE_NEXT_FONT);

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
    reasons.has(ingest.HOLE_NEXT_LOADING) &&
    reasons.has(ingest.HOLE_NEXT_FONT) &&
    !(login?.html ?? "").includes("@font-face");

  const ok = unitFont && companionOk && convertOk;

  return {
    kind: NEXT_LOADING_FONT_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    unitFont,
    companionOk,
    convertOk,
    holeReasons: [...reasons].sort(),
    note: "Next loading.tsx + next/font holes — no invented skeletons or @font-face",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNextLoadingFontSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-next-loading-font-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
