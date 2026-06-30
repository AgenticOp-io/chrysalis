import { WEB_LLM_POC_REPORT_KIND, WEB_LLM_POC_REPORT_SCHEMA_VERSION } from "./kinds.js";
import { appendTrajectoryRecord, createTrajectorySessionId } from "./trajectory.js";
import { evaluateVerifyGatePolicy } from "./policy.js";
import { resolveWebLlmTrajectoryPath } from "./env.js";
import type { PocScenario } from "./poc-scenarios.js";
import { runPocCheck } from "./poc-checks.js";

export type PocToolRunner = (
  tool: string,
  toolInput?: Record<string, unknown>,
) => Promise<{ ok: boolean; stdout?: string; stderr?: string; detail?: unknown }>;

export type AgentPocScenarioResult = {
  id: string;
  title: string;
  ok: boolean;
  gateName: string;
  stepResults: Array<{ step: string; ok: boolean; skip?: string }>;
  sessionId: string;
};

export type AgentPocReport = {
  kind: typeof WEB_LLM_POC_REPORT_KIND;
  schemaVersion: number;
  generatedAt: string;
  ok: boolean;
  scenarioCount: number;
  passCount: number;
  scenarios: AgentPocScenarioResult[];
  demoUrl?: string;
};

export type RunAgentPocOptions = {
  repoRoot: string;
  scenarios: PocScenario[];
  runTool: PocToolRunner;
  trajectoryPath?: string;
  demoUrl?: string;
};

export async function runAgentPocScenario(
  scenario: PocScenario,
  opts: Pick<RunAgentPocOptions, "repoRoot" | "runTool" | "trajectoryPath">,
): Promise<AgentPocScenarioResult> {
  const trajectoryPath = opts.trajectoryPath ?? resolveWebLlmTrajectoryPath(opts.repoRoot, "poc/sessions.jsonl");
  const sessionId = createTrajectorySessionId(`poc-${scenario.id}`);
  let step = 1;
  /** @type {AgentPocScenarioResult["stepResults"]} */
  const stepResults = [];
  let allOk = true;

  appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: step++,
    role: "user",
    content: scenario.userPrompt,
  });

  for (const s of scenario.steps) {
    if (s.kind === "tool") {
      const result = await opts.runTool(s.tool, s.toolInput);
      const ok = result.ok === true;
      if (!ok) allOk = false;
      if (ok) {
        stepResults.push({ step: `tool:${s.tool}`, ok: true });
      } else {
        stepResults.push({ step: `tool:${s.tool}`, ok: false, skip: result.stderr?.slice(0, 120) ?? "tool-failed" });
      }
      appendTrajectoryRecord({
        filePath: trajectoryPath,
        sessionId,
        step: step++,
        role: "tool",
        toolName: s.tool,
        ...(s.toolInput ? { toolInput: s.toolInput } : {}),
        content: s.tool,
        ...(result.detail ?? result.stdout
          ? { toolOutput: result.detail ?? result.stdout?.slice(0, 500) }
          : {}),
        gate: { name: s.tool, ok },
      });
    } else {
      const check = await runPocCheck(s, opts.repoRoot);
      const ok = check.ok === true;
      if (!ok) allOk = false;
      if (ok) {
        stepResults.push({ step: `check:${s.check}`, ok: true });
      } else {
        stepResults.push({ step: `check:${s.check}`, ok: false, skip: check.skip ?? "check-failed" });
      }
      appendTrajectoryRecord({
        filePath: trajectoryPath,
        sessionId,
        step: step++,
        role: "tool",
        toolName: `check_${s.check}`,
        content: s.check,
        toolOutput: check.detail,
        gate: { name: s.check, ok },
      });
    }
  }

  const policy = evaluateVerifyGatePolicy({ gateOk: allOk });
  appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: step++,
    role: "assistant",
    content: allOk ? `${scenario.title}: all steps passed verify policy` : `${scenario.title}: failed`,
    gate: { name: scenario.gateName, ok: allOk, detail: { policy } },
  });

  return {
    id: scenario.id,
    title: scenario.title,
    ok: allOk && policy.ok,
    gateName: scenario.gateName,
    stepResults,
    sessionId,
  };
}

export async function runAgentPoc(opts: RunAgentPocOptions): Promise<AgentPocReport> {
  /** @type {AgentPocScenarioResult[]} */
  const scenarios = [];
  for (const scenario of opts.scenarios) {
    if (scenario.optional) continue;
    scenarios.push(await runAgentPocScenario(scenario, opts));
  }
  const passCount = scenarios.filter((s) => s.ok).length;
  const ok = passCount === scenarios.length && scenarios.length > 0;
  return {
    kind: WEB_LLM_POC_REPORT_KIND,
    schemaVersion: WEB_LLM_POC_REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ok,
    scenarioCount: scenarios.length,
    passCount,
    scenarios,
    ...(opts.demoUrl ? { demoUrl: opts.demoUrl } : {}),
  };
}
