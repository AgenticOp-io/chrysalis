#!/usr/bin/env node
/**
 * Compare migration paths from one origin to multiple outputs.
 * Usage:
 *   node scripts/hub-ingest/hub-language-compare.mjs --origin python --outputs java,go,hono
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryPathKnowledge } from "./hub-path-knowledge.mjs";
import { describeTranslationPath } from "./hub-translation-paths.mjs";

export const HUB_LANGUAGE_COMPARE_KIND = "chrysalis.hub.language-compare";
export const HUB_LANGUAGE_COMPARE_SCHEMA_VERSION = 1;

const RISK_ORDER = { low: 0, medium: 1, high: 2 };

/**
 * @param {string} origin
 * @param {string[]} outputs
 */
export function compareHubLanguages(origin, outputs) {
  const candidates = [];
  for (const output of outputs) {
    if (output === origin) continue;
    const path = describeTranslationPath(origin, output);
    const q = queryPathKnowledge(origin, output);
    candidates.push({
      output,
      grade: path.grade,
      verifyTier: path.verifyTier,
      riskLevel: q.pair.riskLevel,
      idiomLoss: q.pair.idiomLoss,
      verifyExpectation: q.pair.verifyExpectation,
      canonicalWebIrPattern: q.pair.canonicalWebIrPattern,
      pros: q.pair.pros,
      cons: q.pair.cons,
      suiteCount: q.pair.bestPracticeIds?.length ?? 0,
      ingestLane: path.ingest.lane,
      emitLane: path.emit.lane,
      bestPracticeIds: q.pair.bestPracticeIds,
    });
  }
  candidates.sort((a, b) => {
    const ra = RISK_ORDER[a.riskLevel] ?? 9;
    const rb = RISK_ORDER[b.riskLevel] ?? 9;
    if (ra !== rb) return ra - rb;
    const ia = { low: 0, medium: 1, high: 2 }[a.idiomLoss] ?? 9;
    const ib = { low: 0, medium: 1, high: 2 }[b.idiomLoss] ?? 9;
    return ia - ib;
  });
  const recommended = candidates[0]?.output ?? null;
  return {
    kind: HUB_LANGUAGE_COMPARE_KIND,
    schemaVersion: HUB_LANGUAGE_COMPARE_SCHEMA_VERSION,
    origin,
    outputs,
    recommended,
    recommendationReason:
      recommended != null
        ? `Lowest combined risk (${candidates[0].riskLevel}) and idiom loss (${candidates[0].idiomLoss}) among compared outputs.`
        : null,
    candidates,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let origin = null;
  let outputs = [];
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--outputs" && argv[i + 1]) {
      outputs = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  if (!origin || outputs.length === 0) {
    throw new Error("usage: hub-language-compare.mjs --origin <lang> --outputs a,b,c [--json-out path]");
  }
  return { origin, outputs, jsonOut };
}

async function main() {
  const { origin, outputs, jsonOut } = parseArgs(process.argv);
  const report = compareHubLanguages(origin, outputs);
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
