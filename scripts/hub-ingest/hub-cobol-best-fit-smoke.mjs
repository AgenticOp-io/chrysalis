#!/usr/bin/env node
/**
 * COBOL best-fit prove — commercial migration targets after silver file-lift.
 * Origins: cobol (origin-only). Targets: java, csharp, python, go (+ hono control).
 * Gate: hub:cobol-best-fit-smoke
 */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { resolveGoldSuites } from "./hub-gold-manifest.mjs";

/** Best commercial depth targets for COBOL lift → WebIR → native emit. */
const BEST_FIT_TARGETS = ["java", "csharp", "python", "go"];
/** Web control emit (not a mainframe replacement target). */
const CONTROL_TARGETS = ["hono"];

/**
 * @param {string} emitTarget
 * @returns {string[]}
 */
function suiteIdsFor(emitTarget) {
  return [
    `cobol-structured-${emitTarget}-full`,
    `cobol-middleware-${emitTarget}-full`,
  ];
}

export async function runCobolBestFitSmoke() {
  const progress = createSmokeProgress("cobol-best-fit");
  const t0 = progress.start("COBOL best-fit gold verify");

  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const results = [];
  const targets = [...BEST_FIT_TARGETS, ...CONTROL_TARGETS];

  for (const emitTarget of targets) {
    for (const id of suiteIdsFor(emitTarget)) {
      const suites = resolveGoldSuites(id);
      if (!suites.length) {
        results.push({ id, ok: false, reason: "suite-missing" });
        continue;
      }
      const r = await runGoldVerifySuite(suites[0]);
      results.push({
        id,
        ok: r.ok === true,
        reason: r.ok === true ? undefined : r.reason ?? "verify-failed",
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const ok = failed.length === 0;
  progress.end("COBOL best-fit gold verify", ok, t0);

  return {
    kind: "chrysalis.hub.cobol-best-fit-smoke",
    schemaVersion: 1,
    ok,
    bestFitTargets: BEST_FIT_TARGETS,
    controlTargets: CONTROL_TARGETS,
    suiteCount: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.slice(0, 20),
    results,
    note:
      "COBOL silver file-lift → WebIR → best-fit native emits (fixture gold, not mainframe semantic AST)",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCobolBestFitSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cobol-best-fit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
