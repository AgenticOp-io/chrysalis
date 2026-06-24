#!/usr/bin/env node
/** CWL outbound emit smoke (G7602) — CWL hub → all chartered native/TS targets. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTranslatorComposerCharter } from "./hub-cwl-translator-composer-charter.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_CWL_OUTBOUND_EMIT_SMOKE_KIND = "chrysalis.cwl.cwl-outbound-emit-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

export function runCwlOutboundEmitDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  return { ok: true, docOk: true };
}

/**
 * @param {object} opts
 */
export async function runCwlOutboundEmitGate(opts = {}) {
  const doc = runCwlOutboundEmitDocGate();
  const loaded = loadTranslatorComposerCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const charter = loaded.charter;
  const fixtureRel = charter.cwlSourceFixture ?? "fixtures/hub-gold-cwl";
  const projectDir = join(scriptRoot, fixtureRel);
  if (!existsSync(projectDir)) {
    return { ok: false, doc, skip: "missing-cwl-source-fixture", generatedAt: new Date().toISOString() };
  }

  const lift = spawnSync(process.execPath, [liftScript, projectDir, "--language", "cwl"], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  if (lift.status !== 0) {
    return { ok: false, doc, skip: "cwl-source-lift-failed", generatedAt: new Date().toISOString() };
  }

  const maxHoles = opts.maxHoleCount ?? 0;
  /** @type {Record<string, object>} */
  const emits = {};
  let ok = doc.ok === true;
  for (const target of charter.cwlOutboundTargets ?? []) {
    const emitScript = join(scriptRoot, "scripts/hub-ingest", target.emit);
    const args = [emitScript, projectDir, "--origin", "cwl"];
    if (target.emitTarget) args.push("--target", target.emitTarget);
    const emitR = spawnSync(process.execPath, args, { cwd: scriptRoot, encoding: "utf8" });
    let report = {};
    try {
      report = JSON.parse((emitR.stdout ?? "").trim().split("\n").pop() ?? "{}");
    } catch {
      report = {};
    }
    const block = {
      ok: emitR.status === 0 && (report.routeCount ?? report.handlerCount ?? 0) > 0 && (report.holeCount ?? 0) <= maxHoles,
      routeCount: report.routeCount ?? report.handlerCount ?? 0,
      holeCount: report.holeCount ?? null,
      emit: target.emit,
    };
    emits[target.id] = block;
    if (!block.ok) ok = false;
  }

  return {
    kind: CWL_CWL_OUTBOUND_EMIT_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    fixture: fixtureRel,
    emits,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlOutboundEmitSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-outbound-emit");
  const t0 = progress.start("CWL outbound emit (G7602)");
  const gate = await runCwlOutboundEmitGate(opts);
  progress.end("CWL outbound emit (G7602)", gate.ok === true, t0);
  return { kind: CWL_CWL_OUTBOUND_EMIT_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlOutboundEmitSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-cwl-outbound-emit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
