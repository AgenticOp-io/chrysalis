import { createHash } from "node:crypto";
import {
  WEB_LLM_TRAINING_SHARD_KIND,
  WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION,
} from "./kinds.js";
import type { TrainingShard, TrainingShardMessage, TrajectoryRecord, WebVerifyBenchmarkCase } from "./types.js";

const SYSTEM_PROMPT =
  "You are a Chrysalis website agent. Propose CWL/WebIR changes only. Every assistant claim must pass verify gates (oracle replay, hole budget). Refuse silent best-effort translation.";

export function trajectoryRecordToMessages(record: TrajectoryRecord): TrainingShardMessage[] {
  /** @type {TrainingShardMessage[]} */
  const messages = [];
  if (record.role === "user" && record.content) {
    messages.push({ role: "user" as const, content: record.content });
  } else if (record.role === "tool") {
    const tool = record.toolName ?? "tool";
    const body = record.content ?? JSON.stringify(record.toolOutput ?? record.toolInput ?? {});
    messages.push({ role: "tool" as const, content: `[${tool}] ${body}` });
  } else if (record.role === "assistant" && record.content) {
    messages.push({ role: "assistant" as const, content: record.content });
  }
  return messages;
}

export function trainingShardFromSessionRecords(
  sessionId: string,
  records: TrajectoryRecord[],
  opts: { provenance?: string[]; benchmarkCaseIds?: string[] } = {},
): TrainingShard | null {
  if (!records.length) return null;
  const messages: TrainingShardMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  let gate = undefined;
  const tools = new Set<string>();
  for (const record of records) {
    messages.push(...trajectoryRecordToMessages(record));
    if (record.toolName) tools.add(record.toolName);
    if (record.gate) gate = record.gate;
  }
  const id = createHash("sha256").update(sessionId).digest("hex").slice(0, 16);
  return {
    kind: WEB_LLM_TRAINING_SHARD_KIND,
    schemaVersion: WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION,
    id: `shard-${id}`,
    sessionId,
    generatedAt: new Date().toISOString(),
    messages,
    ...(gate ? { gate } : {}),
    tools: [...tools],
    ...(opts.benchmarkCaseIds ? { benchmarkCaseIds: opts.benchmarkCaseIds } : {}),
    provenance: opts.provenance ?? ["chrysalis.web-llm.trajectory"],
  };
}

export function groupTrajectoryRecordsBySession(records: TrajectoryRecord[]) {
  /** @type {Map<string, TrajectoryRecord[]>} */
  const bySession = new Map();
  for (const record of records) {
    const list = bySession.get(record.sessionId) ?? [];
    list.push(record);
    bySession.set(record.sessionId, list);
  }
  for (const list of bySession.values()) {
    list.sort((a: TrajectoryRecord, b: TrajectoryRecord) => a.step - b.step);
  }
  return bySession;
}

export function buildTrainingShardsFromRecords(
  records: TrajectoryRecord[],
  opts: { provenance?: string[] } = {},
): TrainingShard[] {
  const bySession = groupTrajectoryRecordsBySession(records);
  /** @type {TrainingShard[]} */
  const shards = [];
  for (const [sessionId, sessionRecords] of bySession) {
    const shard = trainingShardFromSessionRecords(sessionId, sessionRecords, opts);
    if (shard) shards.push(shard);
  }
  return shards.sort((a: TrainingShard, b: TrainingShard) => a.id.localeCompare(b.id));
}

export function benchmarkCaseToEvalPrompt(c: WebVerifyBenchmarkCase): string {
  return `Chartered fixture "${c.fixture}": produce or verify CWL for ${c.method} ${c.path} (task=${c.task}, tier=${c.tier}). Run chrysalis verify before claiming success.`;
}

export function benchmarkEvalPrompts(cases: WebVerifyBenchmarkCase[], limit = 50): string[] {
  return cases.slice(0, limit).map(benchmarkCaseToEvalPrompt);
}
