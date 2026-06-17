import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runLiftHelperSqlCaseTwinReplayVerify } from "../../../scripts/verify-lift-helper-sql-case-twin-replay.mjs";

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("lift-helper-sql-case-twin emit replay verify (G2300)", () => {
  it.runIf(phpOnPath())(
    "ingest inlines helpers, emits hono, and replays oracle corpus at 100%",
    async () => {
      const report = await runLiftHelperSqlCaseTwinReplayVerify({ capture: true });
      expect(report.skip).toBeUndefined();
      expect(report.ok).toBe(true);
      expect(report.irHoles).toBe(0);
      expect(report.emitHoles).toBe(0);
      expect(report.correctness).toBe(1);
      expect(report.handlerCount).toBe(2);
    },
    120_000,
  );
});
