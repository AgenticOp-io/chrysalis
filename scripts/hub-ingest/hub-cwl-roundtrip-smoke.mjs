#!/usr/bin/env node
/**
 * Generic CWL WebIR round-trip smoke: ingest → project → render → re-ingest (G203/G205/G207).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { listCwlRoutes, renderCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";

export const HUB_CWL_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.cwl-roundtrip-smoke";
export const HUB_CWL_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} opts
 * @param {string} opts.fixtureRel
 * @param {string} opts.rfc
 * @param {string} [opts.moduleName]
 * @param {string} [opts.header]
 * @param {(projection: ReturnType<typeof summarizeCwlProjection>) => boolean} [opts.projectionOk]
 * @param {string} [opts.fixtureDir]
 */
export async function runCwlRoundtripSmoke(opts) {
  const fixtureDir = resolve(opts.fixtureDir ?? join(scriptRoot, opts.fixtureRel));
  const cwlPath = join(fixtureDir, "routes.cwl");
  const base = {
    kind: HUB_CWL_ROUNDTRIP_SMOKE_KIND,
    schemaVersion: HUB_CWL_ROUNDTRIP_SMOKE_SCHEMA_VERSION,
    fixture: opts.fixtureRel,
    rfc: opts.rfc,
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  const webirPkg = await loadWebir();
  const loadProjection = async () => {
    const snapshot = await exportCwlFileToWebirJson(cwlPath);
    const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    return summarizeCwlProjection(webirPkg.moduleFromGoldenSnapshot(raw));
  };

  let forwardProjection;
  try {
    forwardProjection = await loadProjection();
  } catch (e) {
    return { ...base, skip: "forward-ingest-failed", detail: String(e).slice(0, 200) };
  }

  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  const mod = webirPkg.moduleFromGoldenSnapshot(raw);
  const routes = listCwlRoutes(mod);
  const rendered = renderCwlRoutes(routes, {
    moduleName: opts.moduleName ?? "roundtrip",
    header: opts.header ?? `# CWL round-trip (${opts.rfc})`,
  });

  const builder = new webirPkg.ModuleBuilder({ sourceApp: "hub-cwl-roundtrip" });
  const wr = webirPkg.webRequest.builders(builder);
  liftCwlFileToWebir({
    webir: webirPkg,
    builder,
    wr,
    source: rendered.text,
    file: "roundtrip.cwl",
    language: "cwl",
  });
  const roundProjection = summarizeCwlProjection(builder.finish());

  const predicate =
    opts.projectionOk ??
    ((p) => p.holeFree === p.total && p.total > 0);
  const ok =
    predicate(forwardProjection) &&
    predicate(roundProjection) &&
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
