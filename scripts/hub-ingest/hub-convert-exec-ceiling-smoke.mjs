#!/usr/bin/env node
/**
 * Convert execution ceilings — named residual honesty gate.
 * Proves Convert refuses invent for opaque g_* / DB evaluate, foreach N-iter
 * HTML, and browser island event execution (contracts only). D6442/D6447.
 *
 * Gate: hub:convert-exec-ceiling-smoke → CONVERT_EXEC_CEILINGS_HONEST
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPinSmoke } from "./hub-cwl-pin-smoke.mjs";

export const CONVERT_EXEC_CEILING_SMOKE_KIND = "chrysalis.hub.convert-exec-ceiling-smoke";
export const CONVERT_EXEC_CEILING_SMOKE_SCHEMA_VERSION = 1;
export const CONVERT_EXEC_CEILINGS_HONEST = "CONVERT_EXEC_CEILINGS_HONEST";
export const CONVERT_EXEC_CEILINGS_FAIL = "CONVERT_EXEC_CEILINGS_FAIL";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_CEILING_IDS = [
  "opaque-g-star-db-evaluate",
  "foreach-n-iteration-html",
  "browser-island-event-execution",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runConvertExecCeilingSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;

  const pin = await runCwlPinSmoke({ convertRoot: root });

  const catalogPath = join(root, "fixtures/ci/convert-exec-ceilings.json");
  const docPath = join(root, "docs/CONVERT-EXEC-CEILINGS.md");
  const controlLowerPath = join(root, "scripts/hub-ingest/cwl-control-lower.mjs");
  const rfc0021Path = join(root, "docs/CWL-RFC-0021-early-exit-cond-expr.md");
  const runtimeDepthPath = join(root, "docs/CWL-RUNTIME-DEPTH-PHASE-46.md");
  const browserReadmePath = join(root, "packages/runtime-cwl-browser/README.md");
  const consumePath = join(root, "docs/CONVERT-CWL-CONSUME.md");

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  checks.push({
    id: "cwl-pin",
    ok: pin.ok === true,
    detail: pin.ok ? "CONVERT_TIP_1_0_88_OK" : (pin.failed ?? []).join(","),
  });

  checks.push({
    id: "docs-convert-exec-ceilings",
    ok: existsSync(docPath),
    detail: "docs/CONVERT-EXEC-CEILINGS.md",
  });

  let catalogOk = false;
  let catalogDetail = "missing";
  if (existsSync(catalogPath)) {
    try {
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
      const ids = (catalog.ceilings ?? []).map((c) => c.id);
      const statuses = (catalog.ceilings ?? []).map((c) => c.status);
      const hasAll = REQUIRED_CEILING_IDS.every((id) => ids.includes(id));
      const allResidual = statuses.every((s) => s === "named-residual");
      const policyOk =
        typeof catalog.policy === "string" &&
        /D6442|D6447/.test(catalog.policy) &&
        /refuse invent/i.test(catalog.policy);
      catalogOk = hasAll && allResidual && policyOk && catalog.kind === "chrysalis.convert.exec-ceilings";
      catalogDetail = catalogOk
        ? `ceilings=${REQUIRED_CEILING_IDS.length};status=named-residual`
        : `ids=${ids.join(",")};statuses=${statuses.join(",")}`;
    } catch (e) {
      catalogDetail = String(e?.message ?? e);
    }
  }
  checks.push({ id: "catalog-convert-exec-ceilings", ok: catalogOk, detail: catalogDetail });

  const controlLower = existsSync(controlLowerPath)
    ? readFileSync(controlLowerPath, "utf8")
    : "";
  checks.push({
    id: "control-lower-skips-opaque-g",
    ok:
      /opaque residual/.test(controlLower) &&
      /\^g_\[A-Za-z0-9_\]\+\$/.test(controlLower) &&
      /never invent N-iteration/.test(controlLower) &&
      /no N-iteration claim/.test(controlLower),
    detail: "cwl-control-lower.mjs opaque skip + N-iter refuse",
  });

  const rfc0021 = existsSync(rfc0021Path) ? readFileSync(rfc0021Path, "utf8") : "";
  checks.push({
    id: "rfc-0021-opaque-and-foreach-bind",
    ok:
      /opaque residual/i.test(rfc0021) &&
      /g_empty_<name>/.test(rfc0021) &&
      /one.*chrome sample|not N iterations/i.test(rfc0021) &&
      /do not invent verify runtime/i.test(rfc0021),
    detail: "docs/CWL-RFC-0021-early-exit-cond-expr.md",
  });

  const runtimeDepth = existsSync(runtimeDepthPath)
    ? readFileSync(runtimeDepthPath, "utf8")
    : "";
  const browserReadme = existsSync(browserReadmePath)
    ? readFileSync(browserReadmePath, "utf8")
    : "";
  checks.push({
    id: "island-contract-not-execution",
    ok:
      /bindClientIslandEvents/.test(runtimeDepth) &&
      /Hydration \/ client JS execution/.test(runtimeDepth) &&
      /Refused/.test(runtimeDepth) &&
      /no hydration execution/i.test(browserReadme),
    detail: "Phase-46 + runtime-cwl-browser README refuse hydration execution",
  });

  const consume = existsSync(consumePath) ? readFileSync(consumePath, "utf8") : "";
  checks.push({
    id: "consume-oracle-wait",
    ok:
      /Opaque `g_\*` \/ DB evaluate/.test(consume) &&
      /foreach N-iteration HTML/.test(consume) &&
      /browser island \*\*execution\*\*/.test(consume) &&
      /do not invent/i.test(consume),
    detail: "docs/CONVERT-CWL-CONSUME.md oracle wait",
  });

  checks.push({
    id: "early-exit-smoke-script",
    ok: existsSync(join(root, "scripts/hub-ingest/hub-cwl-early-exit-smoke.mjs")),
    detail: "hub:cwl-early-exit-smoke",
  });

  checks.push({
    id: "layout-page-island-peel-script",
    ok: existsSync(join(root, "scripts/hub-ingest/hub-layout-page-island-peel-smoke.mjs")),
    detail: "hub:layout-page-island-peel-smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: CONVERT_EXEC_CEILING_SMOKE_KIND,
    schemaVersion: CONVERT_EXEC_CEILING_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? CONVERT_EXEC_CEILINGS_HONEST : CONVERT_EXEC_CEILINGS_FAIL,
    cwlTipFloor: "1.0.88",
    status: "named-residual",
    checks,
    failed: failed.map((c) => c.id),
    pin: { ok: pin.ok, failed: pin.failed },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runConvertExecCeilingSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) console.log(CONVERT_EXEC_CEILINGS_HONEST);
  else {
    console.error(CONVERT_EXEC_CEILINGS_FAIL);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("hub-convert-exec-ceiling-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
