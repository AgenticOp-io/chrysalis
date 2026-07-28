/**
 * Shared helpers for multi-language site inventory (Step 1).
 * @see docs/UNIVERSAL-CONVERSION-METHOD.md §2
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

export const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "build",
  ".svelte-kit",
  "dist",
  ".next",
  ".nuxt",
  ".angular",
  ".vercel",
  "coverage",
  "__pycache__",
  "vendor",
  "target",
  "bin",
  "obj",
  ".chrysalis-cobc",
]);

export const CODE_EXT = new Set([
  ".svelte",
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  ".vue",
  ".php",
  ".blade.php",
  ".html",
  ".css",
  ".scss",
  ".cshtml",
  ".razor",
  ".erb",
  ".py",
  ".java",
  ".kt",
  ".go",
  ".rb",
  ".cs",
  ".cbl",
  ".cob",
  ".cpy",
  ".bms",
]);

export function uniq(arr) {
  return [...new Set(arr.filter(Boolean))].sort();
}

export function walk(dir, files = [], exts = CODE_EXT) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, files, exts);
    else {
      const lower = name.toLowerCase();
      if (lower.endsWith(".blade.php") || exts.has(extname(lower))) files.push(p);
    }
  }
  return files;
}

export function relPath(root, file) {
  return relative(root, file).replace(/\\/g, "/");
}

export function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export function emptyBuckets() {
  return {
    routes: [],
    gates: [],
    gateKinds: {},
    components: [],
    nests: [],
    slots: [],
    apis: [],
    vendorIslands: [],
    deadControls: [],
    events: [],
  };
}

/**
 * Normalize language-specific gate names into a shared gate record.
 * @param {string} id
 * @param {string} kind overlay|dialog|drawer|tab|busy|other
 * @param {string} source file path or pattern
 */
export function gate(id, kind = "overlay", source = "") {
  return { id, kind, source };
}

export function pushGate(buckets, id, kind, source) {
  if (!id) return;
  buckets.gates.push(id);
  if (!buckets.gateKinds[id]) buckets.gateKinds[id] = { kind, sources: [] };
  if (source && !buckets.gateKinds[id].sources.includes(source)) {
    buckets.gateKinds[id].sources.push(source);
  }
}

/**
 * Live CWL surface inventory — language-neutral (data-cwl-* attrs).
 * @param {string} baseUrl
 * @param {string[]} pages
 */
export async function inventoryLivePages(baseUrl, pages) {
  const live = [];
  const base = baseUrl.replace(/\/$/, "");
  for (const path of pages) {
    const url = base + (path.startsWith("/") ? path : `/${path}`);
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      const h = await r.text();
      const keys = uniq([...h.matchAll(/data-cwl-shell-key="([^"]+)"/g)].map((m) => m[1]));
      const lifts = uniq([...h.matchAll(/data-cwl-lifted-component="([^"]+)"/g)].map((m) => m[1]));
      const toggles = uniq(
        [...h.matchAll(/data-cwl-toggle="([^"]+:true)"/g)].map((m) => m[1].split(":")[0]),
      );
      live.push({
        path,
        status: r.status,
        bytes: h.length,
        lifts,
        keys,
        toggles,
        orphanToggles: toggles.filter((t) => !keys.includes(t)),
        slotSiblings: (h.match(/\sslot="(content|footer)"/g) || []).length,
        nestedShells: (h.match(/cwl-self-gated-shell/g) || []).length,
      });
    } catch (e) {
      live.push({ path, error: String(e && e.message ? e.message : e) });
    }
  }
  return { baseUrl: base, pages: live };
}

/** Derive live page paths from origin routes when possible. */
export function routesToLivePaths(routes, fallbackPages = []) {
  const paths = [];
  for (const r of routes || []) {
    let p = r
      .replace(/^src\/routes/, "")
      .replace(/\/\+page\.(svelte|tsx|jsx|vue)$/, "")
      .replace(/^app/, "")
      .replace(/\/page\.(tsx|jsx|js)$/, "")
      .replace(/^src\/views/, "")
      .replace(/^src\/pages/, "")
      .replace(/\.vue$/, "")
      .replace(/\.component\.html$/, "")
      .replace(/\\/g, "/");
    if (!p.startsWith("/")) p = `/${p}`;
    p = p.replace(/\/index$/, "") || "/";
    if (p.includes("[")) continue; // dynamic — skip for default live list
    paths.push(p);
  }
  const out = uniq(paths);
  return out.length > 0 ? out : fallbackPages;
}

export const WISP_POC_LIVE_PAGES = [
  "/",
  "/login",
  "/dashboard",
  "/modules/plan",
  "/modules/deploy",
  "/modules/coverage-map",
  "/modules/inventory",
  "/modules/customers",
  "/modules/work-orders",
  "/modules/help-desk",
  "/modules/monitoring",
  "/modules/hss-management",
  "/modules/pci-resolution",
  "/modules/billing",
  "/modules/voice-telephony",
  "/modules/sites",
  "/modules/cbrs-management",
  "/modules/user-management",
];

export function summarizeInventory(origin, live) {
  const gates = origin?.gates || origin?.showGates || [];
  return {
    framework: origin?.framework ?? "unknown",
    originRoutes: origin?.routes?.length ?? 0,
    originGates: gates.length,
    originShowGates: origin?.showGates?.length ?? gates.length,
    originIsOpenGates: origin?.isOpenGates?.length ?? 0,
    originSlots: origin?.slots?.length ?? origin?.slotMentions?.length ?? 0,
    livePagesOk: live?.pages?.filter((p) => p.status === 200).length ?? 0,
    liveOrphanTogglePages:
      live?.pages?.filter((p) => (p.orphanToggles || []).length > 0).map((p) => p.path) ?? [],
    livePagesWithSlots:
      live?.pages
        ?.filter((p) => (p.slotSiblings || 0) > 0)
        .map((p) => ({ path: p.path, slots: p.slotSiblings })) ?? [],
  };
}
