/**
 * @chrysalis/insight — pattern recognition over WebIR.
 *
 * Catalogs legacy anti-patterns (N+1 queries, scattered input validation,
 * string-based dispatch) and proposes typed, idiomatic replacements. Each
 * opportunity survives re-ingestion via its Locator and is consumed by:
 *
 *   - `chrysalis insight`: the human-facing catalog
 *   - `chrysalis status`: the migration dashboard summary
 *   - (M2) `@chrysalis/rewrite`: the trace-verified rewriter
 *
 * The key invariant is that recognizers are pure over the IR. They can be
 * re-run deterministically on any module produced by `@chrysalis/ingest`,
 * and their output is a projection — not a mutation — of that module.
 */

import { runInsight, type InsightReport, type RunInsightOptions } from "./framework.js";
import type { Module } from "@chrysalis/webir";
import { nPlusOneRecognizer } from "./recognizers/n-plus-one.js";
import { scatteredValidationRecognizer } from "./recognizers/scattered-validation.js";
import { stringDispatchRecognizer } from "./recognizers/string-dispatch.js";
import { unescapedOutputRecognizer } from "./recognizers/unescaped-output.js";
import { rawSqlConcatRecognizer } from "./recognizers/raw-sql-concat.js";
import type { Recognizer } from "./framework.js";

export {
  runInsight,
  canonicalSql,
  boostWithCorpus,
  type InsightReport,
  type Opportunity,
  type ProposedLift,
  type Recognizer,
  type RecognizerId,
  type RunInsightInput,
  type RunInsightOptions,
  type Severity,
} from "./framework.js";

export { nPlusOneRecognizer } from "./recognizers/n-plus-one.js";
export { scatteredValidationRecognizer } from "./recognizers/scattered-validation.js";
export {
  stringDispatchRecognizer,
  matchStringDispatchChain,
  type StringDispatchChainMatch,
} from "./recognizers/string-dispatch.js";
export { unescapedOutputRecognizer } from "./recognizers/unescaped-output.js";
export { rawSqlConcatRecognizer } from "./recognizers/raw-sql-concat.js";
export { computeTaint, SANITIZER_CALLS, type Taint, type TaintResult } from "./taint.js";

/**
 * The stock set of recognizers shipped with Chrysalis. Security-oriented
 * recognizers lead so they surface first in tabular output.
 */
export const DEFAULT_RECOGNIZERS: ReadonlyArray<Recognizer> = [
  rawSqlConcatRecognizer,
  unescapedOutputRecognizer,
  nPlusOneRecognizer,
  scatteredValidationRecognizer,
  stringDispatchRecognizer,
];

/** Run all default recognizers over `module`. Thin convenience wrapper. */
export function analyzeModule(
  module: Module,
  opts?: RunInsightOptions,
): InsightReport {
  return runInsight({
    module,
    recognizers: DEFAULT_RECOGNIZERS,
    ...(opts?.only ? { only: opts.only } : {}),
    ...(opts?.corpus ? { corpus: opts.corpus } : {}),
  });
}
