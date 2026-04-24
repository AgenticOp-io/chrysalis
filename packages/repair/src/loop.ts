import type { TraceCorpus } from "@chrysalis/oracle";
import { applyModuleEdits } from "@chrysalis/rewrite";
import { replayCorpus, type ReplayOptions, type TraceOutcome } from "@chrysalis/verify";
import type { VerifiedRepairLoopOptions, VerifiedRepairLoopResult } from "./types.js";

function allTracesPass(outcomes: ReadonlyArray<TraceOutcome>): boolean {
  return outcomes.every((o) => o.ok);
}

function pickFailure(
  outcomes: ReadonlyArray<TraceOutcome>,
  endpoint: string | undefined,
): TraceOutcome | undefined {
  const bad = outcomes.filter((o) => !o.ok);
  const scoped = endpoint ? bad.filter((o) => o.route === endpoint) : bad;
  return scoped[0];
}

/**
 * Drive a bounded repair loop: propose edits for one failing trace at a time,
 * accept a new module only if the entire corpus replays cleanly.
 */
export async function runVerifiedRepairLoop(
  opts: VerifiedRepairLoopOptions,
): Promise<VerifiedRepairLoopResult> {
  const replayFn = opts.replayCorpusImpl ?? replayCorpus;
  let module = opts.initialModule;
  let outcomes = await replayFn(opts.corpus, { ...opts.replayBase, module } as ReplayOptions);

  if (allTracesPass(outcomes)) {
    return {
      ok: true,
      module,
      finalOutcomes: outcomes,
      iterationsRun: 0,
      rejectedPatches: 0,
    };
  }

  let rejectedPatches = 0;
  let iterationsRun = 0;
  let proposerAbstained: boolean | undefined;

  for (let i = 1; i <= opts.maxIterations; i++) {
    const failure = pickFailure(outcomes, opts.endpoint);
    if (!failure) {
      return {
        ok: false,
        module,
        finalOutcomes: outcomes,
        iterationsRun,
        rejectedPatches,
        message:
          opts.endpoint != null
            ? `no failing traces for endpoint ${opts.endpoint} (others may still diverge)`
            : "no failing traces (unexpected)",
      };
    }

    const edits = await opts.proposer.propose({
      module,
      failingOutcome: failure,
      iteration: i,
    });
    iterationsRun = i;

    if (edits == null || edits.length === 0) {
      proposerAbstained = true;
      break;
    }

    let candidate: typeof module;
    try {
      candidate = applyModuleEdits(module, edits, {
        provenanceSource: "repair-pass",
        replaceOperandReason: (idx) =>
          `verified repair loop iteration ${i} (operand ${idx})`,
      });
    } catch (err) {
      rejectedPatches += 1;
      continue;
    }

    const nextOutcomes = await replayFn(opts.corpus, {
      ...opts.replayBase,
      module: candidate,
    } as ReplayOptions);

    if (allTracesPass(nextOutcomes)) {
      return {
        ok: true,
        module: candidate,
        finalOutcomes: nextOutcomes,
        iterationsRun,
        rejectedPatches,
      };
    }

    rejectedPatches += 1;
  }

  const last = await replayFn(opts.corpus, { ...opts.replayBase, module } as ReplayOptions);

  return {
    ok: false,
    module,
    finalOutcomes: last,
    iterationsRun,
    rejectedPatches,
    ...(proposerAbstained ? { proposerAbstained: true } : {}),
    message: proposerAbstained
      ? "repair proposer returned no edits"
      : `repair loop exhausted after ${iterationsRun} iteration(s); corpus still diverges`,
  };
}
