/**
 * Aim persistence for convert / agent loops (G9550 / D6375; cycle gate G9580 / D6377).
 *
 * Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
 * contentless "proceed" must not hijack the loop; gate drive on a real aim.
 * Adapted to hub convert trajectories. Not a code port.
 */
import { CYNOENGINE_ATTRIBUTION } from "./shorthand-salience.js";
import { governConvertAction, type ConvertGovernorDecision } from "./convert-governor.js";

export type ConvertAim = {
  domainId: string;
  /** What success looks like (e.g. verify-green, proposals-ready). */
  successGate: string;
  origin?: string;
  output?: string;
  sourceDigest?: string;
  setAt: string;
  attribution: typeof CYNOENGINE_ATTRIBUTION;
};

export type AimDriveDecision = {
  ok: boolean;
  stall: boolean;
  reason: string;
  aim: ConvertAim | null;
  attribution: typeof CYNOENGINE_ATTRIBUTION;
};

const CONTENTLESS = new Set([
  "",
  "y",
  "yes",
  "ok",
  "proceed",
  "continue",
  "go",
  "next",
  "...",
]);

/** True when nudge has no concrete task content. */
export function isContentlessNudge(text: string | undefined | null): boolean {
  if (text == null) return true;
  const t = text.trim().toLowerCase();
  if (CONTENTLESS.has(t)) return true;
  if (t.length < 3) return true;
  return false;
}

export function createConvertAim(input: {
  domainId: string;
  successGate: string;
  origin?: string;
  output?: string;
  sourceDigest?: string;
}): ConvertAim {
  return {
    domainId: input.domainId.trim(),
    successGate: input.successGate.trim() || "verify-green",
    ...(input.origin != null ? { origin: input.origin } : {}),
    ...(input.output != null ? { output: input.output } : {}),
    ...(input.sourceDigest != null ? { sourceDigest: input.sourceDigest } : {}),
    setAt: new Date().toISOString(),
    attribution: CYNOENGINE_ATTRIBUTION,
  };
}

/**
 * Gate auto-cycle start:
 * - No aim + contentless nudge → stall
 * - No aim + concrete nudge still needs explicit aim fields (domainId + successGate)
 * - Aim present + contentless → continue that aim (ok)
 * - Aim present + concrete → ok
 */
export function evaluateAimDrive(input: {
  aim: ConvertAim | null | undefined;
  nudge?: string;
}): AimDriveDecision {
  const attribution = CYNOENGINE_ATTRIBUTION;
  const aim = input.aim ?? null;
  const hasAim = Boolean(aim?.domainId?.trim() && aim?.successGate?.trim());

  if (!hasAim) {
    if (isContentlessNudge(input.nudge)) {
      return {
        ok: false,
        stall: true,
        reason: "no aim — refuse contentless nudge (CynoEngine aim-gated drive)",
        aim: null,
        attribution,
      };
    }
    return {
      ok: false,
      stall: true,
      reason: "missing domainId + successGate aim before auto-cycle",
      aim: null,
      attribution,
    };
  }

  if (isContentlessNudge(input.nudge)) {
    return {
      ok: true,
      stall: false,
      reason: "continue persisted aim",
      aim,
      attribution,
    };
  }

  return {
    ok: true,
    stall: false,
    reason: "aim held",
    aim,
    attribution,
  };
}

/** After a round: stall if neither advance nor verify. */
export function shouldStallAfterRound(input: {
  aim: ConvertAim | null | undefined;
  advancedAim: boolean;
  ranVerify: boolean;
}): AimDriveDecision {
  const attribution = CYNOENGINE_ATTRIBUTION;
  if (!input.aim?.domainId) {
    return {
      ok: false,
      stall: true,
      reason: "no aim",
      aim: null,
      attribution,
    };
  }
  if (!input.advancedAim && !input.ranVerify) {
    return {
      ok: false,
      stall: true,
      reason: "round neither advanced aim nor verified — stall to human",
      aim: input.aim,
      attribution,
    };
  }
  return {
    ok: true,
    stall: false,
    reason: "progress",
    aim: input.aim,
    attribution,
  };
}

export type GateConvertCycleInput = {
  aim: ConvertAim | null | undefined;
  nudge?: string;
  /** Tool about to run (governor). */
  action: string;
  confirmApply?: boolean;
  verifyGatePass?: boolean;
  /** After a round: whether aim advanced / verify ran. */
  advancedAim?: boolean;
  ranVerify?: boolean;
  checkRoundStall?: boolean;
};

export type GateConvertCycleResult = {
  ok: boolean;
  stall: boolean;
  reason: string;
  aim: ConvertAim | null;
  governor: ConvertGovernorDecision & { ok: boolean };
  attribution: typeof CYNOENGINE_ATTRIBUTION;
};

/**
 * Combined aim + governor gate for hub convert / agent loops (G9580 / D6377).
 * Inspired by CynoEngine — refuse contentless proceed; STOP half visible.
 */
export function gateConvertCycle(input: GateConvertCycleInput): GateConvertCycleResult {
  const attribution = CYNOENGINE_ATTRIBUTION;
  const aimDrive = evaluateAimDrive({
    aim: input.aim,
    ...(input.nudge !== undefined ? { nudge: input.nudge } : {}),
  });
  const governArgs = {
    action: input.action,
    ...(input.confirmApply !== undefined ? { confirmApply: input.confirmApply } : {}),
    ...(input.verifyGatePass !== undefined ? { verifyGatePass: input.verifyGatePass } : {}),
  };
  if (!aimDrive.ok || aimDrive.stall) {
    const governor = governConvertAction(governArgs);
    return {
      ok: false,
      stall: true,
      reason: aimDrive.reason,
      aim: aimDrive.aim,
      governor,
      attribution,
    };
  }

  if (input.checkRoundStall === true) {
    const round = shouldStallAfterRound({
      aim: aimDrive.aim,
      advancedAim: input.advancedAim === true,
      ranVerify: input.ranVerify === true,
    });
    if (round.stall) {
      const governor = governConvertAction(governArgs);
      return {
        ok: false,
        stall: true,
        reason: round.reason,
        aim: round.aim,
        governor,
        attribution,
      };
    }
  }

  const governor = governConvertAction(governArgs);
  if (!governor.ok) {
    return {
      ok: false,
      stall: governor.tier === "DENY",
      reason: governor.reason,
      aim: aimDrive.aim,
      governor,
      attribution,
    };
  }

  return {
    ok: true,
    stall: false,
    reason: "aim held + governor ok",
    aim: aimDrive.aim,
    governor,
    attribution,
  };
}
