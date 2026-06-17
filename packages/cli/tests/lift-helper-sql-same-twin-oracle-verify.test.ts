import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runLiftHelperSqlSameTwinOracleVerify } from "../../../scripts/verify-lift-helper-sql-same-twin-oracle.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("lift-helper-sql-same-twin oracle verify (B5.3 v5)", () => {
  it.runIf(phpOnPath())(
    "captures twins and asserts body/SQL parity plus semantic alias",
    async () => {
      const report = await runLiftHelperSqlSameTwinOracleVerify({ capture: true });
      expect(report.skip).toBeUndefined();
      expect(report.ok).toBe(true);
      expect(report.bodiesMatch).toBe(true);
      expect(report.sqlMatch).toBe(true);
      expect(report.semanticAlias).toBe(true);
      expect(report.traceCount).toBeGreaterThanOrEqual(2);
    },
    60_000,
  );

  it("skips cleanly when php is absent", async () => {
    if (phpOnPath()) return;
    const report = await runLiftHelperSqlSameTwinOracleVerify({ capture: false });
    expect(report.ok).toBe(true);
    expect(report.skip).toBe("no-php");
  });
});
