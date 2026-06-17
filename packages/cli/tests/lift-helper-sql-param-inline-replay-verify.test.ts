import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runLiftHelperSqlParamInlineReplayVerify } from "../../../scripts/verify-lift-helper-sql-param-inline-replay.mjs";

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("lift-helper-sql-param-inline emit replay verify (B5.5 v9)", () => {
  it.runIf(phpOnPath())(
    "ingest inlines parametric helpers, emits hono, and replays oracle corpus at 100%",
    async () => {
      const report = await runLiftHelperSqlParamInlineReplayVerify({ capture: true });
      expect(report.skip).toBeUndefined();
      expect(report.ok).toBe(true);
      expect(report.irHoles).toBe(0);
      expect(report.emitHoles).toBe(0);
      expect(report.correctness).toBe(1);
      expect(report.framesPassed).toBe(report.framesTotal);
      expect(report.handlerCount).toBe(17);
    },
    120_000,
  );

  it("skips cleanly when php is absent", async () => {
    if (phpOnPath()) return;
    const report = await runLiftHelperSqlParamInlineReplayVerify({ capture: false });
    expect(report.ok).toBe(true);
    expect(report.skip).toBe("no-php");
  });
});
