#!/usr/bin/env node
/**
 * runtime-cwl parity smoke for full-stack CWL fixtures (G1151).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";

export const HUB_CWL_RUNTIME_PARITY_SMOKE_KIND = "chrysalis.hub.cwl-runtime-parity-smoke";
export const HUB_CWL_RUNTIME_PARITY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FIXTURES = [
  {
    id: "fullstack",
    dir: join(scriptRoot, "fixtures/hub-gold-cwl-fullstack"),
    cwlRel: "routes.cwl",
    probePath: "/",
    expectHtml: true,
    minRoutes: 2,
  },
  {
    id: "layout",
    dir: join(scriptRoot, "fixtures/hub-gold-cwl-layout"),
    cwlRel: "routes.cwl",
    probePath: "/docs/intro",
    expectHtml: true,
    minRoutes: 2,
  },
];

/**
 * @param {object} [opts]
 */
export async function runCwlRuntimeParitySmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  /** @type {Record<string, { ok: boolean, routeCount?: number, probeStatus?: number, skip?: string }>} */
  const cases = {};
  let ok = true;

  for (const spec of FIXTURES) {
    const cwlPath = join(spec.dir, spec.cwlRel);
    if (!existsSync(cwlPath)) {
      cases[spec.id] = { ok: false, skip: "missing-cwl" };
      ok = false;
      continue;
    }
    const preview = await buildCwlPreviewReport(spec.dir, {
      cwlPath,
      probe: true,
      repoRoot,
    });
    const probeStatus = preview.probe?.status;
    const body = String(preview.probe?.bodyPreview ?? "");
    const htmlOk = !spec.expectHtml || body.includes("<");
    const caseOk =
      preview.ok === true &&
      (preview.routeCount ?? 0) >= spec.minRoutes &&
      typeof probeStatus === "number" &&
      probeStatus === 200 &&
      htmlOk;
    cases[spec.id] = {
      ok: caseOk,
      routeCount: preview.routeCount ?? 0,
      probeStatus: typeof probeStatus === "number" ? probeStatus : undefined,
      holeCount: preview.holeCount ?? 0,
    };
    if (!caseOk) ok = false;
  }

  return {
    kind: HUB_CWL_RUNTIME_PARITY_SMOKE_KIND,
    schemaVersion: HUB_CWL_RUNTIME_PARITY_SMOKE_SCHEMA_VERSION,
    ok,
    cases,
    runtime: "@chrysalis/runtime-cwl",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlRuntimeParitySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
