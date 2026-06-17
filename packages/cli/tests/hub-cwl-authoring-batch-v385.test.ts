import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("authoring batch v385 smoke (G5151) gate-only", () => {
  const batchUrl = pathToFileURL(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v385-smoke.mjs"),
  ).href;
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { runCwlAuthoringBatchV385Smoke } from ${JSON.stringify(batchUrl)};
const report = await runCwlAuthoringBatchV385Smoke({ skipPriorChain: true });
if (!report.ok || report.gate385?.ok !== true || report.gate385Mode !== "evidence-trend") process.exit(1);`,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || `exit ${r.status}`);
  expect(r.status).toBe(0);
}, 120_000);
