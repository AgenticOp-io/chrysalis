import { basename, join } from "node:path";
import { logWebLlmSmokeGate } from "./gate-log.js";
import { evaluateVerifyGatePolicy } from "./policy.js";
import { createTrajectorySessionId } from "./trajectory.js";

export const SITE_PORT_REPORT_KIND = "chrysalis.site-port.v1";
export const SITE_PORT_REPORT_SCHEMA_VERSION = 1;

export const SITE_PORT_GATE_NAMES = {
  intelligence: "site-port:intelligence",
  ingest: "site-port:ingest",
  cwlExport: "site-port:cwl-export",
  uiAssets: "site-port:ui-assets",
  uiMarkup: "site-port:ui-markup",
  siteLoadBind: "site-port:site-load-bind",
  siteScaleMatrix: "site-port:site-scale-matrix",
  verify: "site-port:verify",
  dataset: "site-port:dataset-export",
} as const;

/** Origins that support in-process probe replay after CWL export. */
export const SITE_PORT_VERIFY_ORIGINS = new Set(["php", "javascript"]);

export type SitePortGateName = (typeof SITE_PORT_GATE_NAMES)[keyof typeof SITE_PORT_GATE_NAMES];

/** Default trajectory path for a site-port run (one JSONL per project slug). */
export function resolveSitePortTrajectoryPath(repoRoot: string, projectDir: string) {
  const fromEnv = process.env.CHRYSALIS_SITE_PORT_TRAJECTORY_PATH?.trim();
  if (fromEnv) return fromEnv;
  const slug = basename(projectDir).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return join(repoRoot, "reports/web-llm/site-port", `${slug}.jsonl`);
}

export type LogSitePortStepInput = {
  repoRoot: string;
  projectDir: string;
  gateName: SitePortGateName | string;
  ok: boolean;
  skip?: string;
  detail?: Record<string, unknown>;
  sessionId?: string;
  trajectoryPath?: string;
};

/** Append verify-gated trajectory records for each site-port pipeline step. */
export function logSitePortStep(input: LogSitePortStepInput) {
  const trajectoryPath =
    input.trajectoryPath ?? resolveSitePortTrajectoryPath(input.repoRoot, input.projectDir);
  const sessionId = input.sessionId ?? createTrajectorySessionId("site-port");
  return logWebLlmSmokeGate({
    repoRoot: input.repoRoot,
    gateName: input.gateName,
    ok: input.ok,
    ...(input.skip ? { skip: input.skip } : {}),
    ...(input.detail ? { detail: input.detail } : {}),
    sessionId,
    trajectoryPath,
    force: true,
  });
}

export type SitePortVerifyReplayInput = {
  ok: boolean;
  skip?: string | null;
  correctness?: number | null;
  holeCount?: number | null;
};

/** Map hub verify replay output to verify-gated trajectory policy. */
export function evaluateSitePortVerifyGate(input: SitePortVerifyReplayInput) {
  if (input.skip === "verify-disabled" || input.skip?.startsWith("origin-")) {
    return { ok: true, skipped: true, reason: input.skip };
  }
  if (input.skip === "no-corpus" || input.skip === "verify-deferred-v1") {
    return { ok: true, skipped: true, reason: input.skip };
  }
  const policy = evaluateVerifyGatePolicy({
    gateOk: input.ok === true,
    verifyCorrectness: input.correctness ?? 0,
  });
  return { ok: policy.ok === true, skipped: false, reason: policy.reasons.join(";") || null, policy };
}
