import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runLiftHelperSqlSameTwinReplayVerify } from "../../../scripts/verify-lift-helper-sql-same-twin-replay.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("lift-helper-sql-same-twin emit replay verify (B5.5 v2)", () => {
  it.runIf(phpOnPath())(
    "ingest inlines helpers, emits hono, and replays oracle corpus at 100%",
    async () => {
      const report = await runLiftHelperSqlSameTwinReplayVerify({ capture: true });
      expect(report.skip).toBeUndefined();
      expect(report.ok).toBe(true);
      expect(report.irHoles).toBe(0);
      expect(report.emitHoles).toBe(0);
      expect(report.correctness).toBe(1);
      expect(report.framesPassed).toBe(report.framesTotal);
      expect(report.handlerCount).toBe(2);
    },
    120_000,
  );

  it("skips cleanly when php is absent", async () => {
    if (phpOnPath()) return;
    const report = await runLiftHelperSqlSameTwinReplayVerify({ capture: false });
    expect(report.ok).toBe(true);
    expect(report.skip).toBe("no-php");
  });
});
