import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  WEB_LLM_TRAJECTORY_RECORD_KIND,
  WEB_LLM_TRAJECTORY_SCHEMA_VERSION,
} from "./kinds.js";
import type { TrajectoryGateResult, TrajectoryRecord, TrajectoryRole } from "./types.js";

export function createTrajectorySessionId(prefix = "web-llm") {
  return `${prefix}-${randomUUID()}`;
}

/** @param {string} filePath */
export function readTrajectoryRecords(filePath: string): TrajectoryRecord[] {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  /** @type {TrajectoryRecord[]} */
  const records = [];
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row.kind === WEB_LLM_TRAJECTORY_RECORD_KIND) records.push(row);
    } catch {
      /* skip malformed */
    }
  }
  return records;
}

export type AppendTrajectoryRecordInput = {
  filePath: string;
  sessionId: string;
  step: number;
  role: TrajectoryRole;
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  gate?: TrajectoryGateResult;
  artifacts?: string[];
  unverified?: boolean;
  isTier?: string;
  isRetrievalHit?: boolean;
  skipLlm?: boolean;
  domainId?: string;
  isCacheOutcome?: "hit" | "near-miss" | "miss";
  verifyCostMs?: number;
  sourceDigest?: string;
  nearMissDomainId?: string;
  nearMissScore?: number;
  nearMissFeatures?: Record<string, number>;
  collaborationAttribution?: string;
  governorTier?: "GREEN" | "YELLOW" | "RED" | "DENY";
  convertAim?: {
    domainId: string;
    successGate: string;
    origin?: string;
    output?: string;
    sourceDigest?: string;
    setAt?: string;
  };
};

export function appendTrajectoryRecord(input: AppendTrajectoryRecordInput): TrajectoryRecord {
  if (input.gate?.ok !== true && input.unverified !== true && input.role === "assistant") {
    throw new Error("assistant trajectory steps require gate.ok or unverified:true");
  }
  const record: TrajectoryRecord = {
    kind: WEB_LLM_TRAJECTORY_RECORD_KIND,
    schemaVersion: WEB_LLM_TRAJECTORY_SCHEMA_VERSION,
    sessionId: input.sessionId,
    step: input.step,
    ts: new Date().toISOString(),
    role: input.role,
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.toolName !== undefined ? { toolName: input.toolName } : {}),
    ...(input.toolInput !== undefined ? { toolInput: input.toolInput } : {}),
    ...(input.toolOutput !== undefined ? { toolOutput: input.toolOutput } : {}),
    ...(input.gate !== undefined ? { gate: input.gate } : {}),
    ...(input.artifacts !== undefined ? { artifacts: input.artifacts } : {}),
    ...(input.unverified !== undefined ? { unverified: input.unverified } : {}),
    ...(input.isTier !== undefined ? { isTier: input.isTier } : {}),
    ...(input.isRetrievalHit !== undefined ? { isRetrievalHit: input.isRetrievalHit } : {}),
    ...(input.skipLlm !== undefined ? { skipLlm: input.skipLlm } : {}),
    ...(input.domainId !== undefined ? { domainId: input.domainId } : {}),
    ...(input.isCacheOutcome !== undefined ? { isCacheOutcome: input.isCacheOutcome } : {}),
    ...(input.verifyCostMs !== undefined ? { verifyCostMs: input.verifyCostMs } : {}),
    ...(input.sourceDigest !== undefined ? { sourceDigest: input.sourceDigest } : {}),
    ...(input.nearMissDomainId !== undefined ? { nearMissDomainId: input.nearMissDomainId } : {}),
    ...(input.nearMissScore !== undefined ? { nearMissScore: input.nearMissScore } : {}),
    ...(input.nearMissFeatures !== undefined ? { nearMissFeatures: input.nearMissFeatures } : {}),
    ...(input.collaborationAttribution !== undefined
      ? { collaborationAttribution: input.collaborationAttribution }
      : {}),
    ...(input.governorTier !== undefined ? { governorTier: input.governorTier } : {}),
    ...(input.convertAim !== undefined ? { convertAim: input.convertAim } : {}),
  };
  mkdirSync(dirname(input.filePath), { recursive: true });
  appendFileSync(input.filePath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function summarizeTrajectoryFile(filePath: string) {
  const records = readTrajectoryRecords(filePath);
  return summarizeTrajectoryRecords(records);
}

/** Summarize only gates from one session (site-port ok must not inherit stale failures). */
export function summarizeTrajectorySession(filePath: string, sessionId: string) {
  const records = readTrajectoryRecords(filePath).filter((r) => r.sessionId === sessionId);
  return summarizeTrajectoryRecords(records, filePath);
}

function summarizeTrajectoryRecords(records: TrajectoryRecord[], filePath?: string) {
  const gates = records.filter((r) => r.gate).map((r) => r.gate);
  const gateOk = gates.filter((g) => g?.ok === true).length;
  return {
    filePath: filePath ?? null,
    recordCount: records.length,
    sessionId: records[0]?.sessionId ?? null,
    gateCount: gates.length,
    gateOk,
    gateFail: gates.length - gateOk,
    ok: records.length > 0 && gateFailCount(gates) === 0,
  };
}

/** @param {Array<TrajectoryGateResult | undefined>} gates */
function gateFailCount(gates: Array<TrajectoryGateResult | undefined>) {
  return gates.filter((g) => g && g.ok !== true).length;
}
