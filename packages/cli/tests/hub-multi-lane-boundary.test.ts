import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const SMOKE = resolve(ROOT, "scripts/hub-ingest/hub-multi-lane-smoke.mjs");

test("hub multi-lane smoke: parser vendor + oracle redactor when php available (G59)", () => {
  const r = spawnSync(process.execPath, [SMOKE], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
  const text = r.stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const j = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : "{}") as {
    kind?: string;
    ok?: boolean;
    parserBridgeVendor?: boolean;
    phpAvailable?: boolean;
    oracleRedactor?: boolean;
  };
  expect(j.kind).toBe("chrysalis.hub.multi-lane-smoke");
  expect(j.schemaVersion).toBe(2);
  expect(j.parserBridgeVendor).toBe(true);
  if (j.phpAvailable) {
    expect(j.oracleRedactor).toBe(true);
    if (j.parserNikicSkipped == null) {
      expect(j.parserNikicParity).toBe(true);
    }
    if (j.migrationDebtSkipped == null) {
      expect(j.migrationDebtOk).toBe(true);
    }
    expect(j.ok).toBe(true);
    expect(r.status).toBe(0);
  }
}, 130_000);

test("hub verify tiers: non-PHP origins use structural lane, not oracle (G59 boundary)", async () => {
  const { hubPairsForVerifyTier } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/hub-verify-tiers.mjs", import.meta.url))
  );
  const structural = hubPairsForVerifyTier("structural");
  for (const row of structural) {
    // php→cwl uses structural gold (CWL projection), not full oracle ingest-emit (G32/G154).
    if (row.origin === "php" && row.output === "cwl") continue;
    expect(row.origin).not.toBe("php");
  }
  expect(structural.some((p) => p.origin === "javascript" && p.output === "nextjs")).toBe(true);
});
