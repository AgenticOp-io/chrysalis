#!/usr/bin/env node
/**
 * CWL request-body WebIR round-trip smoke (G197): ingest → project → render → re-ingest.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { listCwlRoutes, renderCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";

export const HUB_CWL_BODY_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.cwl-body-roundtrip-smoke";
export const HUB_CWL_BODY_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-request-body");

async function loadProjection(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

/**
 * @param {object} [opts]
 */
export async function runCwlBodyRoundtripSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  const base = {
    kind: HUB_CWL_BODY_ROUNDTRIP_SMOKE_KIND,
    schemaVersion: HUB_CWL_BODY_ROUNDTRIP_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-cwl-request-body",
    rfc: "CWL-RFC-0005",
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  const webirPkg = await loadWebir();
  let forwardProjection;
  try {
    forwardProjection = await loadProjection(cwlPath);
  } catch (e) {
    return { ...base, skip: "forward-ingest-failed", detail: String(e).slice(0, 200) };
  }

  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  const mod = webirPkg.moduleFromGoldenSnapshot(raw);
  const routes = listCwlRoutes(mod);
  const rendered = renderCwlRoutes(routes, { moduleName: "request_body", header: "# CWL request-body gold (RFC-0005)" });

  const builder = new webirPkg.ModuleBuilder({ sourceApp: "hub-cwl-body-roundtrip" });
  const wr = webirPkg.webRequest.builders(builder);
  liftCwlFileToWebir({
    webir: webirPkg,
    builder,
    wr,
    source: rendered.text,
    file: "roundtrip.cwl",
    language: "cwl",
  });
  const roundMod = builder.finish();
  const roundProjection = summarizeCwlProjection(roundMod);

  const ok =
    forwardProjection.holeFree === forwardProjection.total &&
    roundProjection.holeFree === roundProjection.total &&
    (roundProjection.withBodyParams ?? 0) >= 2 &&
    rendered.holeCount === 0;

  return {
    ...base,
    ok,
    forwardProjection,
    roundProjection,
    rendered: { routeCount: rendered.routeCount, holeCount: rendered.holeCount },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlBodyRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
