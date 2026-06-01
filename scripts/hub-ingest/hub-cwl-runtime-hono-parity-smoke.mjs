#!/usr/bin/env node
/**
 * runtime-cwl vs rewrite simulate parity on flagship API routes (G1173).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadWebir } from "./shared.mjs";

export const HUB_CWL_RUNTIME_HONO_PARITY_KIND = "chrysalis.hub.cwl-runtime-hono-parity";
export const HUB_CWL_RUNTIME_HONO_PARITY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipDir = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

async function loadRewrite(repoRoot) {
  try {
    return await import("@chrysalis/rewrite");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/rewrite/dist/index.js")).href);
  }
}

const API_PROBES = [
  { method: "GET", path: "/api/health", routePath: "/api/health" },
  { method: "GET", path: "/api/docs/intro", routePath: "/api/docs/:slug" },
  { method: "POST", path: "/api/notify", routePath: "/api/notify" },
];

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    const dist = join(repoRoot, "packages/runtime-cwl/dist/index.js");
    return import(pathToFileURL(dist).href);
  }
}

function pathParamsFor(routePath, pathname) {
  const patternParts = routePath.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(":")) out[part.slice(1)] = pathParts[i] ?? "";
  }
  return out;
}

export async function runCwlRuntimeHonoParitySmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const base = {
    kind: HUB_CWL_RUNTIME_HONO_PARITY_KIND,
    schemaVersion: HUB_CWL_RUNTIME_HONO_PARITY_SCHEMA_VERSION,
    ok: false,
  };

  const lift = spawnSync(process.execPath, [liftScript, flagshipDir, "--language", "cwl"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (lift.status !== 0) {
    return { ...base, skip: "lift-failed" };
  }

  const webirPath = join(flagshipDir, ".chrysalis", "hub.cwl.webir.json");
  const webir = await loadWebir();
  const mod = webir.moduleFromGoldenSnapshot(JSON.parse(readFileSync(webirPath, "utf8")));
  const get = (id) => mod.nodes.get(id);
  const { simulateHandler, DEFAULT_STUB_DB } = await loadRewrite(repoRoot);
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(join(flagshipDir, "routes.cwl"), repoRoot) });

  /** @type {Record<string, { ok: boolean }>} */
  const probes = {};
  let ok = true;
  for (const probe of API_PROBES) {
    let routeNodeId = null;
    for (const rid of mod.roots) {
      const n = get(rid);
      if (!n || n.op !== "route") continue;
      if (
        String(n.attrs?.method ?? "GET").toUpperCase() === probe.method &&
        String(n.attrs?.path ?? "/") === probe.routePath
      ) {
        routeNodeId = rid;
        break;
      }
    }
    if (!routeNodeId) {
      ok = false;
      probes[`${probe.method} ${probe.path}`] = { ok: false };
      continue;
    }
    const pathParams = pathParamsFor(probe.routePath, probe.path);
    const sim = simulateHandler(
      mod,
      routeNodeId,
      {
        method: probe.method,
        path: probe.path,
        query: {},
        post: {},
        cookies: {},
        session: {},
        pathParams,
      },
      DEFAULT_STUB_DB,
    );
    const cwlRes = await runtime.fetch({ method: probe.method, url: `http://127.0.0.1${probe.path}` });
    const cwlBody = await cwlRes.text();
    const caseOk = cwlRes.status === sim.status && cwlBody.trim() === sim.body.trim();
    probes[`${probe.method} ${probe.path}`] = { ok: caseOk };
    if (!caseOk) ok = false;
  }

  return {
    ...base,
    ok,
    probes,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlRuntimeHonoParitySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
