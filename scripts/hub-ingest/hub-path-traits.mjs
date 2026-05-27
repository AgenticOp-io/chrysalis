/**
 * Structured migration traits (pros/cons/risk) for hub path knowledge v2.
 * Evidence-backed fields only — no unproven language advocacy.
 */
import { hubGoldSuitesForPair } from "./hub-gold-manifest.mjs";
import { verifyTierForPair } from "./hub-route-grades.mjs";

/** @typedef {'low'|'medium'|'high'} RiskLevel */

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
export function canonicalWebIrPatternForPair(path) {
  if (path.origin === "cwl") return "cwl:module-route-handler";
  if (path.ingest.lane === "chrysalis-ingest") return "web.request.route + legacy-oracle-php";
  if (path.ingest.lane === "hub-cwl-direct") return "cwl:module-route-handler";
  if (path.ingest.lane === "hub-ast-lift") return "web.request.route + ast-literal-body";
  if (path.ingest.lane === "hub-pattern-lift") return "web.request.route + legacy:hub-lift-handler";
  if (path.ingest.lane === "hub-file-lift") return "web.request.route + legacy:hub-lift-asset";
  return "web.request.route";
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 * @returns {RiskLevel}
 */
export function riskLevelForPair(path) {
  const tier = path.verifyTier ?? verifyTierForPair(path.origin, path.output, path);
  if (tier === "oracle") return "low";
  if (tier === "structural") return "medium";
  if (tier === "scaffold-framework") return "medium";
  if (tier === "scaffold-native") return "high";
  return "high";
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 * @param {{ family?: string } | null} [originProfile]
 * @param {{ family?: string } | null} [outputProfile]
 */
export function idiomLossForPair(path, originProfile, outputProfile) {
  const origin = originProfile;
  const output = outputProfile;
  if (path.origin === path.output) return "none";
  if (origin?.family && origin.family === output?.family) return "low";
  if (path.ingest.lane === "hub-file-lift") return "high";
  if (path.ingest.lane === "hub-pattern-lift") return "medium";
  if (path.ingest.lane === "chrysalis-ingest" && ["hono", "fastify", "nextjs", "typescript"].includes(path.output))
    return "medium";
  if (path.emit.lane?.startsWith("hub-native-")) return "high";
  return "medium";
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
export function verifyExpectationForPair(path) {
  const tier = path.verifyTier ?? verifyTierForPair(path.origin, path.output, path);
  const suites = hubGoldSuitesForPair(path.origin, path.output);
  if (tier === "oracle") {
    return "Chrysalis ingest + oracle capture + chrysalis verify on PHP corpora (hub-php-oracle-smoke in CI).";
  }
  if (tier === "structural" && suites.length > 0) {
    return `Hub structural gold (${suites.length} suite(s)) + trace replay where enabled: ${suites.map((s) => s.id).join(", ")}.`;
  }
  if (tier === "scaffold-native") {
    return "Native emit skeleton only; record traces before claiming production parity.";
  }
  if (tier === "scaffold-framework") {
    return "Framework scaffold emit; promote with hub gold suites or contract-first WPTP compose.";
  }
  return "No verify lane; runnable scaffold or open — not production-ready.";
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
export function buildProsForPair(path) {
  /** @type {Array<{ id: string, text: string, evidence: string }>} */
  const pros = [
    {
      id: "pro-webir-spine",
      text: "Single WebIR spine preserves semantics and provenance across emit targets.",
      evidence: "DESIGN §3; all hub pairs use WebIR",
    },
  ];
  if (path.origin === "php") {
    pros.push({
      id: "pro-php-oracle",
      text: "Full @chrysalis/ingest plus behavioral oracle — deepest correctness lane in the matrix.",
      evidence: "verifyTier oracle; chrysalis-ingest lane",
    });
  }
  if (path.origin === "cwl") {
    pros.push({
      id: "pro-cwl-direct",
      text: "Lossless CWL authoring maps 1:1 to WebIR without regex lift.",
      evidence: "hub-cwl-direct ingest lane",
    });
  }
  const suites = hubGoldSuitesForPair(path.origin, path.output);
  if (suites.length > 0) {
    pros.push({
      id: "pro-hub-ci-gold",
      text: `${suites.length} hub CI gold suite(s) with structural and/or trace replay gates.`,
      evidence: suites.map((s) => s.id).join(", "),
    });
  }
  if (["hono", "fastify", "nextjs", "typescript"].includes(path.output)) {
    pros.push({
      id: "pro-ts-framework-emit",
      text: "Mature Chrysalis TS emit with injected ctx and effect-aware handlers.",
      evidence: `emit lane ${path.emit.lane}`,
    });
  }
  if (path.ingest.lane === "hub-ast-lift") {
    pros.push({
      id: "pro-ast-lift",
      text: "AST-based route extraction for literals and simple handler bodies.",
      evidence: path.ingest.lane,
    });
  }
  return pros;
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
export function buildConsForPair(path) {
  /** @type {Array<{ id: string, text: string, evidence: string }>} */
  const cons = [];
  const tier = path.verifyTier ?? verifyTierForPair(path.origin, path.output, path);
  if (tier.startsWith("scaffold")) {
    cons.push({
      id: "con-scaffold-verify",
      text: "Verify tier is scaffold — no trace-backed parity claimed in CI.",
      evidence: tier,
    });
  }
  if (path.ingest.lane === "hub-pattern-lift") {
    cons.push({
      id: "con-pattern-lift-bodies",
      text: "Pattern lift captures route shells; handler bodies often remain legacy holes.",
      evidence: "hub-pattern-lift",
    });
  }
  if (path.ingest.lane === "hub-file-lift") {
    cons.push({
      id: "con-file-lift-thin",
      text: "File lift produces synthetic GET routes without application logic.",
      evidence: "hub-file-lift",
    });
  }
  if (path.origin !== "php" && path.emit.lane === "chrysalis-emit") {
    cons.push({
      id: "con-no-php-ingest",
      text: "Cannot use @chrysalis/ingest emit lane from this origin.",
      evidence: path.emit.lane,
    });
  }
  if (path.verify.lanes.includes("none")) {
    cons.push({
      id: "con-no-verify",
      text: "No verify scripts registered — operators must add recorders before cutover.",
      evidence: "verify.lanes includes none",
    });
  }
  if (path.emit.lane === "hub-scaffold") {
    cons.push({
      id: "con-scaffold-fallback",
      text: "Emit falls back to hub scaffold with explicit hub:emit-scaffold-fallback hole.",
      evidence: path.emit.lane,
    });
  }
  if (cons.length === 0) {
    cons.push({
      id: "con-migration-effort",
      text: "Cross-ecosystem migration still requires staging, trace capture, and chimera cutover planning.",
      evidence: `${path.origin}→${path.output}`,
    });
  }
  return cons;
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 * @param {{ family?: string } | null} [originProfile]
 * @param {{ family?: string } | null} [outputProfile]
 */
export function buildPairTraits(path, originProfile, outputProfile) {
  return {
    riskLevel: riskLevelForPair(path),
    idiomLoss: idiomLossForPair(path, originProfile, outputProfile),
    verifyExpectation: verifyExpectationForPair(path),
    canonicalWebIrPattern: canonicalWebIrPatternForPair(path),
    pros: buildProsForPair(path),
    cons: buildConsForPair(path),
  };
}
