/**
 * Translation Hub path model: how every origin×output pair moves through
 * ingest → WebIR → emit → verify (and contract-first alternates).
 *
 * Single source for path-matrix JSON, readiness pair enrichment, and docs.
 */
import {
  HUB_ROUTES,
  INPUT_LANGUAGES,
  OUTPUT_LANGUAGES,
  resolveHubRoute,
} from "../chrysalis-hub-store.mjs";
import { PATTERN_LIFT_LANGUAGE_IDS } from "./pattern-route-parsers.mjs";

export const HUB_PATH_MATRIX_KIND = "chrysalis.translation-hub.path-matrix";
export const HUB_PATH_MATRIX_SCHEMA_VERSION = 1;

/** Ingest lanes (how source code enters WebIR). */
export const HUB_INGEST_LANES = [
  "chrysalis-ingest",
  "hub-cwl-direct", // Chrysalis Web Language — direct WebIR (G32)
  "hub-ast-lift",
  "hub-pattern-lift",
  "hub-file-lift",
  "none",
];

/** Emit lanes (how WebIR leaves the hub). */
export const HUB_EMIT_LANES = [
  "chrysalis-emit",
  "hub-cwl-emit",
  "hub-webir-typescript",
  "hub-native-python",
  "hub-native-java",
  "hub-native-go",
  "hub-native-ruby",
  "hub-native-csharp",
  "hub-native-rust",
  "hub-native-kotlin",
  "hub-native-scala",
  "hub-native-swift",
  "hub-scaffold",
  "wptp-compose",
];

/** Verify / correctness lanes (what proves a pair). */
export const HUB_VERIFY_LANES = [
  "legacy-oracle-php",
  "hub-structural-gold",
  "hub-trace-replay",
  "wptp-contract",
  "none",
];

const FILE_LIFT_ORIGIN_IDS = new Set([
  "sql",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
  "c",
  "cpp",
  "cobol",
]);

const AST_LIFT_ORIGIN_IDS = new Set(["javascript", "typescript", "python", "java", "go"]);

const NATIVE_EMIT_BY_OUTPUT = {
  cwl: "hub-cwl-emit",
  python: "hub-native-python",
  java: "hub-native-java",
  go: "hub-native-go",
  ruby: "hub-native-ruby",
  csharp: "hub-native-csharp",
  rust: "hub-native-rust",
  kotlin: "hub-native-kotlin",
  scala: "hub-native-scala",
  swift: "hub-native-swift",
};

const NATIVE_EMIT_SCRIPT = {
  python: "emit-python-from-hub.mjs",
  java: "emit-java-from-hub.mjs",
  go: "emit-go-from-hub.mjs",
  ruby: "emit-ruby-from-hub.mjs",
  csharp: "emit-csharp-from-hub.mjs",
  rust: "emit-rust-from-hub.mjs",
  kotlin: "emit-kotlin-from-hub.mjs",
  scala: "emit-scala-from-hub.mjs",
  swift: "emit-swift-from-hub.mjs",
  cwl: "emit-cwl-from-hub.mjs",
};

const AST_INGEST_SCRIPT = {
  javascript: "javascript-ast-ingest.mjs",
  typescript: "javascript-ast-ingest.mjs",
  python: "python-ast-ingest.mjs",
  java: "java-ast-ingest.mjs",
  go: "go-ast-ingest.mjs",
};

const FRAMEWORK_OUTPUTS = new Set(["hono", "fastify", "nextjs", "typescript"]);

/**
 * @param {string} origin
 * @returns {string}
 */
export function ingestLaneForOrigin(origin) {
  if (origin === "cwl") return "hub-cwl-direct";
  if (origin === "php") return "chrysalis-ingest";
  if (AST_LIFT_ORIGIN_IDS.has(origin)) return "hub-ast-lift";
  if (PATTERN_LIFT_LANGUAGE_IDS.includes(origin)) return "hub-pattern-lift";
  if (FILE_LIFT_ORIGIN_IDS.has(origin)) return "hub-file-lift";
  return "none";
}

/**
 * @param {string} output
 * @param {{ action?: string, emitTarget?: string | null }} route
 * @returns {string}
 */
export function emitLaneForOutput(output, route) {
  if (route.action === "chrysalis-ingest-emit") return "chrysalis-emit";
  if (output === "cwl") return "hub-cwl-emit";
  if (NATIVE_EMIT_BY_OUTPUT[output]) return NATIVE_EMIT_BY_OUTPUT[output];
  if (FRAMEWORK_OUTPUTS.has(output)) return "hub-webir-typescript";
  return "hub-scaffold";
}

/**
 * @param {string} origin
 * @param {string} output
 * @param {string} grade
 * @returns {string[]}
 */
export function verifyLanesForPair(origin, output, grade) {
  const lanes = [];
  if (
    origin === "php" &&
    grade === "gold" &&
    (output === "typescript" || output === "hono" || output === "fastify")
  ) {
    lanes.push("legacy-oracle-php");
  }
  if (
    (origin === "cwl" ||
      origin === "javascript" ||
      origin === "typescript" ||
      origin === "python") &&
    grade === "gold" &&
    (output === "typescript" || output === "hono" || output === "fastify" || output === "cwl")
  ) {
    lanes.push("hub-structural-gold");
    if (output === "hono" || output === "fastify") lanes.push("hub-trace-replay");
  }
  if (lanes.length === 0) lanes.push("none");
  return lanes;
}

function contractAlternate(origin, output) {
  if (!FRAMEWORK_OUTPUTS.has(output) && output !== "nextjs") return null;
  return {
    id: "contract-first-wptp",
    when: "Site tree contains OpenAPI/Swagger or HAR (discoverContractArtifacts).",
    ingestLane: "none",
    emitLane: "wptp-compose",
    verifyLane: "wptp-contract",
    scripts: ["wptp-compose-site.mjs", "wptp-emit-pipeline.mjs"],
    note: `Skips native ${origin} ingest; composes from contract IR (G20). Any origin eligible.`,
  };
}

/**
 * Ordered pipeline steps for operators and agents.
 * @param {string} origin
 * @param {string} output
 * @param {{ action?: string, grade?: string, emitTarget?: string | null }} route
 * @param {string} ingestLane
 * @param {string} emitLane
 * @returns {Array<{ phase: string, id: string, script?: string, package?: string }>}
 */
function buildSteps(origin, output, route, ingestLane, emitLane) {
  const steps = [];
  const target = route.emitTarget ?? (output === "typescript" ? "hono" : output);

  if (ingestLane === "hub-cwl-direct") {
    steps.push({
      phase: "ingest",
      id: "hub-cwl-direct",
      script: "cwl-ingest.mjs",
    });
  } else if (ingestLane === "chrysalis-ingest") {
    steps.push({
      phase: "capture",
      id: "oracle-php-capture",
      script: "packages/oracle-php (auto_prepend on origin staging)",
      package: "oracle-php",
    });
    steps.push({
      phase: "ingest",
      id: "chrysalis-ingest",
      script: "chrysalis ingest",
      package: "@chrysalis/ingest",
    });
  } else if (ingestLane === "hub-ast-lift") {
    steps.push({
      phase: "lift",
      id: "hub-ast-lift",
      script: AST_INGEST_SCRIPT[origin] ?? "lift-to-webir.mjs",
    });
  } else if (ingestLane === "hub-pattern-lift") {
    steps.push({
      phase: "lift",
      id: "hub-pattern-lift",
      script: "pattern-route-lift.mjs",
    });
  } else if (ingestLane === "hub-file-lift") {
    steps.push({
      phase: "lift",
      id: "hub-file-lift",
      script: "lift-to-webir.mjs (per-file GET route)",
    });
  }

  if (ingestLane !== "chrysalis-ingest" && ingestLane !== "none") {
    steps.push({ phase: "ir", id: "webir-module", script: "hub WebIR module in project .chrysalis/" });
  }

  if (emitLane === "chrysalis-emit") {
    steps.push({
      phase: "emit",
      id: "chrysalis-emit",
      script: `chrysalis emit --target ${target}`,
      package: "@chrysalis/emit",
    });
    steps.push({
      phase: "verify",
      id: "chrysalis-verify",
      script: "chrysalis verify",
      package: "@chrysalis/verify",
    });
  } else if (emitLane === "hub-webir-typescript") {
    const emitScript =
      output === "nextjs" ? "emit-nextjs-from-hub.mjs" : "emit-from-hub.mjs";
    steps.push({
      phase: "emit",
      id: "hub-webir-ts",
      script: `${emitScript} --target ${target === "typescript" ? "hono" : target}`,
    });
  } else if (emitLane === "hub-cwl-emit") {
    steps.push({
      phase: "emit",
      id: "hub-cwl-emit",
      script: "emit-cwl-from-hub.mjs",
    });
  } else if (NATIVE_EMIT_BY_OUTPUT[output]) {
    steps.push({
      phase: "emit",
      id: emitLane,
      script: NATIVE_EMIT_SCRIPT[output],
    });
  } else {
    steps.push({
      phase: "emit",
      id: "hub-scaffold",
      script: "wptp-emit-pipeline.mjs (scaffold fallback hole hub:emit-scaffold-fallback)",
    });
  }

  return steps;
}

function prerequisitesForPair(origin, output, ingestLane, emitLane, grade) {
  const pre = [];
  if (ingestLane === "chrysalis-ingest") {
    pre.push("PHP 8+ on PATH; parser-bridge vendor; optional oracle capture on origin.");
  }
  if (ingestLane === "hub-ast-lift" && origin === "python") {
    pre.push("python3 on PATH (CHRYSALIS_HUB_PYTHON override).");
  }
  if (ingestLane === "hub-ast-lift" && (origin === "javascript" || origin === "typescript")) {
    pre.push("Node 20+; acorn parse of .js/.ts route files.");
  }
  if (emitLane === "hub-webir-typescript" && (output === "hono" || output === "fastify")) {
    pre.push("Lifted routes in WebIR; npm install in generated/ before runtime smoke.");
  }
  if (emitLane === "wptp-compose" || output === "nextjs") {
    pre.push("Optional wptp-matrix sibling; OpenAPI/HAR in site tree for contract-first.");
  }
  if (grade === "gold" && origin !== "php") {
    pre.push(`CI gate: hub-gold-verify and/or hub-gold-trace-replay for ${origin}→${output}.`);
  }
  if (grade !== "gold") {
    pre.push("Unsupported handler bodies remain explicit holes (no silent best-effort).");
  }
  return pre;
}

function promoteToGoldHints(origin, output, grade, verifyLanes) {
  if (grade === "gold") return [];
  const hints = [];
  if (origin === "php") {
    hints.push("Close scaffold gaps; add verify corpus; tighten emit for PHP→output.");
    return hints;
  }
  if (verifyLanes.includes("none")) {
    hints.push(`Add trace-backed verify for ${origin} (recorder + replay contract), not a second @chrysalis/ingest clone.`);
  }
  if (origin !== "php" && FRAMEWORK_OUTPUTS.has(output)) {
    hints.push("Widen literal/structural lowering; extend hub-gold-trace-replay beyond literal fixture.");
  }
  if (!NATIVE_EMIT_BY_OUTPUT[output] && !FRAMEWORK_OUTPUTS.has(output)) {
    hints.push(`Implement hub-native or WPTP emitter for ${output}, then hub-completion CI.`);
  }
  return hints;
}

/**
 * Full path description for one origin×output pair.
 * @param {string} origin
 * @param {string} output
 */
export function describeTranslationPath(origin, output) {
  const route = resolveHubRoute(origin, output);
  const spec = HUB_ROUTES[`${origin}:${output}`];
  const grade = route.grade ?? spec?.grade ?? "open";
  const ingestLane = ingestLaneForOrigin(origin);
  const emitLane = emitLaneForOutput(output, route);
  const verifyLanes = verifyLanesForPair(origin, output, grade);
  const alternate = contractAlternate(origin, output);

  return {
    origin,
    output,
    grade,
    runnable: Boolean(route.ok),
    action: route.action ?? spec?.action ?? "hub-translate",
    label: route.label ?? spec?.label,
    ingest: {
      lane: ingestLane,
      primaryScript:
        ingestLane === "hub-cwl-direct"
          ? "cwl-ingest.mjs"
          : ingestLane === "chrysalis-ingest"
          ? "@chrysalis/ingest via chrysalis CLI"
          : ingestLane === "hub-ast-lift"
            ? AST_INGEST_SCRIPT[origin] ?? "lift-to-webir.mjs"
            : ingestLane === "hub-pattern-lift"
              ? "pattern-route-lift.mjs"
              : ingestLane === "hub-file-lift"
                ? "lift-to-webir.mjs"
                : null,
      dispatcher: "hub-lift-dispatch.mjs → trySpecializedHubLift",
    },
    ir: { format: "webir", role: "canonical hub IR between all lanes" },
    emit: {
      lane: emitLane,
      target: route.emitTarget ?? null,
      primaryScript:
        emitLane === "chrysalis-emit"
          ? "chrysalis emit"
          : emitLane === "hub-webir-typescript"
            ? output === "nextjs"
              ? "emit-nextjs-from-hub.mjs"
              : "emit-from-hub.mjs"
            : NATIVE_EMIT_SCRIPT[output] ?? "wptp-emit-pipeline.mjs",
    },
    verify: {
      lanes: verifyLanes,
      ciScripts: verifyLanes.includes("legacy-oracle-php")
        ? ["chrysalis verify", "verify-tiny-blog", "verify-flagship-*"]
        : verifyLanes.includes("hub-structural-gold")
          ? ["hub-gold-verify.mjs"]
          : verifyLanes.includes("hub-trace-replay")
            ? ["hub-gold-trace-replay.mjs"]
            : [],
    },
    alternates: alternate ? [alternate] : [],
    steps: buildSteps(origin, output, route, ingestLane, emitLane),
    prerequisites: prerequisitesForPair(origin, output, ingestLane, emitLane, grade),
    promoteToGold: promoteToGoldHints(origin, output, grade, verifyLanes),
  };
}

function summarizePairs(pairs) {
  const byGrade = { gold: 0, silver: 0, open: 0 };
  const byIngestLane = Object.fromEntries(HUB_INGEST_LANES.map((l) => [l, 0]));
  const byEmitLane = Object.fromEntries(HUB_EMIT_LANES.map((l) => [l, 0]));
  const byVerifyLane = Object.fromEntries(HUB_VERIFY_LANES.map((l) => [l, 0]));

  for (const p of pairs) {
    byGrade[p.grade] = (byGrade[p.grade] ?? 0) + 1;
    byIngestLane[p.ingest.lane] = (byIngestLane[p.ingest.lane] ?? 0) + 1;
    byEmitLane[p.emit.lane] = (byEmitLane[p.emit.lane] ?? 0) + 1;
    for (const v of p.verify.lanes) {
      byVerifyLane[v] = (byVerifyLane[v] ?? 0) + 1;
    }
  }

  return { byGrade, byIngestLane, byEmitLane, byVerifyLane };
}

/**
 * Full origin×output path matrix (all hub routes).
 * @param {{ origin?: string, output?: string }} [filter]
 */
export function buildHubTranslationPathMatrix(filter = {}) {
  const pairs = [];
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      if (filter.origin && src.id !== filter.origin) continue;
      if (filter.output && out.id !== filter.output) continue;
      pairs.push(describeTranslationPath(src.id, out.id));
    }
  }

  const originLanes = Object.fromEntries(
    INPUT_LANGUAGES.map((l) => [l.id, ingestLaneForOrigin(l.id)]),
  );

  return {
    kind: HUB_PATH_MATRIX_KIND,
    schemaVersion: HUB_PATH_MATRIX_SCHEMA_VERSION,
    laneCatalog: {
      ingest: HUB_INGEST_LANES,
      emit: HUB_EMIT_LANES,
      verify: HUB_VERIFY_LANES,
      ir: ["webir"],
    },
    originIngestLanes: originLanes,
    pairCount: pairs.length,
    pairs,
    summary: summarizePairs(pairs),
    generatedAt: new Date().toISOString(),
  };
}
