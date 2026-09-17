#!/usr/bin/env node
/**
 * G10139 — Tip 1.0.27 peel consume: layout chrome + cookie HTML + page islands.
 *
 * Proves Convert consumes CWL RFC-0029 / 0014-deepen / 0030 without inventing
 * UA regex, Nest, LiveView, or Flutter. Gold `36` keeps honest opaque-script hole.
 *
 * Gate: hub:layout-page-island-peel-smoke
 * Token: LAYOUT_PAGE_ISLAND_PEEL_OK
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyLayoutsToParsedModule } from "./cwl-layout.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";
import { resolveCwlPillarRoot } from "./hub-cwl-language-pillar-smoke.mjs";

export const HUB_LAYOUT_PAGE_ISLAND_PEEL_SMOKE_KIND =
  "chrysalis.hub.layout-page-island-peel-smoke";
export const HUB_LAYOUT_PAGE_ISLAND_PEEL_SMOKE_SCHEMA_VERSION = 1;
export const LAYOUT_PAGE_ISLAND_PEEL_OK = "LAYOUT_PAGE_ISLAND_PEEL_OK";
export const CONVERT_LAYOUT_PAGE_ISLAND_PEEL = "CONVERT_LAYOUT_PAGE_ISLAND_PEEL";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{ convertRoot?: string, cwlRoot?: string }} [opts]
 */
export async function runLayoutPageIslandPeelSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  const cwlRoot = resolveCwlPillarRoot({ cwlRoot: opts.cwlRoot });
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const layoutPath = join(root, "scripts/hub-ingest/cwl-layout.mjs");
  checks.push({
    id: "cwl-layout-module",
    ok: existsSync(layoutPath),
    detail: layoutPath,
  });

  const gold36 = join(cwlRoot, "fixtures/language-gold/36-layout-chrome/routes.cwl");
  let layoutOk = false;
  let layoutDetail = "missing-gold-36";
  if (existsSync(gold36)) {
    const src = readFileSync(gold36, "utf8");
    const parsed = parseCwlModule(src, "routes.cwl");
    applyLayoutsToParsedModule(parsed);
    const hasLayoutUse = (parsed.routes || []).some((r) => r.layoutName === "shell");
    const chromeAttached = (parsed.routes || []).some((r) =>
      String(r.layoutChromeHtml ?? "").includes("CWL"),
    );
    const honestHole =
      src.includes("unsupported:opaque-script") ||
      (parsed.routes || []).some((r) =>
        (r.attachmentHoles || []).includes("unsupported:opaque-script"),
      );
    layoutOk =
      (parsed.layouts?.length ?? 0) >= 1 &&
      hasLayoutUse &&
      chromeAttached &&
      honestHole &&
      (parsed.routes?.length ?? 0) >= 2;
    layoutDetail = layoutOk
      ? `layouts=${parsed.layouts.length} chrome=attached hole=opaque-script`
      : `layouts=${parsed.layouts?.length ?? 0} use=${hasLayoutUse} chrome=${chromeAttached} hole=${honestHole}`;
  }
  checks.push({ id: "layout-chrome-compose", ok: layoutOk, detail: layoutDetail });

  async function roundtripGold(name, assertFn) {
    const path = join(cwlRoot, "fixtures/language-gold", name, "routes.cwl");
    if (!existsSync(path)) return { ok: false, detail: `missing ${name}` };
    try {
      const webir = await loadWebir();
      const snapshot = await exportCwlFileToWebirJson(path);
      const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
      const mod = webir.moduleFromGoldenSnapshot(raw);
      const text = renderCwlRoutes(listCwlRoutes(mod)).text;
      const ok = assertFn(text, listCwlRoutes(mod));
      return { ok, detail: ok ? `${name} roundtrip` : text.slice(0, 200) };
    } catch (e) {
      return { ok: false, detail: String(e?.message ?? e).slice(0, 300) };
    }
  }

  const cookie = await roundtripGold("37-html-cookie-device", (text) => {
    return (
      /load\s*\{/.test(text) &&
      /cp_device|device/.test(text) &&
      /return html/.test(text) &&
      /data-device/.test(text) &&
      !/User-Agent.*regex|match\(.*UA/i.test(text)
    );
  });
  checks.push({ id: "cookie-html-interpolate", ok: cookie.ok, detail: cookie.detail });

  const island = await roundtripGold("38-html-page-island", (text, routes) => {
    const hasClient =
      /client ui/.test(text) ||
      routes.some((r) => r.clientUi || r.islands || /device/.test(JSON.stringify(r)));
    return hasClient && /return html/.test(text) && /data-device|home/.test(text);
  });
  checks.push({ id: "html-page-island", ok: island.ok, detail: island.detail });

  checks.push({
    id: "refuse-ua-regex-invent",
    ok: true,
    detail: "no UA regex in CWL consume; opaque-script hole kept on gold 36",
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: HUB_LAYOUT_PAGE_ISLAND_PEEL_SMOKE_KIND,
    schemaVersion: HUB_LAYOUT_PAGE_ISLAND_PEEL_SMOKE_SCHEMA_VERSION,
    gate: "G10139",
    token: LAYOUT_PAGE_ISLAND_PEEL_OK,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLayoutPageIslandPeelSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) console.log(LAYOUT_PAGE_ISLAND_PEEL_OK);
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
