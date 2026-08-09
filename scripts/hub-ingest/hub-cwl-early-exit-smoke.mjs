#!/usr/bin/env node
/**
 * Prove fat Convert cwl-ingest RFC-0021 control lowering (CWL 1.0.8–1.0.9).
 * Fixtures: 19-early-exit (guards) + 23-nested-control (else / foreachBindings).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { loadWebir } from "./shared.mjs";

export const CWL_EARLY_EXIT_SMOKE_KIND = "chrysalis.hub.cwl-early-exit-smoke";
export const CWL_EARLY_EXIT_SMOKE_SCHEMA_VERSION = 2;

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
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-cwl-early-exit" });
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
export async function runCwlEarlyExitSmoke(opts = {}) {
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];
  const goldRoot = opts.goldRoot ? resolve(opts.goldRoot) : GOLD;
  checks.push({
    id: "gold-root",
    ok: existsSync(goldRoot),
    detail: goldRoot.replace(/\\/g, "/"),
  });

  const early = await liftGold("19-early-exit");
  checks.push({ id: "19-lift", ok: early.ok, detail: early.detail });
  if (early.ok) {
    const ifNodes = early.nodes.filter((n) => n.op === "if");
    const earlyGuardProv = early.nodes.filter(
      (n) =>
        Array.isArray(n.provenance) &&
        n.provenance.some(
          (p) => p?.locator === "cwl:early-guard" || p?.locator === "cwl:early-guards",
        ),
    );
    const haltCalls = early.nodes.filter(
      (n) =>
        n.op === "call" &&
        n.attrs?.callee === "__return" &&
        Array.isArray(n.provenance) &&
        n.provenance.some((p) => String(p?.locator || "").includes("early-exit")),
    );
    const ifWithElse = ifNodes.filter((n) => (n.operands?.length ?? 0) >= 3);
    checks.push({ id: "19-data-if-nodes", ok: ifNodes.length >= 1, detail: `count=${ifNodes.length}` });
    checks.push({
      id: "19-early-guard-provenance",
      ok: earlyGuardProv.length >= 1,
      detail: `count=${earlyGuardProv.length}`,
    });
    checks.push({ id: "19-early-exit-halt", ok: haltCalls.length >= 1, detail: `count=${haltCalls.length}` });
    checks.push({
      id: "19-if-else-branch",
      ok: ifWithElse.length >= 1,
      detail: `withElse=${ifWithElse.length}`,
    });
  }

  const nested = await liftGold("23-nested-control");
  checks.push({ id: "23-lift", ok: nested.ok, detail: nested.detail });
  if (nested.ok) {
    const foreachNodes = nested.nodes.filter((n) => n.op === "foreach");
    const foreachProv = nested.nodes.filter(
      (n) =>
        Array.isArray(n.provenance) &&
        n.provenance.some((p) => String(p?.locator || "").includes("foreach")),
    );
    checks.push({
      id: "23-foreach-nodes",
      ok: foreachNodes.length >= 1,
      detail: `count=${foreachNodes.length}`,
    });
    checks.push({
      id: "23-foreach-provenance",
      ok: foreachProv.length >= 1,
      detail: `count=${foreachProv.length}`,
    });
  }

  const ok = checks.every((c) => c.ok);
  return {
    kind: CWL_EARLY_EXIT_SMOKE_KIND,
    schemaVersion: CWL_EARLY_EXIT_SMOKE_SCHEMA_VERSION,
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
  const report = await runCwlEarlyExitSmoke();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
