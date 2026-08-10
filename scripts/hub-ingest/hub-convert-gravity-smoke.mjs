#!/usr/bin/env node
/**
 * Convert gravity closeout — Rosetta path Step 2 (Translation).
 * Honest peel/emit through CWL: pin + WebIR reverse-home + pillar/helix
 * cutover + hole typing + CWL-above-code (no façades).
 *
 * Ask: chrysalis-cwl docs/history/CONVERT-GRAVITY-REQUESTED.md
 * Gate: hub:convert-gravity-smoke → CONVERT_GRAVITY_OK
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runCwlPinSmoke } from "./hub-cwl-pin-smoke.mjs";
import { runCwlLanguagePillarSmoke } from "./hub-cwl-language-pillar-smoke.mjs";
import { runCwlHelixCutoverSmoke } from "./hub-cwl-helix-cutover-smoke.mjs";
import { runHoleTypeSystemSmoke } from "./hub-hole-type-system-smoke.mjs";
import { runCwlAboveCodeSmoke } from "./hub-cwl-above-code-smoke.mjs";

export const CONVERT_GRAVITY_SMOKE_KIND = "chrysalis.hub.convert-gravity-smoke";
export const CONVERT_GRAVITY_SMOKE_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runConvertGravitySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;

  const pin = await runCwlPinSmoke({ convertRoot: root });
  const pillar = await runCwlLanguagePillarSmoke({ convertRoot: root });
  const helix = await runCwlHelixCutoverSmoke();
  const holes = runHoleTypeSystemSmoke();
  const above = await runCwlAboveCodeSmoke({ convertRoot: root });

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [
    {
      id: "docs-convert-gravity",
      ok: existsSync(join(root, "docs/CONVERT-GRAVITY.md")),
      detail: "docs/CONVERT-GRAVITY.md",
    },
    {
      id: "docs-webir-reverse-home",
      ok: existsSync(join(root, "docs/WEBIR-REVERSE-HOME.md")),
      detail: "docs/WEBIR-REVERSE-HOME.md",
    },
    {
      id: "docs-convert-cwl-consume",
      ok: existsSync(join(root, "docs/CONVERT-CWL-CONSUME.md")),
      detail: "docs/CONVERT-CWL-CONSUME.md",
    },
    { id: "cwl-pin", ok: pin.ok === true, detail: pin.failed?.join(",") },
    {
      id: "cwl-language-pillar",
      ok: pillar.ok === true,
      detail: pillar.ok
        ? undefined
        : (pillar.failed ?? []).map((f) => f.id || f).join(",") || "pillar fail",
    },
    {
      id: "cwl-helix-cutover",
      ok: helix.ok === true,
      detail: helix.token ?? (helix.ok ? "ok" : "fail"),
    },
    {
      id: "hole-type-system",
      ok: holes.ok === true,
      detail: holes.failed?.map((f) => f.id).join(",") || undefined,
    },
    {
      id: "cwl-above-code",
      ok: above.ok === true,
      detail: above.ok ? "honest CWL→emit gold" : "above-code fail",
    },
  ];

  // Drop heavy nested reports from stdout default (keep summaries).
  const pinSummary = { ok: pin.ok, failed: pin.failed };
  const pillarSummary = {
    ok: pillar.ok,
    languageVersion: pillar.languageVersion,
    failed: (pillar.failed ?? []).map((f) => f.id),
  };
  const helixSummary = { ok: helix.ok, token: helix.token, mode: helix.mode };
  const holesSummary = { ok: holes.ok, failed: (holes.failed ?? []).map((f) => f.id) };
  const aboveSummary = { ok: above.ok, failed: (above.failed ?? []).map((f) => f.id) };

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: CONVERT_GRAVITY_SMOKE_KIND,
    schemaVersion: CONVERT_GRAVITY_SMOKE_SCHEMA_VERSION,
    ok,
    pathStep: 2,
    pathLabel: "Translation — honest peel/emit through CWL",
    token: ok ? "CONVERT_GRAVITY_OK" : "CONVERT_GRAVITY_FAIL",
    checks,
    failed: failed.map((c) => c.id),
    parts: {
      pin: pinSummary,
      pillar: pillarSummary,
      helix: helixSummary,
      holes: holesSummary,
      above: aboveSummary,
    },
    generatedAt: new Date().toISOString(),
  };
}

const isDirect =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirect) {
  const report = await runConvertGravitySmoke();
  console.log(JSON.stringify(report, null, 2));
  console.log(report.token);
  if (!report.ok) process.exit(1);
}
