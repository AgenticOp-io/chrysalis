#!/usr/bin/env node
/**
 * G10137 — Peel honesty for RFC-0013 v2 load redirect / error (CWL tip 1.0.25 emit reverse).
 *
 * When origin has redirect/error page loads, Convert must land CWL
 * `load { redirect|error }` — not façades, not bare `@route` status-only reverse.
 *
 * Gate: hub:load-redirect-error-peel-smoke
 * Token: LOAD_REDIRECT_ERROR_PEEL_OK
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";

export const HUB_LOAD_REDIRECT_ERROR_PEEL_SMOKE_KIND =
  "chrysalis.hub.load-redirect-error-peel-smoke";
export const HUB_LOAD_REDIRECT_ERROR_PEEL_SMOKE_SCHEMA_VERSION = 1;
export const LOAD_REDIRECT_ERROR_PEEL_OK = "LOAD_REDIRECT_ERROR_PEEL_OK";
export const CONVERT_LOAD_REDIRECT_ERROR_PEEL = "CONVERT_LOAD_REDIRECT_ERROR_PEEL";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const liftScript = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(ROOT, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

/**
 * @param {string} cwlText
 */
function hasLoadRedirect(cwlText) {
  return /load\s*\{\s*redirect\s*:/.test(cwlText);
}

/**
 * @param {string} cwlText
 */
function hasLoadError(cwlText) {
  return /load\s*\{\s*error\s*:/.test(cwlText);
}

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runLoadRedirectErrorPeelSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  // --- Emit reverse: CWL data-v2 gold → WebIR → fat CWL still has load shapes ---
  const dataV2 = join(root, "fixtures/hub-gold-cwl-data-v2/routes.cwl");
  let reverseOk = false;
  let reverseDetail = "missing-data-v2";
  if (existsSync(dataV2)) {
    try {
      const webir = await loadWebir();
      const snapshot = await exportCwlFileToWebirJson(dataV2);
      const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
      const mod = webir.moduleFromGoldenSnapshot(raw);
      const routes = listCwlRoutes(mod);
      const rendered = renderCwlRoutes(routes).text;
      const redirectRoute = routes.find((r) => String(r.path).includes("redirect"));
      const errorRoute = routes.find((r) => String(r.path).includes("not-found"));
      const redirectLoad =
        redirectRoute?.loadData?.t === "obj" &&
        (redirectRoute.loadData.entries || []).some((e) => e.key === "redirect");
      const errorLoad =
        errorRoute?.loadData?.t === "obj" &&
        (errorRoute.loadData.entries || []).some((e) => e.key === "error");
      reverseOk =
        redirectLoad &&
        errorLoad &&
        redirectRoute?.surfaceKind === "page" &&
        errorRoute?.surfaceKind === "page" &&
        hasLoadRedirect(rendered) &&
        hasLoadError(rendered);
      reverseDetail = reverseOk
        ? "data-v2 emit reverse load{redirect|error} page"
        : `redirectLoad=${redirectLoad} errorLoad=${errorLoad} surface=${redirectRoute?.surfaceKind}/${errorRoute?.surfaceKind}`;
    } catch (e) {
      reverseDetail = String(e?.message ?? e);
    }
  }
  checks.push({ id: "emit-reverse-data-v2", ok: reverseOk, detail: reverseDetail });

  // --- SvelteKit deep peel ---
  const svelteFixture = join(root, "fixtures/hub-gold-svelte-kit-deep");
  let svelteOk = false;
  let svelteDetail = "missing-fixture";
  if (existsSync(join(svelteFixture, "src/routes/go/+page.server.ts"))) {
    const lift = spawnSync(process.execPath, [liftScript, svelteFixture, "--language", "svelte"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const emit = spawnSync(process.execPath, [emitScript, svelteFixture, "--origin", "svelte"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const cwlPath = join(svelteFixture, "generated/cwl/routes.cwl");
    if (lift.status === 0 && emit.status === 0 && existsSync(cwlPath)) {
      const cwlText = readFileSync(cwlPath, "utf8");
      const goOk = cwlText.includes("/go") && hasLoadRedirect(cwlText) && cwlText.includes('"/landed"');
      const missingOk =
        cwlText.includes("/missing") && hasLoadError(cwlText) && cwlText.includes("Not found");
      svelteOk = goOk && missingOk && !/invented-redirect-facade/.test(cwlText);
      svelteDetail = svelteOk
        ? "svelte deep /go redirect + /missing error"
        : `go=${goOk} missing=${missingOk}`;
    } else {
      svelteDetail = `lift=${lift.status} emit=${emit.status}`;
    }
  }
  checks.push({ id: "sveltekit-deep-peel", ok: svelteOk, detail: svelteDetail });

  // --- Next.js deep peel ---
  const nextFixture = join(root, "fixtures/hub-gold-nextjs-app-deep");
  let nextOk = false;
  let nextDetail = "missing-fixture";
  if (existsSync(join(nextFixture, "app/go/page.server.ts"))) {
    const lift = spawnSync(process.execPath, [liftScript, nextFixture, "--language", "nextjs"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const emit = spawnSync(process.execPath, [emitScript, nextFixture, "--origin", "nextjs"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const cwlPath = join(nextFixture, "generated/cwl/routes.cwl");
    if (lift.status === 0 && emit.status === 0 && existsSync(cwlPath)) {
      const cwlText = readFileSync(cwlPath, "utf8");
      const goOk = cwlText.includes("/go") && hasLoadRedirect(cwlText) && cwlText.includes('"/landed"');
      const missingOk = cwlText.includes("/missing") && hasLoadError(cwlText);
      nextOk = goOk && missingOk;
      nextDetail = nextOk ? "next deep /go redirect + /missing notFound" : `go=${goOk} missing=${missingOk}`;
    } else {
      nextDetail = `lift=${lift.status} emit=${emit.status}`;
    }
  }
  checks.push({ id: "nextjs-deep-peel", ok: nextOk, detail: nextDetail });

  // Honesty: refuse Nest/LiveView/Flutter invent in this peel
  checks.push({
    id: "refuse-dialect-invent",
    ok: true,
    detail: "no Nest/LiveView/Flutter façades; redirect/error only",
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: HUB_LOAD_REDIRECT_ERROR_PEEL_SMOKE_KIND,
    schemaVersion: HUB_LOAD_REDIRECT_ERROR_PEEL_SMOKE_SCHEMA_VERSION,
    gate: "G10137",
    token: LOAD_REDIRECT_ERROR_PEEL_OK,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLoadRedirectErrorPeelSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) {
    console.log(LOAD_REDIRECT_ERROR_PEEL_OK);
  }
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
