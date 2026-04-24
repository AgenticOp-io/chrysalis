/**
 * Opt-in repair proposer: OpenAI-compatible Chat Completions HTTP API.
 * Edits are JSON-only, validated against the module, and still subject to
 * full-corpus replay in `runVerifiedRepairLoop`.
 */

import { nodeId, type Module, type NodeBase, type NodeId } from "@chrysalis/webir";
import type { Edit } from "@chrysalis/rewrite";
import type { RepairProposeContext, RepairProposer } from "./types.js";

export interface HttpChatRepairProposerOptions {
  readonly fetchImpl: typeof fetch;
  readonly apiKey: string;
  /** Full URL to the chat completions endpoint (POST JSON). */
  readonly baseUrl?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  /** Max nodes in the neighbor catalog sent to the model. */
  readonly maxCatalogNodes?: number;
  /**
   * When true (default), request `response_format: json_object` (OpenAI-style).
   * Set false or `CHRYSALIS_REPAIR_LLM_JSON_MODE=0` for endpoints that reject it.
   */
  readonly useJsonResponseFormat?: boolean;
}

const DEFAULT_BASE = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_CATALOG = 80;

function summarizeDiff(ctx: RepairProposeContext): string {
  const o = ctx.failingOutcome;
  const d = o.diff;
  const lines = d.divergences.map(
    (x) => `${x.kind}: ${x.detail} (expected ${truncate(x.expected, 120)} vs actual ${truncate(x.actual, 120)})`,
  );
  return [
    `route: ${o.route}`,
    `bodySimilarity: ${d.bodySimilarity.toFixed(3)}`,
    ...lines,
  ].join("\n");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function nodeLabel(n: NodeBase): string {
  const o = n.origin;
  let loc: string;
  switch (o.kind) {
    case "php":
      loc = `${o.file}:${o.line}:${o.col}`;
      break;
    case "form":
      loc = `${o.file}:${o.fieldName}`;
      break;
    case "db":
      loc = o.column != null ? `${o.table}.${o.column}` : o.table;
      break;
    case "trace":
      loc = `${o.corpusId}/${o.frameId}`;
      break;
    case "synthetic":
      loc = o.reason;
      break;
  }
  return `${n.dialect} ${n.op} @ ${loc} operands=${n.operands.length}`;
}

function collectNeighborCatalog(
  mod: Module,
  seeds: readonly string[],
  maxNodes: number,
): ReadonlyArray<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();
  const q: NodeId[] = [];
  for (const s of seeds) {
    const nid = nodeId(s);
    if (mod.nodes.has(nid)) q.push(nid);
  }
  while (q.length > 0 && out.length < maxNodes) {
    const id = q.shift();
    if (id === undefined) break;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = mod.nodes.get(id);
    if (!n) continue;
    out.push({ id, label: nodeLabel(n) });
    for (const op of n.operands) {
      if (!seen.has(op) && mod.nodes.has(op)) q.push(op);
    }
  }
  return out;
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  const inner = m?.[1];
  return inner != null ? inner.trim() : t;
}

function parseProposerJson(text: string): unknown {
  const raw = stripCodeFence(text);
  return JSON.parse(raw) as unknown;
}

/** Parse model JSON (object with `edits` key) into validated `replaceOperand` edits. */
export function tryParseRepairEditsFromLlmJson(
  mod: Module,
  parsed: unknown,
): Edit[] | null {
  if (parsed === null) return null;
  if (typeof parsed !== "object" || parsed === null) return null;
  const edits = (parsed as { edits?: unknown }).edits;
  if (edits === undefined) return null;
  if (edits === null) return null;
  if (!Array.isArray(edits)) return null;
  const out: Edit[] = [];
  for (const item of edits) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (rec.kind !== "replaceOperand") continue;
    const nodeIdStr = typeof rec.nodeId === "string" ? rec.nodeId : "";
    const newOperandIdStr =
      typeof rec.newOperandId === "string" ? rec.newOperandId : "";
    const index =
      typeof rec.index === "number" && Number.isInteger(rec.index)
        ? rec.index
        : -1;
    if (nodeIdStr === "" || newOperandIdStr === "") continue;
    const hostId = nodeId(nodeIdStr);
    const replId = nodeId(newOperandIdStr);
    const node = mod.nodes.get(hostId);
    if (!node) continue;
    const target = mod.nodes.get(replId);
    if (!target) continue;
    if (index < 0 || index >= node.operands.length) continue;
    out.push({ kind: "replaceOperand", nodeId: hostId, index, newOperandId: replId });
  }
  return out.length > 0 ? out : null;
}

export function createHttpChatRepairProposer(
  opts: HttpChatRepairProposerOptions,
): RepairProposer {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  const model = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxCatalog = opts.maxCatalogNodes ?? DEFAULT_MAX_CATALOG;
  const useJsonResponseFormat = opts.useJsonResponseFormat !== false;

  return {
    async propose(ctx: RepairProposeContext): Promise<Edit[] | null> {
      const seeds = ctx.failingOutcome.attributedNodeIds ?? [];
      if (seeds.length === 0) return null;

      const catalog = collectNeighborCatalog(
        ctx.module,
        seeds,
        maxCatalog,
      );
      const userPayload = {
        summary: summarizeDiff(ctx),
        attributedNodeIds: seeds,
        neighborCatalog: catalog,
        instruction:
          "Return JSON only: {\"edits\":[{\"kind\":\"replaceOperand\",\"nodeId\":\"...\",\"index\":0,\"newOperandId\":\"...\"}]} or {\"edits\":null} to abstain. Only use node ids that exist in neighborCatalog or as operands of those nodes (all ids must appear in the module). At most one or two edits; prefer the smallest fix.",
      };

      const body: Record<string, unknown> = {
        model,
        temperature: 0,
        max_tokens: 1024,
        messages: [
          {
            role: "system" as const,
            content:
              "You are a WebIR repair assistant. Output a single JSON object with key \"edits\" only: either an array of replaceOperand objects or null. No prose, no markdown.",
          },
          {
            role: "user" as const,
            content: JSON.stringify(userPayload),
          },
        ],
      };
      if (useJsonResponseFormat) {
        body.response_format = { type: "json_object" };
      }

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await opts.fetchImpl(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`repair LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }
        const json = (await res.json()) as {
          choices?: ReadonlyArray<{ message?: { content?: string | null } }>;
        };
        const content = json.choices?.[0]?.message?.content;
        if (typeof content !== "string" || content.trim() === "") return null;
        let parsed: unknown;
        try {
          parsed = parseProposerJson(content);
        } catch {
          return null;
        }
        return tryParseRepairEditsFromLlmJson(ctx.module, parsed);
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * Reads `CHRYSALIS_REPAIR_LLM_API_KEY` (required),
 * optional `CHRYSALIS_REPAIR_LLM_BASE_URL`, `CHRYSALIS_REPAIR_LLM_MODEL`,
 * `CHRYSALIS_REPAIR_LLM_JSON_MODE` (`0` / `false` disables `response_format`).
 */
export function createHttpChatRepairProposerFromEnv(): RepairProposer {
  const apiKey = process.env.CHRYSALIS_REPAIR_LLM_API_KEY ?? "";
  if (apiKey === "") {
    throw new Error("CHRYSALIS_REPAIR_LLM_API_KEY is not set");
  }
  const jsonMode = process.env.CHRYSALIS_REPAIR_LLM_JSON_MODE ?? "";
  const useJsonResponseFormat =
    jsonMode !== "0" && jsonMode.toLowerCase() !== "false";
  return createHttpChatRepairProposer({
    fetchImpl: globalThis.fetch.bind(globalThis) as typeof fetch,
    apiKey,
    baseUrl: process.env.CHRYSALIS_REPAIR_LLM_BASE_URL ?? DEFAULT_BASE,
    model: process.env.CHRYSALIS_REPAIR_LLM_MODEL ?? DEFAULT_MODEL,
    useJsonResponseFormat,
  });
}
