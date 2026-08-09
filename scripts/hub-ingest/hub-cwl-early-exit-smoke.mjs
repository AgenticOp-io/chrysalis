#!/usr/bin/env node
/**
 * Prove fat Convert cwl-ingest RFC-0021 early-guard lowering (CWL 1.0.8).
 * Fixture: chrysalis-cwl language-gold 19-early-exit.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { loadWebir } from "./shared.mjs";

export const CWL_EARLY_EXIT_SMOKE_KIND = "chrysalis.hub.cwl-early-exit-smoke";
export const CWL_EARLY_EXIT_SMOKE_SCHEMA_VERSION = 1;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE = resolve(
  CONVERT_ROOT,
  "../chrysalis-cwl/fixtures/language-gold/19-early-exit/routes.cwl",
);

export async function runCwlEarlyExitSmoke(opts = {}) {
  const cwlPath = resolve(opts.fixturePath ?? FIXTURE);
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];
  checks.push({ id: "fixture-present", ok: existsSync(cwlPath), detail: cwlPath.replace(/\\/g, "/") });
  if (!existsSync(cwlPath)) {
    return { kind: CWL_EARLY_EXIT_SMOKE_KIND, schemaVersion: CWL_EARLY_EXIT_SMOKE_SCHEMA_VERSION, ok: false, checks, generatedAt: new Date().toISOString() };
  }
  const webir = await loadWebir();
  const source = readFileSync(cwlPath, "utf8");
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-cwl-early-exit" });
  const wr = webir.webRequest.builders(builder);
  liftCwlFileToWebir({ webir, builder, wr, source, file: "routes.cwl", language: "cwl" });
  const snapRaw = webir.moduleToGoldenSnapshot(builder.finish());
  const snap = typeof snapRaw === "string" ? JSON.parse(snapRaw) : snapRaw;
  const nodes = Array.isArray(snap.nodes) ? snap.nodes : Object.values(snap.nodes ?? {});
  const ifNodes = nodes.filter((n) => n.op === "if");
  const earlyGuardProv = nodes.filter(
    (n) => Array.isArray(n.provenance) && n.provenance.some((p) => p?.locator === "cwl:early-guard" || p?.locator === "cwl:early-guards"),
  );
  const haltCalls = nodes.filter(
    (n) => n.op === "call" && n.attrs?.callee === "__return" && Array.isArray(n.provenance) && n.provenance.some((p) => String(p?.locator || "").includes("early-exit")),
  );
  checks.push({ id: "data-if-nodes", ok: ifNodes.length >= 1, detail: `count=${ifNodes.length}` });
  checks.push({ id: "early-guard-provenance", ok: earlyGuardProv.length >= 1, detail: `count=${earlyGuardProv.length}` });
  checks.push({ id: "early-exit-halt", ok: haltCalls.length >= 1, detail: `count=${haltCalls.length}` });
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

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const report = await runCwlEarlyExitSmoke();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
