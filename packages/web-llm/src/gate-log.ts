import { isWebLlmTrajectoryLoggingEnabled, resolveWebLlmTrajectoryPath } from "./env.js";
import { appendTrajectoryRecord, createTrajectorySessionId, readTrajectoryRecords } from "./trajectory.js";
import type { TrajectoryGateResult } from "./types.js";

export type LogWebLlmGateInput = {
  repoRoot: string;
  gateName: string;
  ok: boolean;
  skip?: string;
  detail?: Record<string, unknown>;
  sessionId?: string;
  trajectoryPath?: string;
  force?: boolean;
};

export function nextTrajectoryStep(filePath: string) {
  const records = readTrajectoryRecords(filePath);
  if (!records.length) return 1;
  return Math.max(...records.map((r) => r.step)) + 1;
}

export function logWebLlmSmokeGate(input: LogWebLlmGateInput) {
  if (!input.force && !isWebLlmTrajectoryLoggingEnabled()) {
    return { ok: true, skipped: true, reason: "trajectory-logging-disabled" };
  }

  const filePath = input.trajectoryPath ?? resolveWebLlmTrajectoryPath(input.repoRoot);
  const sessionId = input.sessionId ?? createTrajectorySessionId("gate");
  const step = nextTrajectoryStep(filePath);
  const gate: TrajectoryGateResult = {
    name: input.gateName,
    ok: input.ok,
    ...(input.skip ? { skip: input.skip } : {}),
    ...(input.detail ? { detail: input.detail } : {}),
  };

  appendTrajectoryRecord({
    filePath,
    sessionId,
    step,
    role: "tool",
    toolName: "chrysalis_gate",
    content: input.gateName,
    gate,
  });

  appendTrajectoryRecord({
    filePath,
    sessionId,
    step: step + 1,
    role: "assistant",
    content: input.ok ? `${input.gateName}: pass` : `${input.gateName}: fail`,
    gate,
  });

  return { ok: true, skipped: false, filePath, sessionId, step };
}
