import { join } from "node:path";

export function isWebLlmTrajectoryLoggingEnabled() {
  const v = process.env.CHRYSALIS_WEB_LLM_TRAJECTORY?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

/** @param {string} repoRoot @param {string} [subpath] */
export function resolveWebLlmTrajectoryPath(repoRoot: string, subpath = "gates/smokes.jsonl") {
  const fromEnv = process.env.CHRYSALIS_WEB_LLM_TRAJECTORY_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(repoRoot, "reports/web-llm", subpath);
}

export function resolveWebLlmDatasetDir(repoRoot: string) {
  const fromEnv = process.env.CHRYSALIS_WEB_LLM_DATASET_DIR?.trim();
  if (fromEnv) return fromEnv;
  return join(repoRoot, "reports/web-llm/dataset");
}

export function resolveWebLlmLeaderboardDir(repoRoot: string) {
  const fromEnv = process.env.CHRYSALIS_WEB_LLM_LEADERBOARD_DIR?.trim();
  if (fromEnv) return fromEnv;
  return join(repoRoot, "reports/web-llm/leaderboard");
}
