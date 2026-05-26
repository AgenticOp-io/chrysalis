/**
 * Hub matrix grade finalization: every runnable pair is gold; verify depth is tracked separately.
 */
import { hubGoldSuitesForPair } from "./hub-gold-manifest.mjs";

/**
 * @param {string} sourceLang
 * @param {string} outputLang
 * @param {{ action?: string, emitTarget?: string | null, status?: string }} spec
 * @returns {"oracle"|"structural"|"scaffold-framework"|"scaffold-native"|"scaffold-asset"}
 */
export function verifyTierForPair(sourceLang, outputLang, spec) {
  if (spec.action === "chrysalis-ingest-emit") return "oracle";
  if (hubGoldSuitesForPair(sourceLang, outputLang).length > 0) return "structural";
  const frameworkOut =
    outputLang === "hono" ||
    outputLang === "fastify" ||
    outputLang === "nextjs" ||
    outputLang === "typescript" ||
    outputLang === "cwl";
  if (frameworkOut && spec.emitTarget) return "scaffold-framework";
  const nativeOut = new Set([
    "python",
    "java",
    "go",
    "ruby",
    "csharp",
    "rust",
    "kotlin",
    "scala",
    "swift",
  ]);
  if (nativeOut.has(outputLang)) return "scaffold-native";
  return "scaffold-asset";
}

/**
 * @param {string} sourceLang
 * @param {string} outputLang
 * @param {Record<string, unknown>} spec
 */
export function finalizeHubRouteSpec(sourceLang, outputLang, spec) {
  const verifyTier = verifyTierForPair(sourceLang, outputLang, spec);
  return {
    ...spec,
    grade: "gold",
    verifyTier,
  };
}
