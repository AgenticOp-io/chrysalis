#!/usr/bin/env node
/**
 * Stage CWL static export into WISP Module_Manager/build/client for Firebase Hosting.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

  const assetResult = copyWispCwlStaticAssets(clientDir, { wispRoot });
  const wrappedPages = wrapExportedHtmlDocuments(clientDir);
  writeStaticDetailRouter404(clientDir);

  const ok = existsSync(join(clientDir, "index.html"));
  return {
    ...base,
    ok,
    staged: ok,
    assetsCopied: assetResult.copied,
    arcgisBundle: assetResult.arcgisBundle,
    wrappedPages,
  };
}

/**
 * Copy the CWL shell assets (CSS/JS/logo/config) that the chimera gateway
 * serves at runtime into the static client dir, so Firebase Hosting serves
 * the same styled shell as the GCE deployment.
 * @param {string} clientDir
 * @param {{ wispRoot?: string }} [opts]
 */
export function copyWispCwlStaticAssets(clientDir, opts = {}) {
  const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
  const bundlePath = join(fixtureDir, "wisp-cwl-arcgis.bundle.js");
  /** @type {{ ok?: boolean; bytes?: number; skip?: string; status?: number | null }} */
  let arcgisBundle = { ok: true, skip: "exists" };
  if (!existsSync(bundlePath) || process.env.CHRYSALIS_WISP_ARCGIS_REBUILD === "1") {
    const env = { ...process.env };
    if (opts.wispRoot) env.CHRYSALIS_WISP_ROOT = String(opts.wispRoot);
    const r = spawnSync(
      process.execPath,
      [join(scriptRoot, "scripts/build-wisp-cwl-arcgis-bundle.mjs")],
      { cwd: scriptRoot, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (r.status !== 0 || !existsSync(bundlePath)) {
      arcgisBundle = {
        ok: false,
        status: r.status,
        skip: (r.stderr || r.stdout || "arcgis-bundle-build-failed").trim().slice(0, 500),
      };
      console.warn("[wisp-cwl-stage] ArcGIS bundle build skipped:", arcgisBundle.skip);
    } else {
      try {
        arcgisBundle = JSON.parse((r.stdout || "").trim());
      } catch {
        arcgisBundle = { ok: true };
      }
    }
  }

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
  // Oracle API goldens for map/client fallback when live HSS is unreachable (D6442).
  const apiGoldens = join(fixtureDir, "wisp-api-goldens");
  if (existsSync(apiGoldens)) {
    cpSync(apiGoldens, join(clientDir, "assets/wisp-api-goldens"), { recursive: true });
    copied += 1;
  }
  // Prefer Esri key from the origin project's env (translate, do not invent OSM — D6442/D6443).
  const apiKey =
    (process.env.PUBLIC_ARCGIS_API_KEY || process.env.CHRYSALIS_ARCGIS_API_KEY || "").trim();
  if (apiKey && !/^AIza/i.test(apiKey)) {
    const cfgPath = join(clientDir, "assets/wisp-arcgis-config.json");
    mkdirSync(dirname(cfgPath), { recursive: true });
    writeFileSync(
      cfgPath,
      `${JSON.stringify(
        {
          apiKey,
          note: "Staged from PUBLIC_ARCGIS_API_KEY / CHRYSALIS_ARCGIS_API_KEY at deploy time (origin Module_Manager).",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    copied += 1;
  }
  return { copied, arcgisBundle };
}

/**
 * The static export may write bare fragments or runtime-wrapped DOCTYPE shells
 * (original-css only via @chrysalis/runtime-cwl uiAssets). Always restage with
 * the chimera document shell so Firebase gets overlay CSS + client scripts.
 * @param {string} clientDir
 */
export function wrapExportedHtmlDocuments(clientDir) {
  let wrapped = 0;
  /** @param {string} html */
  const extractBodyInner = (html) => {
    const m = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    return m ? m[1].trim() : html.trim();
  };
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const raw = readFileSync(abs, "utf8");
      const trimmed = raw.trimStart();
      const body =
        trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")
          ? extractBodyInner(raw)
          : raw;
      const rel = relative(clientDir, abs).replace(/\\/g, "/");
      const pathname = rel === "index.html" ? "/" : `/${rel.replace(/\/index\.html$/, "")}`;
      const isCoverageMapPage =
        pathname.includes("coverage-map") ||
        pathname.includes("pci-resolution") ||
        body.includes('data-wisp-page="coverage-map"');
      // D6443: always restage coverage so modules overlay cannot stick from prior wraps.
      if (
        !isCoverageMapPage &&
        body.includes("data-wisp-page") &&
        raw.includes("/assets/wisp-cwl-client.js") &&
        raw.includes("/assets/wisp-cwl-")
      ) {
        continue;
      }
      const doc = wrapWispCwlHtmlDocument(body, "WISP Management", pathname);
      writeFileSync(abs, doc.endsWith("\n") ? doc : `${doc}\n`, "utf8");
      wrapped += 1;
    }
  };
  walk(clientDir);
  return wrapped;
}

/**
 * Firebase Hosting has no dynamic routes: /modules/inventory/{id} 404s even
 * though the export ships detail templates (e.g. modules/inventory/preview).
 * Serve a 404.html that client-side routes known detail URLs to their
 * template page, preserving the requested path so the client hydrates by id.
 * @param {string} clientDir
 */
export function writeStaticDetailRouter404(clientDir) {
  const rules = [
    { re: "^/modules/inventory/bundles/[^/]+$", tpl: "/modules/inventory/preview" },
    { re: "^/modules/inventory/[^/]+(?:/edit)?$", tpl: "/modules/inventory/preview" },
    { re: "^/modules/work-orders/[^/]+(?:/edit)?$", tpl: "/modules/work-orders/preview" },
    { re: "^/modules/customers/[^/]+(?:/edit)?$", tpl: "/modules/customers" },
    { re: "^/modules/sites/[^/]+(?:/edit)?$", tpl: "/modules/sites" },
    { re: "^/modules/help-desk/[^/]+(?:/edit)?$", tpl: "/modules/help-desk" },
    { re: "^/modules/hardware/[^/]+$", tpl: "/modules/inventory/preview" },
  ];
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WISP Management</title><script>
(function () {
  var rules = ${JSON.stringify(rules)};
  var path = location.pathname.replace(/\\/$/, "");
  for (var i = 0; i < rules.length; i++) {
    if (new RegExp(rules[i].re).test(path)) {
      try { sessionStorage.setItem("cwlDetailPath", path); } catch (_) {}
      location.replace(rules[i].tpl + "?cwl-detail=" + encodeURIComponent(path));
      return;
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.body.innerHTML =
      '<div style="font-family:system-ui;padding:4rem;text-align:center"><h1>Page not found</h1><p><a href="/dashboard">Back to dashboard</a></p></div>';
  });
})();
</script></head><body></body></html>\n`;
  writeFileSync(join(clientDir, "404.html"), html, "utf8");
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
