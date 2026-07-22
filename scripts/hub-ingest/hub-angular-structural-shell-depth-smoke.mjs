#!/usr/bin/env node
/**
 * G9926 — Angular structural-shell depth: named holes for *ngIf/*ngFor/interp + DI.
 *
 * Run: pnpm run hub:angular-structural-shell-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ANGULAR_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND =
  "chrysalis.hub.angular-structural-shell-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runAngularStructuralShellDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-angular");
  if (!existsSync(fixture)) {
    return {
      kind: ANGULAR_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-angular-fixture",
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
    reasons.has("legacy:markup-lift-angular-if") &&
    reasons.has("legacy:markup-lift-angular-for") &&
    reasons.has("legacy:markup-lift-angular-interp") &&
    reasons.has("legacy:markup-lift-angular-di") &&
    (reasons.has("legacy:markup-lift-angular-event") ||
      reasons.has("legacy:markup-lift-angular-component") ||
      reasons.has("legacy:markup-lift-angular-async"));

  const html = login?.html ?? "";
  const shellOk =
    html.includes('data-cwl-shell-key="showHint"') &&
    html.includes('data-cwl-shell-key="showUpgradeModal"');

  const unit = ingest.liftStructuralAngularTemplateHtml(
    `<p *ngIf="x">{{ y }}</p><button (click)="go()">Go</button>`,
  );
  const unitOk =
    unit !== null &&
    unit.liftMode === "structural-shell" &&
    unit.holes.some((h) => h.reason === "legacy:markup-lift-angular-if");

  const overlayUnit = ingest.liftStructuralAngularTemplateHtml(
    `<div *ngIf="showModal" class="m">Hi</div>`,
  );
  const overlayOk =
    overlayUnit !== null &&
    String(overlayUnit.html).includes('data-cwl-shell-key="showModal"');

  const di = ingest.scanAngularTsForDiHoles(`import { inject } from "@angular/core";
const s = inject(Svc);`);
  const diOk = di.some((h) => h.reason === "legacy:markup-lift-angular-di");

  const staticRefuse = ingest.liftStaticAngularTemplateHtml(
    `<p *ngIf="x">{{ y }}</p>`,
  );
  const staticOk = staticRefuse === null;

  const ok =
    convert.ok === true &&
    markup?.ok === true &&
    holeOk &&
    shellOk &&
    unitOk &&
    overlayOk &&
    diOk &&
    staticOk;

  return {
    kind: ANGULAR_STRUCTURAL_SHELL_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    framework: markup && "framework" in markup ? markup.framework : null,
    loginLiftMode: login?.liftMode ?? null,
    holeReasons: [...reasons].sort(),
    holeCount: holes.length,
    shellOk,
    unitOk,
    overlayOk,
    diOk,
    staticOk,
    note: "Angular structural-shell emits named template + DI holes + overlay shells",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runAngularStructuralShellDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-angular-structural-shell-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
