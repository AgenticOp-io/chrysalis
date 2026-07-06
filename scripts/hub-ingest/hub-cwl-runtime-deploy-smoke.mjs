#!/usr/bin/env node
/** CWL runtime-cwl deploy scaffold smoke (G9240). */
import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_RUNTIME_DEPLOY_SMOKE_KIND = "chrysalis.cwl-runtime-deploy-smoke";
export const CWL_RUNTIME_DEPLOY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-runtime-cwl-from-hub.mjs");
const FIXTURE = join(scriptRoot, "fixtures/hub-gold-cwl");

async function existsPath(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runCwlRuntimeDeployGate() {
  const outDir = join(FIXTURE, "generated", "runtime-cwl");
  const r = spawnSync(process.execPath, [emitScript, FIXTURE, "--origin", "cwl"], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  let report = {};
  try {
    report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  } catch {
    report = {};
  }
  const emitOk = r.status === 0 && (report.routeCount ?? 0) > 0;
  const dockerfileOk = await existsPath(join(outDir, "Dockerfile"));
  const readmeOk = await existsPath(join(outDir, "README.md"));
  const vendorOk = await existsPath(join(outDir, "vendor/@chrysalis/runtime-cwl/dist/index.js"));
  let npmInstallOk = false;
  let npmInstallSkip = "skip-npm-install";
  if (emitOk && vendorOk && process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_DEPLOY_NPM !== "1") {
    const npm =
      process.platform === "win32"
        ? spawnSync("npm install --omit=dev", {
            cwd: outDir,
            encoding: "utf8",
            timeout: 120_000,
            shell: true,
          })
        : spawnSync("npm", ["install", "--omit=dev"], {
            cwd: outDir,
            encoding: "utf8",
            timeout: 120_000,
          });
    npmInstallOk = npm.status === 0;
    npmInstallSkip = npmInstallOk ? undefined : "npm-install-failed";
  } else if (process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_DEPLOY_NPM === "1") {
    npmInstallOk = true;
    npmInstallSkip = "env-skip";
  }
  let packageUsesVendor = false;
  if (await existsPath(join(outDir, "package.json"))) {
    const pkg = JSON.parse(await readFile(join(outDir, "package.json"), "utf8"));
    packageUsesVendor = String(pkg.dependencies?.["@chrysalis/runtime-cwl"] ?? "").includes("vendor");
  }
  const ok =
    emitOk === true &&
    dockerfileOk === true &&
    readmeOk === true &&
    vendorOk === true &&
    packageUsesVendor === true &&
    npmInstallOk === true;
  return {
    kind: CWL_RUNTIME_DEPLOY_SMOKE_KIND,
    schemaVersion: CWL_RUNTIME_DEPLOY_SMOKE_SCHEMA_VERSION,
    ok,
    emitOk,
    routeCount: report.routeCount ?? 0,
    dockerfileOk,
    readmeOk,
    vendorOk,
    packageUsesVendor,
    npmInstallOk,
    npmInstallSkip,
    outDir,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlRuntimeDeploySmoke() {
  const progress = createSmokeProgress("cwl-runtime-deploy");
  const t0 = progress.start("CWL runtime-cwl deploy scaffold (G9240)");
  const gate = await runCwlRuntimeDeployGate();
  progress.end("CWL runtime-cwl deploy scaffold (G9240)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlRuntimeDeploySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-runtime-deploy-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
