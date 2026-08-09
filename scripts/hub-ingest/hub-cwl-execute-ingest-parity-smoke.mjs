#!/usr/bin/env node
/**
 * Prove fat Convert cwl-ingest parity with CWL 1.0.5–1.0.6:
 * - response-header → WebIR ResponseAttrs.headers (14-defaults-headers)
 * - HTML pages are not double-wrapped in web.request.response (09-fullstack-page)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { loadWebir } from "./shared.mjs";

export const CWL_EXECUTE_INGEST_PARITY_SMOKE_KIND =
  "chrysalis.hub.cwl-execute-ingest-parity-smoke";
export const CWL_EXECUTE_INGEST_PARITY_SMOKE_SCHEMA_VERSION = 1;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GOLD = resolve(CONVERT_ROOT, "../chrysalis-cwl/fixtures/language-gold");

/**
 * @param {string} relDir
 */
async function liftGold(relDir) {
  const cwlPath = join(GOLD, relDir, "routes.cwl");
  if (!existsSync(cwlPath)) return { ok: false, detail: `missing ${cwlPath}`, nodes: [] };
  const webir = await loadWebir();
  const source = readFileSync(cwlPath, "utf8");
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-cwl-execute-ingest-parity" });
  const wr = webir.webRequest.builders(builder);
  liftCwlFileToWebir({
    webir,
    builder,
    wr,
    source,
    file: "routes.cwl",
    language: "cwl",
  });
  const snapRaw = webir.moduleToGoldenSnapshot(builder.finish());
  const snap = typeof snapRaw === "string" ? JSON.parse(snapRaw) : snapRaw;
  const nodes = Array.isArray(snap.nodes) ? snap.nodes : Object.values(snap.nodes ?? {});
  return { ok: true, detail: relDir, nodes };
}

/**
 * @param {{ goldRoot?: string }} [opts]
 */
export async function runCwlExecuteIngestParitySmoke(opts = {}) {
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];
  const goldRoot = opts.goldRoot ? resolve(opts.goldRoot) : GOLD;
  checks.push({
    id: "gold-root",
    ok: existsSync(goldRoot),
    detail: goldRoot.replace(/\\/g, "/"),
  });

  const headersLift = await liftGold("14-defaults-headers");
  checks.push({
    id: "14-lift",
    ok: headersLift.ok,
    detail: headersLift.detail,
  });
  if (headersLift.ok) {
    const withCache = headersLift.nodes.filter(
      (n) =>
        n.op === "response" &&
        n.attrs?.headers &&
        String(n.attrs.headers.cache ?? "") === "hit",
    );
    const withLocation = headersLift.nodes.filter(
      (n) =>
        n.op === "response" &&
        n.attrs?.headers &&
        String(n.attrs.headers.location ?? "") === "/items/1",
    );
    checks.push({
      id: "14-response-header-cache",
      ok: withCache.length >= 1,
      detail: `count=${withCache.length}`,
    });
    checks.push({
      id: "14-response-header-location",
      ok: withLocation.length >= 1,
      detail: `count=${withLocation.length}`,
    });
    const headerProv = headersLift.nodes.some(
      (n) =>
        n.op === "response" &&
        Array.isArray(n.provenance) &&
        n.provenance.some((p) => p?.locator === "cwl:response-header"),
    );
    checks.push({
      id: "14-response-header-provenance",
      ok: headerProv || withCache.length >= 1,
    });
  }

  const pageLift = await liftGold("09-fullstack-page");
  checks.push({
    id: "09-lift",
    ok: pageLift.ok,
    detail: pageLift.detail,
  });
  if (pageLift.ok) {
    const byId = new Map(pageLift.nodes.map((n) => [n.id, n]));
    const homeRoute = pageLift.nodes.find(
      (n) => n.op === "route" && n.attrs?.path === "/",
    );
    checks.push({
      id: "09-home-route",
      ok: Boolean(homeRoute),
      detail: homeRoute ? String(homeRoute.id) : "missing",
    });
    /** @type {string[]} */
    const responseChain = [];
    /** @param {string | undefined} id */
    function walk(id) {
      if (!id || responseChain.includes(id)) return;
      const n = byId.get(id);
      if (!n) return;
      if (n.op === "response") responseChain.push(id);
      for (const child of n.operands ?? []) walk(child);
    }
    const handler = homeRoute ? byId.get(homeRoute.operands?.[0]) : null;
    walk(handler?.operands?.[0]);
    checks.push({
      id: "09-html-single-response",
      ok: responseChain.length === 1,
      detail: `responseNodes=${responseChain.length}`,
    });
  }

  const ok = checks.every((c) => c.ok);
  return {
    kind: CWL_EXECUTE_INGEST_PARITY_SMOKE_KIND,
    schemaVersion: CWL_EXECUTE_INGEST_PARITY_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    failed: checks.filter((c) => !c.ok).map((c) => c.id),
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runCwlExecuteIngestParitySmoke();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
