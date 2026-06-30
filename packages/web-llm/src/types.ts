export type TrajectoryRole = "user" | "assistant" | "system" | "tool";

export type TrajectoryGateResult = {
  name: string;
  ok: boolean;
  skip?: string;
  detail?: Record<string, unknown>;
};

export type TrajectoryRecord = {
  kind: typeof import("./kinds.js").WEB_LLM_TRAJECTORY_RECORD_KIND;
  schemaVersion: number;
  sessionId: string;
  step: number;
  ts: string;
  role: TrajectoryRole;
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  gate?: TrajectoryGateResult;
  artifacts?: string[];
  unverified?: boolean;
};

export type WebVerifyBenchmarkCase = {
  id: string;
  fixture: string;
  path: string;
  method: string;
  task: "verify" | "migrate" | "ui-parity" | "ingest";
  tier: "oracle" | "structural" | "showcase";
  tags: string[];
};

export type WebVerifyBenchmark = {
  kind: typeof import("./kinds.js").WEB_LLM_BENCHMARK_KIND;
  schemaVersion: number;
  generatedAt: string;
  caseCount: number;
  cases: WebVerifyBenchmarkCase[];
  tiers: Record<string, number>;
  tasks: Record<string, number>;
};

export type AgentToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export type VerifyGatePolicyInput = {
  gateOk?: boolean;
  verifyCorrectness?: number;
  minCorrectness?: number;
  holeCount?: number;
  maxHoles?: number;
  unverified?: boolean;
};

export type VerifyGatePolicyResult = {
  ok: boolean;
  reasons: string[];
};

export type TrainingShardMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type TrainingShard = {
  kind: typeof import("./kinds.js").WEB_LLM_TRAINING_SHARD_KIND;
  schemaVersion: number;
  id: string;
  sessionId: string;
  generatedAt: string;
  messages: TrainingShardMessage[];
  gate?: TrajectoryGateResult;
  tools?: string[];
  benchmarkCaseIds?: string[];
  provenance: string[];
};

export type LeaderboardEntry = {
  id: string;
  label: string;
  wvbCaseCount?: number;
  gatePassRate?: number;
  notes?: string;
};

export type WebVerifyLeaderboard = {
  kind: typeof import("./kinds.js").WEB_LLM_LEADERBOARD_KIND;
  schemaVersion: number;
  generatedAt: string;
  benchmarkCaseCount: number;
  benchmarkTiers: Record<string, number>;
  entries: LeaderboardEntry[];
};
