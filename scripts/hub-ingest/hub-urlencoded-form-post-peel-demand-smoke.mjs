#!/usr/bin/env node
/**
 * G10138 — Urlencoded form POST peel demand (CWL DNA-BUILD-NEXT P2 signal).
 *
 * Convert peels Express `express.urlencoded` + form POST body fields and
 * projects `use urlencoded` in fat CWL emit. Publishes a demand catalog for
 * CWL native urlencoded form POST language gold — does **not** invent a tip.
 *
 * Gate: hub:urlencoded-form-post-peel-demand-smoke
 * Token: URLENCODED_FORM_POST_PEEL_DEMAND_OK
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_URLENCODED_FORM_POST_PEEL_DEMAND_SMOKE_KIND =
  "chrysalis.hub.urlencoded-form-post-peel-demand-smoke";
export const HUB_URLENCODED_FORM_POST_PEEL_DEMAND_SMOKE_SCHEMA_VERSION = 1;
export const URLENCODED_FORM_POST_PEEL_DEMAND_OK = "URLENCODED_FORM_POST_PEEL_DEMAND_OK";
export const CONVERT_URLENCODED_FORM_POST_PEEL_DEMAND = "CONVERT_URLENCODED_FORM_POST_PEEL_DEMAND";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const liftScript = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(ROOT, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runUrlencodedFormPostPeelDemandSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/urlencoded-form-post-peel-demand.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.urlencoded-form-post-peel-demand" &&
    catalog?.decision === "peel-demand" &&
    catalog?.gate === "G10138" &&
    catalog?.token === URLENCODED_FORM_POST_PEEL_DEMAND_OK &&
    catalog?.refuseForceClose?.allowed === false &&
    /urlencoded/i.test(String(catalog?.demandFromCwl?.item ?? ""));
  checks.push({
    id: "demand-catalog",
    ok: catalogOk,
    detail: catalogOk
      ? `ask=${catalog.demandFromCwl.item}`
      : `missing/invalid catalog at ${catalogPath}`,
  });

  const fixture = join(root, "fixtures/hub-gold-urlencoded-form-post");
  let peelOk = false;
  let peelDetail = "missing-fixture";
  if (existsSync(join(fixture, "src/app.js"))) {
    const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "javascript"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    const emit = spawnSync(process.execPath, [emitScript, fixture, "--origin", "javascript"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    const cwlPath = join(fixture, "generated/cwl/routes.cwl");
    if (lift.status === 0 && emit.status === 0 && existsSync(cwlPath)) {
      let liftReport = {};
      try {
        liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
      } catch {
        liftReport = {};
      }
      const cwlText = readFileSync(cwlPath, "utf8");
      const hasUse = /^use urlencoded;\s*$/m.test(cwlText);
      const hasPost =
        /@route POST "\/signup"/.test(cwlText) &&
        /body email;/.test(cwlText) &&
        /body name;/.test(cwlText);
      const hasGet = /@route GET "\/signup"/.test(cwlText) || /@page GET "\/signup"/.test(cwlText);
      const mwOk = (liftReport.middlewareUseCount ?? 0) >= 1 && (liftReport.holeCount ?? 1) === 0;
      peelOk = hasUse && hasPost && hasGet && mwOk;
      peelDetail = peelOk
        ? "use urlencoded + POST /signup body email|name"
        : `use=${hasUse} post=${hasPost} get=${hasGet} mw=${liftReport.middlewareUseCount} holes=${liftReport.holeCount}`;
    } else {
      peelDetail = `lift=${lift.status} emit=${emit.status}`;
    }
  }
  checks.push({ id: "convert-urlencoded-form-peel", ok: peelOk, detail: peelDetail });

  // Prior G8712 surface still peels both presets into WebIR
  const jsMw = join(root, "fixtures/hub-gold-js-middleware");
  let priorOk = false;
  let priorDetail = "missing-js-middleware";
  if (existsSync(join(jsMw, "src/app.js"))) {
    const lift = spawnSync(process.execPath, [liftScript, jsMw, "--language", "javascript"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    if (lift.status === 0) {
      try {
        const report = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
        priorOk = (report.middlewareUseCount ?? 0) >= 2 && (report.holeCount ?? 1) === 0;
        priorDetail = priorOk
          ? `G8712 middlewareUseCount=${report.middlewareUseCount}`
          : `mw=${report.middlewareUseCount} holes=${report.holeCount}`;
      } catch {
        priorDetail = "lift-json";
      }
    } else {
      priorDetail = `lift=${lift.status}`;
    }
  }
  checks.push({ id: "prior-js-middleware-presets", ok: priorOk, detail: priorDetail });

  checks.push({
    id: "refuse-convert-tip-invent",
    ok: catalog?.refuseForceClose?.allowed === false,
    detail: "CWL owns urlencoded form POST language gold / tip deepen",
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: HUB_URLENCODED_FORM_POST_PEEL_DEMAND_SMOKE_KIND,
    schemaVersion: HUB_URLENCODED_FORM_POST_PEEL_DEMAND_SMOKE_SCHEMA_VERSION,
    gate: "G10138",
    token: URLENCODED_FORM_POST_PEEL_DEMAND_OK,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runUrlencodedFormPostPeelDemandSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) console.log(URLENCODED_FORM_POST_PEEL_DEMAND_OK);
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
