#!/usr/bin/env node
/**
 * Stage CWL static export into WISP Module_Manager/build/client for Firebase Hosting.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispPipelineConfig } from "./wisp-cwl-pipeline.mjs";
import { WISP_CHIMERA_STATIC_ASSETS, wrapWispCwlHtmlDocument } from "./wisp-cwl-chimera-gateway.mjs";

export const WISP_CWL_FIREBASE_STATIC_STAGE_KIND = "chrysalis.wisp.firebase-static-stage";
export const WISP_CWL_FIREBASE_STATIC_STAGE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {Record<string, unknown>} [config] */
export function resolveCwlStaticExportDir(config = loadWispPipelineConfig()) {
  const rel =
    config.firebase?.cwlStaticExportDir ??
    join(config.fixtureDir ?? "fixtures/hub-wisp-management", "cwl-static-export");
  return join(scriptRoot, String(rel).replace(/\\/g, "/"));
}

/** @param {string} exportDir */
export function readCwlStaticExportManifest(exportDir) {
  const manifestPath = join(
    scriptRoot,
    "fixtures/hub-wisp-management/chrysalis.wisp-cwl-static-export.v1.json",
  );
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {string} [opts.exportDir]
 * @param {boolean} [opts.dryRun]
 */
export function stageWispCwlStaticExportClient(opts = {}) {
  const config = loadWispPipelineConfig();
  const exportDir = resolve(opts.exportDir ?? resolveCwlStaticExportDir(config));
  const wispRoot = resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      config.defaultWispRoot ??
      "C:/Users/david/Downloads/WISPTools/Module_Manager",
  );
  const clientDir = join(wispRoot, "build/client");
  const manifest = readCwlStaticExportManifest(exportDir);
  const pageCount = manifest?.pageCount ?? manifest?.exportedCount ?? 0;

  const base = {
    kind: WISP_CWL_FIREBASE_STATIC_STAGE_KIND,
    schemaVersion: WISP_CWL_FIREBASE_STATIC_STAGE_SCHEMA_VERSION,
    ok: false,
    exportDir,
    clientDir,
    pageCount,
    apiMode: config.firebase?.apiMode ?? config.deployTargets?.firebase?.apiMode ?? null,
  };

  if (!existsSync(exportDir)) {
    return { ...base, skip: "missing-cwl-static-export-dir" };
  }
  if (!existsSync(join(exportDir, "index.html"))) {
    return { ...base, skip: "missing-cwl-static-export-index" };
  }
  if (pageCount < 87) {
    return { ...base, skip: "cwl-static-export-manifest-incomplete", expectedPages: 87 };
  }

  if (opts.dryRun) {
    return {
      ...base,
      ok: true,
      dryRun: true,
      wouldCopyTo: clientDir,
    };
  }

  mkdirSync(join(wispRoot, "build"), { recursive: true });
  if (existsSync(clientDir)) {
    rmSync(clientDir, { recursive: true, force: true });
  }
  cpSync(exportDir, clientDir, { recursive: true });

  const assetsCopied = copyWispCwlStaticAssets(clientDir);
  const wrappedPages = wrapExportedHtmlDocuments(clientDir);

  const ok = existsSync(join(clientDir, "index.html"));
  return { ...base, ok, staged: ok, assetsCopied, wrappedPages };
}

/**
 * Copy the CWL shell assets (CSS/JS/logo/config) that the chimera gateway
 * serves at runtime into the static client dir, so Firebase Hosting serves
 * the same styled shell as the GCE deployment.
 * @param {string} clientDir
 */
export function copyWispCwlStaticAssets(clientDir) {
  const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
  let copied = 0;
  for (const [urlPath, spec] of Object.entries(WISP_CHIMERA_STATIC_ASSETS)) {
    const src = join(fixtureDir, spec.file);
    if (!existsSync(src)) continue;
    const dest = join(clientDir, urlPath.replace(/^\//, ""));
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    copied += 1;
  }
  // Binary assets (fonts/images) referenced by the lifted original CSS.
  const originalAssets = join(fixtureDir, "original-assets");
  if (existsSync(originalAssets)) {
    cpSync(originalAssets, join(clientDir, "assets/original"), { recursive: true });
    copied += 1;
  }
  // Per-route lifted CSS bundles (see wisp-cwl-css-lift.mjs).
  const originalCss = join(fixtureDir, "original-css");
  if (existsSync(originalCss)) {
    cpSync(originalCss, join(clientDir, "assets/original-css"), { recursive: true });
    copied += 1;
  }
  return copied;
}

/**
 * The static export writes bare HTML fragments (the runtime normally wraps
 * them per-request). Wrap each page with the same document shell the chimera
 * gateway uses so styling matches the live GCE deployment.
 * @param {string} clientDir
 */
export function wrapExportedHtmlDocuments(clientDir) {
  let wrapped = 0;
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const body = readFileSync(abs, "utf8");
      if (body.trimStart().startsWith("<!DOCTYPE") || body.trimStart().startsWith("<html")) continue;
      const rel = relative(clientDir, abs).replace(/\\/g, "/");
      const pathname = rel === "index.html" ? "/" : `/${rel.replace(/\/index\.html$/, "")}`;
      const doc = wrapWispCwlHtmlDocument(body, "WISP Management", pathname);
      writeFileSync(abs, doc.endsWith("\n") ? doc : `${doc}\n`, "utf8");
      wrapped += 1;
    }
  };
  walk(clientDir);
  return wrapped;
}

async function main() {
  let dryRun = false;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--dry-run") dryRun = true;
  }
  const r = stageWispCwlStaticExportClient({ dryRun });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-firebase-static-stage")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
