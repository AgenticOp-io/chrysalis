/** Verify-gated convert hole enrichment — HTTP chat when allowed, deterministic stub otherwise. */

import { mergeHoleClosureIntoPatchHint, type ConvertHoleRecord } from "./convert-hole-closure-hint.js";

export type ConvertHoleInput = ConvertHoleRecord;

export type ConvertHoleEnrichment = {
  hole: string;
  suggestion: string;
  patchHint: Record<string, unknown> | null;
  source: "llm" | "stub" | "skipped";
};

export type EnrichConvertHolesInput = {
  holes: ConvertHoleInput[];
  skipLlm: boolean;
  domainId?: string;
  tier?: string;
  fetchImpl?: typeof fetch;
};

export type EnrichConvertHolesResult = {
  enrichments: ConvertHoleEnrichment[];
  skipLlm: boolean;
  llmUsed: boolean;
};

const DEFAULT_BASE = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

function resolveConvertLlmApiKey(): string {
  return (
    process.env.CHRYSALIS_CONVERT_LLM_API_KEY?.trim() ??
    process.env.CHRYSALIS_REPAIR_LLM_API_KEY?.trim() ??
    ""
  );
}

function stubEnrichment(hole: ConvertHoleInput): ConvertHoleEnrichment {
  const name = hole.name ?? "legacy:unknown";
  const patchHint = mergeHoleClosureIntoPatchHint(null, hole);
  return {
    hole: name,
    suggestion: patchHint.kind === "hole-closure"
      ? `Hole ${patchHint.holeId} — complete WebIR replacement subgraph; verify then repair apply.`
      : `Review WebIR lowering for ${name}; add fixture or IR helper tier before apply.`,
    patchHint,
    source: "stub",
  };
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  const inner = m?.[1];
  return inner != null ? inner.trim() : t;
}

function parseEnrichments(parsed: unknown, holes: ConvertHoleInput[]): ConvertHoleEnrichment[] | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const proposals = (parsed as { proposals?: unknown }).proposals;
  if (!Array.isArray(proposals)) return null;
  const out: ConvertHoleEnrichment[] = [];
  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    if (!hole) continue;
    const row = proposals[i];
    if (typeof row !== "object" || row === null) {
      out.push(stubEnrichment(hole));
      continue;
    }
    const r = row as { suggestion?: unknown; patchHint?: unknown };
    out.push({
      hole: hole.name,
      suggestion: typeof r.suggestion === "string" ? r.suggestion : stubEnrichment(hole).suggestion,
      patchHint: mergeHoleClosureIntoPatchHint(
        typeof r.patchHint === "object" && r.patchHint !== null
          ? (r.patchHint as Record<string, unknown>)
          : null,
        hole,
      ),
      source: "llm",
    });
  }
  return out.length === holes.length ? out : null;
}

async function enrichWithHttpChat(
  input: EnrichConvertHolesInput,
  apiKey: string,
): Promise<ConvertHoleEnrichment[] | null> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const baseUrl = process.env.CHRYSALIS_CONVERT_LLM_BASE_URL?.trim() ?? process.env.CHRYSALIS_REPAIR_LLM_BASE_URL?.trim() ?? DEFAULT_BASE;
  const model = process.env.CHRYSALIS_CONVERT_LLM_MODEL?.trim() ?? process.env.CHRYSALIS_REPAIR_LLM_MODEL?.trim() ?? DEFAULT_MODEL;
  const holeLines = input.holes.map((h) => `- ${h.name}${h.detail ? `: ${h.detail}` : ""}`).join("\n");
  const system = [
    "You assist Chrysalis PHP→WebIR migration operators.",
    "Respond with JSON only: { \"proposals\": [ { \"suggestion\": string, \"patchHint\": object } ] }.",
    "One proposal per hole in order. patchHint must describe WebIR-safe scaffold steps — never raw string transpile.",
  ].join(" ");
  const user = [
    `Domain: ${input.domainId ?? "unknown"}`,
    `IS tier: ${input.tier ?? "unknown"}`,
    "Holes:",
    holeLines,
  ].join("\n");
  const jsonMode = process.env.CHRYSALIS_CONVERT_LLM_JSON_MODE ?? process.env.CHRYSALIS_REPAIR_LLM_JSON_MODE ?? "";
  const useJson = jsonMode !== "0" && jsonMode.toLowerCase() !== "false";
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
  };
  if (useJson) body.response_format = { type: "json_object" };

  const res = await fetchImpl(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") return null;
  try {
    const parsed = JSON.parse(stripCodeFence(content)) as unknown;
    return parseEnrichments(parsed, input.holes);
  } catch {
    return null;
  }
}

/** Enrich hole proposals with LLM or stub suggestions. Skips HTTP when skipLlm or no API key. */
export async function enrichConvertHoleProposals(input: EnrichConvertHolesInput): Promise<EnrichConvertHolesResult> {
  if (input.skipLlm === true || input.holes.length === 0) {
    return {
      enrichments: input.holes.map((h) => ({ ...stubEnrichment(h), source: "skipped" as const })),
      skipLlm: true,
      llmUsed: false,
    };
  }
  const apiKey = resolveConvertLlmApiKey();
  if (apiKey === "") {
    return {
      enrichments: input.holes.map(stubEnrichment),
      skipLlm: false,
      llmUsed: false,
    };
  }
  const fromLlm = await enrichWithHttpChat(input, apiKey);
  if (fromLlm) {
    return { enrichments: fromLlm, skipLlm: false, llmUsed: true };
  }
  return {
    enrichments: input.holes.map(stubEnrichment),
    skipLlm: false,
    llmUsed: false,
  };
}

export function convertLlmApiKeyConfigured(): boolean {
  return resolveConvertLlmApiKey() !== "";
}
