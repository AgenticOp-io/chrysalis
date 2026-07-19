#!/usr/bin/env node
/**
 * Preserve Module_Manager ArcGIS as a vendor island (DESIGN D6441).
 *
 * Builds the same `@arcgis/core` imports the original app uses, with
 * **Module_Manager's Vite** (not Esri CDN ESM / AMD, not a custom esbuild dialect).
 *
 * Output (gitignored):
 *   fixtures/hub-wisp-management/wisp-cwl-arcgis.bundle.js
 *   fixtures/hub-wisp-management/wisp-cwl-arcgis.bundle.css  (when Vite emits CSS)
 *
 * Run: pnpm run hub:wisp-cwl-arcgis-bundle
 * Env: CHRYSALIS_WISP_ROOT / WISP_MODULE_DIR
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "scripts/lib/wisp-cwl-arcgis-entry.mjs");
const OUT_DIR = join(ROOT, "fixtures/hub-wisp-management");
const OUT_JS = join(OUT_DIR, "wisp-cwl-arcgis.bundle.js");
const OUT_CSS = join(OUT_DIR, "wisp-cwl-arcgis.bundle.css");

const WISP_CANDIDATES = [
  process.env.CHRYSALIS_WISP_ROOT,
  process.env.WISP_MODULE_DIR,
  "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  "C:/Users/david/Downloads/WISPTools/Module_Manager",
].filter(Boolean);

function resolveWispRoot() {
  for (const c of WISP_CANDIDATES) {
    const root = resolve(String(c));
    if (existsSync(join(root, "node_modules/@arcgis/core/package.json"))) return root;
  }
  return null;
}

/**
 * @param {{ wispRoot?: string }} [opts]
 */
export async function buildWispCwlArcgisBundle(opts = {}) {
  const wispRoot = opts.wispRoot ? resolve(opts.wispRoot) : resolveWispRoot();
  if (!wispRoot) {
    throw new Error(
      "Cannot find Module_Manager with @arcgis/core. Set CHRYSALIS_WISP_ROOT and run pnpm/npm install there.",
    );
  }

  const require = createRequire(join(wispRoot, "package.json"));
  let vite;
  try {
    vite = require("vite");
  } catch {
    throw new Error(
      `vite not installed in ${wispRoot} (need Module_Manager node_modules — original toolchain)`,
    );
  }

  const arcgisPkg = JSON.parse(
    readFileSync(join(wispRoot, "node_modules/@arcgis/core/package.json"), "utf8"),
  );
  const arcgisVer = String(arcgisPkg.version || "4.34").split(".").slice(0, 2).join(".");
  const arcgisPkgDir = dirname(require.resolve("@arcgis/core/package.json"));

  mkdirSync(OUT_DIR, { recursive: true });

  await vite.build({
    configFile: false,
    root: wispRoot,
    // Match Module_Manager app builds: production NODE_ENV so calcite/`process.env`
    // branches dead-code; lib mode does not auto-inject this like SvelteKit.
    mode: "production",
    logLevel: "warn",
    define: {
      __WISP_ARCGIS_VERSION__: JSON.stringify(arcgisVer),
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.ESRI_INTERNAL": JSON.stringify(""),
      "process.env.ESRI_BUILD": JSON.stringify(""),
    },
    resolve: {
      alias: {
        "@arcgis/core": arcgisPkgDir,
      },
    },
    build: {
      // Single-file island (no hashed sibling chunks) — same @arcgis/core graph as the app.
      lib: {
        entry: ENTRY,
        formats: ["es"],
        fileName: () => "wisp-cwl-arcgis.bundle",
      },
      outDir: OUT_DIR,
      emptyOutDir: false,
      cssCodeSplit: false,
      sourcemap: false,
      target: "es2020",
      minify: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          entryFileNames: "wisp-cwl-arcgis.bundle.js",
          assetFileNames: "wisp-cwl-arcgis.bundle.[ext]",
          // Belt-and-suspenders for any remaining `process.env.*` patterns Calcite leaves.
          banner:
            'var process=typeof globalThis!=="undefined"&&globalThis.process||{env:{NODE_ENV:"production"}};',
        },
      },
    },
  });

  // Remove any leftover hashed Vite siblings from prior builds.
  const { readdirSync, unlinkSync } = await import("node:fs");
  for (const name of readdirSync(OUT_DIR)) {
    if (/^wisp-cwl-arcgis-entry-.*\.js$/.test(name)) {
      unlinkSync(join(OUT_DIR, name));
    }
  }

  if (!existsSync(OUT_JS)) {
    throw new Error(`Vite did not write ${OUT_JS}`);
  }

  const js = readFileSync(OUT_JS, "utf8");
  if (js.length < 50_000) {
    throw new Error(
      `ArcGIS vendor bundle too small (${js.length} bytes) — likely a stub re-export; refuse deploy.`,
    );
  }
  if (/^\s*import\s+["'][^"']+\.css["']/m.test(js) || /^\s*import\s+["']\.\//m.test(js)) {
    throw new Error(
      "ArcGIS vendor bundle still has external ESM imports (CSS or relative chunks) — refuse.",
    );
  }
  // Lib-mode Vite does not always emit a banner; `define` must eliminate Node `process.env`.
  if (/\bprocess\.env\b/.test(js)) {
    throw new Error(
      "ArcGIS vendor bundle still references process.env — define NODE_ENV for browser (D6441).",
    );
  }

  return {
    ok: true,
    out: OUT_JS,
    css: existsSync(OUT_CSS) ? OUT_CSS : null,
    bytes: statSync(OUT_JS).size,
    cssBytes: existsSync(OUT_CSS) ? statSync(OUT_CSS).size : 0,
    wispRoot,
    toolchain: "vite",
    arcgisVer,
    note: "Preserved @arcgis/core via Module_Manager Vite (D6441) — not CDN rewrite",
  };
}

async function main() {
  try {
    const result = await buildWispCwlArcgisBundle();
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].includes("build-wisp-cwl-arcgis-bundle")) {
  main();
}
