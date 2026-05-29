/**
 * Translation Hub job runners — invoke hub-translate or Chrysalis CLI steps.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { resolveHubRoute } from "./chrysalis-hub-store.mjs";

/** Build sequential job steps for a hub runnable row. */
export function hubJobSteps(repo, cliBin, projectDir, runnable, progressFile) {
  const progress = progressFile ?? join(projectDir, ".chrysalis", "ingest.progress");
  const steps = [];
  const resolved = resolveHubRoute(runnable.sourceLang, runnable.targetId);
  const action = runnable.action ?? resolved.action;
  const emitTarget = runnable.emitTarget ?? resolved.emitTarget;
  const origin = runnable.sourceLang;
  const output = runnable.targetId;

  if (action === "hub-translate") {
    steps.push({
      kind: "hub-translate",
      execPath: process.execPath,
      argv: [
        join(repo, "scripts/hub-ingest/hub-translate.mjs"),
        projectDir,
        "--origin",
        origin,
        "--output",
        output,
        "--cli",
        cliBin,
      ],
    });
    return steps;
  }

  if (action === "chrysalis-ingest") {
    steps.push({
      kind: "ingest",
      execPath: process.execPath,
      argv: [cliBin, "ingest", projectDir, "--ingest-progress-file", progress],
    });
    return steps;
  }

  if (action === "chrysalis-ingest-emit") {
    const target = emitTarget ?? "hono";
    const out = join(projectDir, "generated", target);
    if (output === "nextjs" && origin === "php") {
      steps.push({
        kind: "hub-translate",
        execPath: process.execPath,
        argv: [
          join(repo, "scripts/hub-ingest/hub-translate.mjs"),
          projectDir,
          "--origin",
          "php",
          "--output",
          "nextjs",
          "--cli",
          cliBin,
        ],
      });
      return steps;
    }
    steps.push({
      kind: "ingest",
      execPath: process.execPath,
      argv: [cliBin, "ingest", projectDir, "--ingest-progress-file", progress],
    });
    steps.push({
      kind: "emit",
      execPath: process.execPath,
      argv: [cliBin, "emit", projectDir, "--out", out, "--target", target],
    });
    if (process.env.CHRYSALIS_HUB_VERIFY_GATE !== "0") {
      steps.push({
        kind: "hub-evidence-gate",
        execPath: process.execPath,
        argv: [
          join(repo, "scripts/hub-ingest/hub-evidence.mjs"),
          "--project",
          projectDir,
          "--record-snapshot",
        ],
      });
    }
    return steps;
  }

  throw new Error(`unsupported hub action: ${action}`);
}

export function runJobSteps(steps, repo, hooks) {
  let index = 0;
  const runNext = () => {
    if (index >= steps.length) {
      hooks.onDone(0);
      return;
    }
    const step = steps[index++];
    hooks.onStepStart(step);
    const child = spawn(step.execPath, step.argv, {
      cwd: repo,
      env: { ...process.env, NO_COLOR: "1", CHRYSALIS_HUB_PREFER_WPTP: process.env.CHRYSALIS_HUB_PREFER_WPTP ?? "1" },
    });
    const emit = (stream, chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) hooks.onLog(stream, line);
      }
    };
    child.stdout.on("data", (c) => emit("stdout", c));
    child.stderr.on("data", (c) => emit("stderr", c));
    child.on("close", (code) => {
      if (code !== 0) {
        hooks.onDone(code ?? 1);
        return;
      }
      runNext();
    });
    child.on("error", (e) => hooks.onDone(1, e));
  };
  runNext();
}
