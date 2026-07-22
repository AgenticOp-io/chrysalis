#!/usr/bin/env node
/**
 * Best-path WISP deep prove — high-value emits only (not all 24).
 *
 * 1) Svelte gold trace-replay: structured+middleware × hono/fastify/nextjs/python
 * 2) Real WISP routes.cwl emit → those four targets
 * 3) In-process hub trace-replay on WISP→hono (+ fastify when available)
 *
 * Gate: hub:wisp-deep-emit-prove-smoke
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { isHubNativeGoldEmitTarget, runNativeGoldEmit } from "./hub-gold-native-emit.mjs";

export const WISP_DEEP_EMIT_PROVE_KIND = "chrysalis.hub.wisp-deep-emit-prove-smoke";
export const WISP_DEEP_EMIT_PROVE_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = join(ROOT, "reports/wisp/wisp-deep-emit-prove.json");
const WISP = join(ROOT, "fixtures/hub-wisp-management");
const liftScript = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const emitTs = join(ROOT, "scripts/hub-ingest/emit-from-hub.mjs");
const emitNextjs = join(ROOT, "scripts/hub-ingest/emit-nextjs-from-hub.mjs");
const replayWorker = join(ROOT, "scripts/hub-ingest/hub-gold-replay-worker.mjs");

const PRIORITY_TARGETS = ["hono", "fastify", "nextjs", "python"];

const GOLD_REPLAY_SUITES = [
  "svelte-structured-hono-full",
  "svelte-middleware-hono-full",
  "svelte-structured-fastify-full",
  "svelte-middleware-fastify-full",
  "svelte-structured-nextjs-full",
  "svelte-middleware-nextjs-full",
  "svelte-structured-python-full",
  "svelte-middleware-python-full",
];

function parseEmitReport(stdout) {
  const text = stdout ?? "";
  /** @type {Record<string, unknown>[]} */
  const objs = [];
  const re = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let m;
  while ((m = re.exec(text))) {
    try {
      objs.push(JSON.parse(m[0]));
    } catch {
      /* skip */
    }
  }
  if (objs.length === 0) {
    try {
      objs.push(JSON.parse(text.trim().split(/\r?\n/).pop() ?? "{}"));
    } catch {
      return {};
    }
  }
  let best = objs[0] ?? {};
  for (const j of objs) {
    const routes = Number(j.routeCount ?? j.handlerCount ?? 0);
    const bestRoutes = Number(best.routeCount ?? best.handlerCount ?? 0);
    if (routes > bestRoutes) best = j;
  }
  if (Number(best.routeCount ?? best.handlerCount ?? 0) === 0) {
    const hc = text.match(/"handlerCount"\s*:\s*(\d+)/);
    const rc = text.match(/"routeCount"\s*:\s*(\d+)/);
    if (hc || rc) {
      best = {
        ...best,
        handlerCount: hc ? Number(hc[1]) : best.handlerCount,
        routeCount: rc ? Number(rc[1]) : best.routeCount,
      };
    }
  }
  return best;
}

function parseTraceReplayReport(stdout) {
  const text = `${stdout || ""}`;
  for (const line of text.split(/\r?\n/).reverse()) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    if (!t.includes("chrysalis.hub.trace-replay") && !t.includes('"ok"')) continue;
    try {
      const j = JSON.parse(t);
      if (j && typeof j === "object" && ("ok" in j || "correctness" in j || j.kind)) return j;
    } catch {
      /* continue */
    }
  }
  const start = text.indexOf("{");
  if (start < 0) return {};
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return {};
        }
      }
    }
  }
  return {};
}

function replayGoldSuite(id) {
  const r = spawnSync(process.execPath, ["scripts/hub-ingest/hub-gold-trace-replay.mjs", "--suite", id], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const report = parseTraceReplayReport(r.stdout);
  const ok = r.status === 0 && (report.ok === true || report.correctness === 1);
  return {
    id,
    ok,
    status: r.status,
    correctness: report.correctness ?? null,
    skip: report.skip ?? null,
  };
}

function emitWisp(target) {
  let r;
  if (target === "nextjs") {
    r = spawnSync(process.execPath, [emitNextjs, WISP, "--origin", "cwl"], { cwd: ROOT, encoding: "utf8" });
  } else if (isHubNativeGoldEmitTarget(target)) {
    r = runNativeGoldEmit(WISP, "cwl", target);
  } else {
    r = spawnSync(process.execPath, [emitTs, WISP, "--origin", "cwl", "--target", target], {
      cwd: ROOT,
      encoding: "utf8",
    });
  }
  const report = parseEmitReport(r.stdout);
  const routes = Number(report.routeCount ?? report.handlerCount ?? 0);
  const outDir = join(WISP, "generated", target);
  const structural = assertEmitStructure(target, outDir);
  return {
    target,
    ok: r.status === 0 && routes >= 100 && structural.ok,
    status: r.status,
    routeCount: routes,
    holeCount: report.holeCount != null ? Number(report.holeCount) : null,
    outDir,
    structural,
  };
}

/**
 * @param {string} target
 * @param {string} outDir
 */
function assertEmitStructure(target, outDir) {
  if (!existsSync(outDir)) return { ok: false, reason: "missing-outDir" };
  if (target === "hono" || target === "fastify") {
    const server = existsSync(join(outDir, "src", "server.ts")) || existsSync(join(outDir, "src", "index.ts"));
    const handlers = existsSync(join(outDir, "src", "handlers"));
    return { ok: server && handlers, server, handlers };
  }
  if (target === "nextjs") {
    const app = join(outDir, "app");
    let routeTs = 0;
    function walk(d) {
      if (!existsSync(d)) return;
      for (const ent of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name === "route.ts") routeTs += 1;
      }
    }
    walk(app);
    return { ok: routeTs >= 50, routeTs };
  }
  if (target === "python") {
    const files = existsSync(outDir) ? readdirSync(outDir) : [];
    const py = files.filter((f) => f.endsWith(".py")).length;
    return { ok: py >= 1 || files.length >= 1, fileCount: files.length, py };
  }
  return { ok: true };
}

function npmInstall(outDir, pkg) {
  if (existsSync(join(outDir, "node_modules", pkg))) return { ok: true, skipped: true };
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
    cwd: outDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return { ok: r.status === 0, status: r.status };
}

function replayWispInProcess(target) {
  const outDir = join(WISP, "generated", target);
  if (!existsSync(outDir)) return { target, ok: false, reason: "missing-emit" };
  const runtimePkg = target === "fastify" ? "fastify" : "hono";
  const inst = npmInstall(outDir, runtimePkg);
  if (!inst.ok) return { target, ok: false, reason: "npm-install-failed", inst };

  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", replayWorker, WISP, "--origin", "cwl", "--target", target],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 },
  );
  const report = parseTraceReplayReport(r.stdout);
  const correctness = report.correctness ?? report.report?.aggregate?.correctness ?? null;
  const ok = r.status === 0 && report.ok === true && Number(correctness) >= 1;
  return {
    target,
    ok,
    status: r.status,
    correctness,
    routeCount: report.routeCount ?? null,
    traceCount: report.traceCount ?? null,
  };
}

export async function runWispDeepEmitProveSmoke() {
  const progress = createSmokeProgress("wisp-deep-emit-prove");
  const t0 = progress.start("WISP deep emit prove");

  const goldReplay = GOLD_REPLAY_SUITES.map(replayGoldSuite);
  const goldOk = goldReplay.every((r) => r.ok);

  const lift = spawnSync(process.execPath, [liftScript, WISP, "--language", "cwl"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  /** @type {object[]} */
  let emits = [];
  let emitOk = false;
  if (lift.status !== 0) {
    emits = PRIORITY_TARGETS.map((target) => ({ target, ok: false, reason: "lift-failed" }));
  } else {
    emits = PRIORITY_TARGETS.map(emitWisp);
    emitOk = emits.every((r) => r.ok);
  }

  /** @type {object[]} */
  const inProcess = [];
  for (const target of ["hono", "fastify"]) {
    inProcess.push(replayWispInProcess(target));
  }
  const inProcessOk = inProcess.every((r) => r.ok);

  const ok = goldOk && emitOk && inProcessOk;
  progress.end("WISP deep emit prove", ok, t0);

  const report = {
    kind: WISP_DEEP_EMIT_PROVE_KIND,
    schemaVersion: WISP_DEEP_EMIT_PROVE_SCHEMA_VERSION,
    ok,
    goldOk,
    emitOk,
    inProcessOk,
    priorityTargets: PRIORITY_TARGETS,
    goldReplay,
    emits,
    inProcess,
    note: ok
      ? "Deep prove: svelte gold replay + WISP CWL→hono/fastify/nextjs/python emit + in-process hono/fastify correctness=1"
      : "Deep prove failed — see goldReplay / emits / inProcess",
    honestLimit:
      "Not D6448-ST on each emit. CWL static remains the ST product proof; this verifies high-value outbound emit+replay.",
    generatedAt: new Date().toISOString(),
    reportPath: REPORT,
  };
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const r = await runWispDeepEmitProveSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exitCode = 1;
}

if (process.argv[1]?.includes("hub-wisp-deep-emit-prove-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
