#!/usr/bin/env node
/**
 * GPU lab close prep (G9620 / D6381) — CPU manifest + operator script contract.
 * Real T4 train runs on GCE via `pnpm run gpu-lab:gce` (not in default CI spend).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runIsT2LoraPrepSmoke } from "./hub-is-t2-lora-prep-smoke.mjs";

export const HUB_GPU_LAB_CLOSE_KIND = "chrysalis.hub.gpu-lab-close-smoke";
export const HUB_GPU_LAB_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} [opts]
 */
export async function runGpuLabCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const loraPrep = await runIsT2LoraPrepSmoke({ repoRoot });

  const orchestrate = join(repoRoot, "scripts/gce-gpu-lab-orchestrate.sh");
  const gpuDoc = join(repoRoot, "docs/GCE-GPU-LAB.md");
  const orchestrateText = existsSync(orchestrate) ? readFileSync(orchestrate, "utf8") : "";
  const docText = existsSync(gpuDoc) ? readFileSync(gpuDoc, "utf8") : "";

  const checks = {
    loraPrepOk: loraPrep.ok === true,
    orchestrateExists: existsSync(orchestrate),
    orchestrateDryRunDefault: orchestrateText.includes('CHRYSALIS_GPU_LAB_DRY_RUN:-1'),
    orchestrateMaxMinutes: orchestrateText.includes("CHRYSALIS_GPU_LAB_MAX_MINUTES"),
    gpuLabDocExists: existsSync(gpuDoc),
    gpuLabDocGceCommand: docText.includes("gpu-lab:gce"),
    packageJsonGpuLabGce: (() => {
      const pkg = join(repoRoot, "package.json");
      if (!existsSync(pkg)) return false;
      return readFileSync(pkg, "utf8").includes("gpu-lab:gce");
    })(),
    manifestPathExists: existsSync(join(repoRoot, "reports/web-llm/lora/train-manifest.v1.json")),
    manifestRelativePaths: (() => {
      const p = join(repoRoot, "reports/web-llm/lora/train-manifest.v1.json");
      if (!existsSync(p)) return false;
      try {
        const m = JSON.parse(readFileSync(p, "utf8"));
        const jsonl = String(m.datasetJsonlPath ?? "");
        return jsonl.startsWith("reports/") && !jsonl.includes("\\") && !/^[A-Za-z]:/.test(jsonl);
      } catch {
        return false;
      }
    })(),
    trainPySyncedInViaGce: (() => {
      const ps1 = join(repoRoot, "scripts/gce-gpu-lab-via-gce.ps1");
      if (!existsSync(ps1)) return false;
      return readFileSync(ps1, "utf8").includes("chrysalis-lora-qlora-train.py");
    })(),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_GPU_LAB_CLOSE_KIND,
    schemaVersion: HUB_GPU_LAB_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    loraPrep: { ok: loraPrep.ok, verifyGreenCount: loraPrep.exported?.manifest?.verifyGreenCount ?? null },
    operatorPath: "pnpm run gpu-lab:gce  # detached on chrysalis-test-vm → chrysalis-gpu-lab T4",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runGpuLabCloseSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-gpu-lab-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
