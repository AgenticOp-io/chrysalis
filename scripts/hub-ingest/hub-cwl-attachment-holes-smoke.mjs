#!/usr/bin/env node
/**
 * Prove fat Convert `cwl-ingest` keeps RFC-0024 attachment holes with return bodies
 * (parity with pillar thin ingest). Fixture: chrysalis-cwl language-gold `25-island-kinds`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { loadWebir } from "./shared.mjs";

export const CWL_ATTACHMENT_HOLES_SMOKE_KIND = "chrysalis.hub.cwl-attachment-holes-smoke";
export const CWL_ATTACHMENT_HOLES_SMOKE_SCHEMA_VERSION = 1;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE = resolve(
  CONVERT_ROOT,
  "../chrysalis-cwl/fixtures/language-gold/25-island-kinds/routes.cwl",
);

const EXPECTED_REASONS = [
  "unsupported:vendor-sdk",
  "unsupported:wasm-module",
  "unsupported:opaque-script",
];

/**
 * @param {{ fixturePath?: string }} [opts]
 */
export async function runCwlAttachmentHolesSmoke(opts = {}) {
  const cwlPath = resolve(opts.fixturePath ?? FIXTURE);
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  checks.push({
    id: "fixture-present",
    ok: existsSync(cwlPath),
    detail: cwlPath.replace(/\\/g, "/"),
  });
  if (!existsSync(cwlPath)) {
    return finalize(checks, false);
  }

  const webir = await loadWebir();
  const source = readFileSync(cwlPath, "utf8");
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-cwl-attachment-holes" });
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
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const attachmentBlocks = nodes.filter(
    (n) =>
      n.op === "block" &&
      Array.isArray(n.provenance) &&
      n.provenance.some((p) => p?.locator === "cwl:attachment-holes"),
  );
  checks.push({
    id: "attachment-blocks",
    ok: attachmentBlocks.length === 3,
    detail: `count=${attachmentBlocks.length}`,
  });

  const holeReasons = new Set();
  for (const block of attachmentBlocks) {
    for (const opId of block.operands ?? []) {
      const child = byId.get(opId);
      if (child?.op === "hole" || child?.type?.kind === "hole") {
        const loc =
          child.attrs?.reason ??
          child.provenance?.find((p) => typeof p?.locator === "string")?.locator;
        if (loc) holeReasons.add(loc);
      }
    }
  }
  for (const reason of EXPECTED_REASONS) {
    checks.push({
      id: `hole:${reason}`,
      ok: holeReasons.has(reason),
      detail: [...holeReasons].join(","),
    });
  }

  // Health route must stay free of island attachment reasons.
  const healthRoute = nodes.find((n) => n.op === "route" && n.attrs?.path === "/api/health");
  checks.push({
    id: "health-route-present",
    ok: Boolean(healthRoute),
    detail: healthRoute ? String(healthRoute.id) : "missing",
  });
  const healthHandler = healthRoute ? byId.get(healthRoute.operands?.[0]) : null;
  const healthBodyWalk = new Set();
  /** @param {string | undefined} id */
  function walk(id) {
    if (!id || healthBodyWalk.has(id)) return;
    healthBodyWalk.add(id);
    const n = byId.get(id);
    if (!n) return;
    for (const child of n.operands ?? []) walk(child);
  }
  walk(healthHandler?.operands?.[0]);
  const healthHasIslandHole = [...healthBodyWalk].some((id) => {
    const n = byId.get(id);
    return n?.op === "hole" && EXPECTED_REASONS.includes(n.attrs?.reason);
  });
  checks.push({
    id: "health-no-island-holes",
    ok: !healthHasIslandHole,
  });

  const ok = checks.every((c) => c.ok);
  return finalize(checks, ok, {
    attachmentBlockCount: attachmentBlocks.length,
    holeReasons: [...holeReasons],
  });
}

/**
 * @param {Array<{ id: string, ok: boolean, detail?: string }>} checks
 * @param {boolean} ok
 * @param {Record<string, unknown>} [extra]
 */
function finalize(checks, ok, extra = {}) {
  return {
    kind: CWL_ATTACHMENT_HOLES_SMOKE_KIND,
    schemaVersion: CWL_ATTACHMENT_HOLES_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    ...extra,
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runCwlAttachmentHolesSmoke();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
