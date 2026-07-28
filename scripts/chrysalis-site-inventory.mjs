#!/usr/bin/env node
/**
 * Chrysalis Step-1 site inventory — multi-language origin + optional live CWL census.
 *
 * Usage:
 *   node scripts/chrysalis-site-inventory.mjs --origin path/to/app [--live http://host:port]
 *   node scripts/chrysalis-site-inventory.mjs --origin ... --framework sveltekit|vite-vue|next-app|angular|php-blade|php|cobol
 *   node scripts/chrysalis-site-inventory.mjs --origin ... --live ... --live-pages /,/login,/dashboard
 *   node scripts/chrysalis-site-inventory.mjs --origin ... --wisp-poc-pages   # WISP Module_Manager page list
 *   node scripts/chrysalis-site-inventory.mjs --list-adapters
 *
 * Kind: chrysalis.site-inventory.v1 (schemaVersion 2 = language adapters)
 * Method: docs/UNIVERSAL-CONVERSION-METHOD.md §2
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inventoryOriginRoot,
  inventoryLive,
  listAdapterNames,
  summarizeInventory,
  WISP_POC_LIVE_PAGES,
} from "./lib/site-inventory/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = resolve(ROOT, "reports/chrysalis/site-inventory.json");

function parseArgs(argv) {
  let origin = "";
  let live = "";
  let out = DEFAULT_OUT;
  let framework = "";
  let livePages = null;
  let livePagesFile = "";
  let wispPocPages = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (a === "--live" && argv[i + 1]) live = argv[++i];
    else if (a === "--out" && argv[i + 1]) out = argv[++i];
    else if (a === "--framework" && argv[i + 1]) framework = argv[++i];
    else if (a === "--live-pages" && argv[i + 1]) {
      livePages = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--live-pages-file" && argv[i + 1]) livePagesFile = argv[++i];
    else if (a === "--wisp-poc-pages") wispPocPages = true;
    else if (a === "--list-adapters") {
      console.log(JSON.stringify({ adapters: listAdapterNames() }, null, 2));
      process.exit(0);
    }
  }
  return {
    origin,
    live,
    out: resolve(out),
    framework: framework || undefined,
    livePages,
    livePagesFile,
    wispPocPages,
  };
}

function loadLivePagesFile(path) {
  if (!path) return null;
  const raw = readFileSync(resolve(path), "utf8");
  if (path.endsWith(".json")) {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : j.pages || j.paths || [];
  }
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.origin && !opts.live) {
    console.error(`Usage: node scripts/chrysalis-site-inventory.mjs --origin <path> [--live <url>] [--framework <name>]
Adapters: ${listAdapterNames().join(", ")}`);
    process.exit(2);
  }

  let originInv = null;
  let adapterName = null;
  if (opts.origin) {
    const root = resolve(opts.origin);
    if (!existsSync(root)) {
      console.error(`Origin not found: ${root}`);
      process.exit(2);
    }
    const { adapter, origin } = inventoryOriginRoot(root, { framework: opts.framework });
    adapterName = adapter;
    originInv = origin;
  }

  let pages = opts.livePages || loadLivePagesFile(opts.livePagesFile);
  if (opts.wispPocPages) pages = WISP_POC_LIVE_PAGES;
  const liveInv = opts.live
    ? await inventoryLive(opts.live, {
        pages: pages || undefined,
        originRoutes: originInv?.routes,
        useWispPocPages: opts.wispPocPages || (!pages && adapterName === "sveltekit"),
      })
    : null;

  const doc = {
    kind: "chrysalis.site-inventory.v1",
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    method: "docs/UNIVERSAL-CONVERSION-METHOD.md §2",
    adapter: adapterName,
    adaptersAvailable: listAdapterNames(),
    origin: originInv,
    live: liveInv,
    summary: summarizeInventory(originInv, liveInv),
    next: [
      "Diff origin gates vs live shell keys → orphan / missing shells (chrysalis-site-inventory-diff)",
      "Build gap catalog P0→Pn (chrysalis-gap-catalog)",
      "Structural lift via language markup adapter (Svelte/Vue/Next/Angular/…)",
      "Wire nests with selected-entity hydrate — no *[0] fallbacks",
      "Prove vs origin (D6448-ST); deploy chimera + production host",
    ],
  };

  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: opts.out,
        adapter: adapterName,
        summary: doc.summary,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
