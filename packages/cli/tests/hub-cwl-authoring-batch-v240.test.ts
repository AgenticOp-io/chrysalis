import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("authoring batch v240 smoke (G3701) gate-only", () => {
  const batchUrl = pathToFileURL(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v240-smoke.mjs"),
  ).href;
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { runCwlAuthoringBatchV240Smoke } from ${JSON.stringify(batchUrl)};
const report = await runCwlAuthoringBatchV240Smoke({ skipPriorChain: true });
if (!report.ok || report.gate240?.ok !== true || report.gate240Mode !== "evidence-trend") process.exit(1);`,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `exit ${r.status}`);
  }
  expect(r.status).toBe(0);
}, 120_000);
