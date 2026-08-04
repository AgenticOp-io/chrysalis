#!/usr/bin/env node
/**
 * CWL-Above-Code smoke (G10116 / D6541).
 * CWL is source; languages are disposable backends — greenfield CWL → WebIR → gold verify.
 * Reuses Phase 23 greenfield cutover; frames it as the agent-era SoR path.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlGreenfieldCutoverGate } from "./hub-cwl-greenfield-cutover-smoke.mjs";

export const CWL_ABOVE_CODE_SMOKE_KIND = "chrysalis.hub.cwl-above-code-smoke";
export const CWL_ABOVE_CODE_SMOKE_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function runCwlAboveCodeSmoke(opts = {}) {
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const docPath = join(ROOT, "docs/AGENT-ERA-SUBSTRATE.md");
  const docOk =
    existsSync(docPath) &&
    readFileSync(docPath, "utf8").includes("CWL-Above-Code") &&
    readFileSync(docPath, "utf8").includes("disposable");
  checks.push({ id: "docs-cwl-above-code", ok: docOk });

  const greenfield = await runCwlGreenfieldCutoverGate(opts);
  checks.push({
    id: "greenfield-cwl-source",
    ok: greenfield.ok === true,
    detail: greenfield.ok
      ? `projection=${greenfield.projection?.holeFree}/${greenfield.projection?.total}`
      : greenfield.skip || "greenfield-failed",
  });

  checks.push({
    id: "cwl-hole-free-before-emit",
    ok:
      greenfield.projection?.holeFree === greenfield.projection?.total &&
      (greenfield.projection?.total ?? 0) >= 3,
  });

  checks.push({
    id: "disposable-backends-verified",
    ok:
      greenfield.goldVerify?.["cwl-greenfield-hono"] === true &&
      greenfield.goldVerify?.["cwl-greenfield-fastify"] === true,
    detail: JSON.stringify(greenfield.goldVerify ?? {}),
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: CWL_ABOVE_CODE_SMOKE_KIND,
    schemaVersion: CWL_ABOVE_CODE_SMOKE_SCHEMA_VERSION,
    ok,
    gate: "G10116",
    decision: "D6541",
    thesis: "CWL is source; TypeScript/Hono/Fastify are disposable emit backends",
    checks,
    failed: checks.filter((c) => !c.ok),
    greenfield,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAboveCodeSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-cwl-above-code-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
