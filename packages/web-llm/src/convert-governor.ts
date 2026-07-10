/**
 * Hub convert / tool governor — STOP half (G9540 / D6375; MCP coverage G9570 / D6377).
 *
 * Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
 * GREEN / YELLOW / RED action classes; visible; jointly held.
 * Adapted to Chrysalis propose-only + verify-before-apply. Not a code port.
 */
import { CYNOENGINE_ATTRIBUTION } from "./shorthand-salience.js";
import { chrysalisAgentToolDefinitions } from "./tools.js";

export type ConvertGovernorTier = "GREEN" | "YELLOW" | "RED" | "DENY";

export type ConvertGovernorDecision = {
  tier: ConvertGovernorTier;
  action: string;
  allowed: boolean;
  requiresConfirm: boolean;
  requiresVerifyGreen: boolean;
  reason: string;
  attribution: typeof CYNOENGINE_ATTRIBUTION;
};

const GREEN = new Set([
  "chrysalis_status",
  "chrysalis_insight",
  "web_llm_resolve_shorthand",
  "web_llm_preferred_shorthand_tier",
  "web_llm_is_live_analytics",
  "web_llm_score_near_miss",
  "web_llm_build_benchmark",
  "web_llm_build_leaderboard",
  "hub_convert_is_routing",
  "hub_convert_govern_action",
  "hub_convert_evaluate_aim",
  "list_holes",
  "read_status",
]);

const YELLOW = new Set([
  "hub_convert_propose_holes",
  "hub_convert_llm_enrich",
  "web_llm_record_trajectory",
  "web_llm_export_shorthand",
  "web_llm_export_dataset",
  "web_llm_record_utility_outcome",
  "chrysalis_ingest",
  "write_proposals",
]);

const RED = new Set([
  "hub_convert_apply_holes",
  "hub_convert_verify_gate",
  "apply_patches",
  "deploy",
  "mutate_origin",
  "chrysalis_verify",
  "web_llm_demote_shorthand",
]);

const DENY = new Set(["rm_rf_root", "prod_ssh_unrestricted", "bypass_verify"]);

/**
 * Classify a convert/tool action into governor tier.
 * RED requires operator confirm + verify green before mutate.
 */
export function classifyConvertAction(action: string): ConvertGovernorDecision {
  const name = action.trim();
  const attribution = CYNOENGINE_ATTRIBUTION;

  if (DENY.has(name)) {
    return {
      tier: "DENY",
      action: name,
      allowed: false,
      requiresConfirm: false,
      requiresVerifyGreen: false,
      reason: "hard-deny — never auto-run",
      attribution,
    };
  }
  if (GREEN.has(name)) {
    return {
      tier: "GREEN",
      action: name,
      allowed: true,
      requiresConfirm: false,
      requiresVerifyGreen: false,
      reason: "read / resolve / analytics — auto-ok",
      attribution,
    };
  }
  if (YELLOW.has(name)) {
    return {
      tier: "YELLOW",
      action: name,
      allowed: true,
      requiresConfirm: false,
      requiresVerifyGreen: false,
      reason: "propose / enrich under .chrysalis — announce; verify still required before apply",
      attribution,
    };
  }
  if (RED.has(name)) {
    return {
      tier: "RED",
      action: name,
      allowed: true,
      requiresConfirm: true,
      requiresVerifyGreen: true,
      reason: "mutate / apply / verify-gated write — operator confirm + verify green",
      attribution,
    };
  }
  // Unknown → RED (fail closed toward human gate)
  return {
    tier: "RED",
    action: name,
    allowed: true,
    requiresConfirm: true,
    requiresVerifyGreen: true,
    reason: "unknown action — treat as RED (fail closed)",
    attribution,
  };
}

export type GovernConvertActionInput = {
  action: string;
  confirmApply?: boolean;
  verifyGatePass?: boolean;
};

/** Enforce governor: DENY blocked; RED needs confirm + verify green. */
export function governConvertAction(input: GovernConvertActionInput): ConvertGovernorDecision & {
  ok: boolean;
} {
  const decision = classifyConvertAction(input.action);
  if (decision.tier === "DENY" || decision.allowed === false) {
    return { ...decision, ok: false };
  }
  if (decision.tier === "RED") {
    const confirm = input.confirmApply === true;
    const verify = input.verifyGatePass === true;
    if (decision.requiresConfirm && !confirm) {
      return { ...decision, ok: false, reason: `${decision.reason} — missing confirmApply` };
    }
    if (decision.requiresVerifyGreen && !verify) {
      return { ...decision, ok: false, reason: `${decision.reason} — verify not green` };
    }
  }
  return { ...decision, ok: true };
}

/** Map every MCP agent tool to a governor tier (G9570 — full surface coverage). */
export function listGovernedAgentTools(): Array<{
  name: string;
  tier: ConvertGovernorTier;
  attribution: typeof CYNOENGINE_ATTRIBUTION;
}> {
  return chrysalisAgentToolDefinitions().map((t) => {
    const d = classifyConvertAction(t.name);
    return { name: t.name, tier: d.tier, attribution: CYNOENGINE_ATTRIBUTION };
  });
}

/** True when every known agent tool is classified (none left as unknown RED by omission). */
export function agentToolsGovernorCoverageOk(): boolean {
  const listed = listGovernedAgentTools();
  if (!listed.length) return false;
  for (const row of listed) {
    if (row.tier === "RED" && !RED.has(row.name) && !DENY.has(row.name)) {
      // Unknown tools fail closed as RED — coverage requires explicit classification
      return false;
    }
  }
  return listed.every((r) => GREEN.has(r.name) || YELLOW.has(r.name) || RED.has(r.name));
}
