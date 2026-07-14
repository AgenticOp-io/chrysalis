#!/usr/bin/env node
/**
 * G9971 — UT Wave B composer charter audit (edges + hole budgets + weak list).
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTranslatorComposerCharter } from "./hub-cwl-translator-composer-charter.mjs";
import { composerCrossEdgeJobs } from "./hub-cwl-translator-composer-cross-edge.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(
  root,
  "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-charter-audit.v1.json",
);
const refusePath = join(
  root,
  "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-honest-refuse.v1.json",
);

export const UT_WAVE_B_CHARTER_AUDIT_KIND = "chrysalis.ut.wave-b-charter-audit-smoke";

function wptpEmitNextjsAvailable() {
  const sibling = resolve(process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(root, "..", "wptp-emit-nextjs"));
  return existsSync(join(sibling, "package.json"));
}

export function runUtWaveBCharterAuditGate() {
  const loaded = loadTranslatorComposerCharter();
  if (!loaded.ok) {
    return { kind: UT_WAVE_B_CHARTER_AUDIT_KIND, schemaVersion: 1, ok: false, charter: loaded };
  }
  const charter = loaded.charter;
  const jobs = composerCrossEdgeJobs(charter);
  const maxHoles = charter.maxCrossEdgeHoleCount ?? 0;
  const edges = jobs.map((j) => ({
    from: j.from,
    to: j.to,
    hasEmit: Boolean(j.emit),
    maxHoleCount: j.maxHoleCount ?? maxHoles,
    fixtureOverride: Boolean(charter.crossEdgeFixtureOverrides?.[j.from]),
  }));

  /** @type {{ id: string, severity: string, detail: string }[]} */
  const weakEdges = [];
  for (const e of edges) {
    if (!e.hasEmit) {
      weakEdges.push({
        id: `${e.from}->${e.to}`,
        severity: "missing-emit",
        detail: "No outbound emit mapping for target in cwlOutboundTargets",
      });
    }
  }

  const outboundIds = (charter.cwlOutboundTargets ?? []).map((t) => t.id);
  if (!outboundIds.includes("nextjs") && !wptpEmitNextjsAvailable()) {
    weakEdges.push({
      id: "cwl->nextjs",
      severity: "honest-refuse-prereq",
      detail: "Next.js outbound not chartered; auth-effects-nextjs skips without WPTP sibling",
    });
  }

  const refuseOk =
    existsSync(refusePath) &&
    (() => {
      try {
        const r = JSON.parse(readFileSync(refusePath, "utf8"));
        return r.kind === "chrysalis.ut.wave-b-honest-refuse" && Array.isArray(r.refuses) && r.refuses.length >= 1;
      } catch {
        return false;
      }
    })();

  const report = {
    kind: "chrysalis.ut.wave-b-charter-audit",
    schemaVersion: 1,
    gate: "G9971",
    charterId: charter.charterId,
    maxCrossEdgeHoleCount: maxHoles,
    requireRoundtripRouteParity: charter.requireRoundtripRouteParity === true,
    edgeCount: edges.length,
    outboundCount: outboundIds.length,
    edges,
    weakEdges,
    wptpEmitNextjsAvailable: wptpEmitNextjsAvailable(),
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  const ok =
    edges.length >= (charter.webOriginIds ?? []).length &&
    outboundIds.length >= 9 &&
    refuseOk &&
    edges.every((e) => typeof e.maxHoleCount === "number");

  return {
    kind: UT_WAVE_B_CHARTER_AUDIT_KIND,
    schemaVersion: 1,
    gate: "G9971",
    ok,
    reportPath: "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-charter-audit.v1.json",
    edgeCount: edges.length,
    weakEdgeCount: weakEdges.length,
    refuseOk,
    outboundCount: outboundIds.length,
  };
}

async function main() {
  const gate = runUtWaveBCharterAuditGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-b-charter-audit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
