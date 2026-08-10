#!/usr/bin/env node
/**
 * WPTP contract-first structural gold: OpenAPI → Hono / Next.js on hub-contract-first.
 * Usage: node scripts/hub-ingest/hub-wptp-contract-gold.mjs [--target hono|nextjs]
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveWptpRepoRoot } from "../lib/wptp-siblings.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-contract-first");
const openapiPath = join(fixture, "openapi.json");

/**
 * @param {string} [fixtureDir]
 * @returns {{ method: string, path: string }[]}
 */
export function listOpenApiFixtureRoutes(fixtureDir = fixture) {
  const specPath = join(fixtureDir, "openapi.json");
  if (!existsSync(specPath)) return [];
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const routes = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    for (const key of Object.keys(item)) {
      if (key === "parameters" || key === "servers" || key === "summary" || key === "description") continue;
      routes.push({ method: key.toUpperCase(), path });
    }
  }
  return routes;
}

function parseArgs(argv) {
  let target = "hono";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--target" && argv[i + 1]) target = argv[++i];
  }
  if (target !== "hono" && target !== "nextjs") {
    throw new Error("hub-wptp-contract-gold: --target hono|nextjs");
  }
  return { target };
}

async function ensureWptpMatrixBuilt(matrixRoot) {
  const silver = join(matrixRoot, "dist", "verify-silver-chrysalis.js");
  if (existsSync(silver)) return { ok: true };
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const b = spawnSync(npmCmd, ["run", "build", "--prefix", matrixRoot], {
    cwd: scriptRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (b.status !== 0) {
    return { ok: false, reason: "matrix-build-failed", stderr: b.stderr?.slice(-1500) ?? "" };
  }
  return { ok: true };
}

/**
 * @param {"hono"|"nextjs"} target
 */
export async function runHubWptpContractGold(target) {
  const matrixRoot = resolveWptpRepoRoot(scriptRoot, "wptp-matrix");
  if (!existsSync(openapiPath)) {
    return { ok: false, reason: "missing-openapi", openapiPath, target };
  }
  if (!existsSync(matrixRoot)) {
    return { ok: false, skip: "no-wptp-matrix", matrixRoot, target };
  }
  const emitNextJsRoot = resolveWptpRepoRoot(scriptRoot, "wptp-emit-nextjs");
  if (target === "nextjs" && !existsSync(join(emitNextJsRoot, "dist", "index.js"))) {
    return { ok: false, skip: "no-wptp-emit-nextjs", emitNextJsRoot, target };
  }

  const built = await ensureWptpMatrixBuilt(matrixRoot);
  if (!built.ok) return { ok: false, target, ...built };

  const outDir = join(fixture, "generated", target);
  await mkdir(outDir, { recursive: true });

  if (target === "hono") {
    const { composeOpenApiIrHonoChrysalis } = await import(
      pathToFileURL(join(matrixRoot, "dist", "compose-chrysalis-hono.js")).href
    );
    const result = composeOpenApiIrHonoChrysalis(openapiPath, outDir, { chrysalisRoot: scriptRoot });
    if (!result.emitOk || result.handlerCount < 1) {
      return { ok: false, target, reason: "hono-compose-failed", result };
    }
    return { ok: true, target, outDir, handlerCount: result.handlerCount, path: "openapi-ir-hono-chrysalis" };
  }

  const { composeOpenApiIrNextJsChrysalis } = await import(
    pathToFileURL(join(matrixRoot, "dist", "compose-chrysalis-nextjs.js")).href
  );
  const result = composeOpenApiIrNextJsChrysalis(openapiPath, outDir, {
    chrysalisRoot: scriptRoot,
    wptpEmitNextJsRoot: emitNextJsRoot,
  });
  if (!result.emitOk || result.handlerCount < 1) {
    return { ok: false, target, reason: "nextjs-compose-failed", result };
  }
  return { ok: true, target, outDir, handlerCount: result.handlerCount, path: "openapi-ir-nextjs-chrysalis" };
}

/**
 * @param {"hono"|"nextjs"} target
 */
export async function assertHubWptpContractArtifacts(target) {
  const outDir = join(fixture, "generated", target);
  if (target === "nextjs") {
    const appDir = join(outDir, "app");
    if (!existsSync(appDir)) {
      return { ok: false, reason: "missing-app-dir", outDir };
    }
    let routeCount = 0;
    async function walk(dir) {
      for (const ent of await readdir(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) await walk(p);
        else if (ent.isFile() && ent.name === "route.ts") routeCount += 1;
      }
    }
    await walk(appDir);
    if (routeCount < 1) return { ok: false, reason: "no-route-ts", outDir };
    return { ok: true, outDir, routeCount };
  }
  const serverTs = join(outDir, "src", "server.ts");
  const indexTs = join(outDir, "src", "index.ts");
  if (!existsSync(serverTs) && !existsSync(indexTs)) {
    return { ok: false, reason: "missing-hono-server", outDir };
  }
  return { ok: true, outDir };
}

/**
 * @param {"hono"|"nextjs"} target
 */
export async function runHubWptpContractGoldSuite(target) {
  const compose = await runHubWptpContractGold(target);
  if (compose.skip) return { ok: false, skipped: true, ...compose };
  if (!compose.ok) return compose;
  const artifacts = await assertHubWptpContractArtifacts(target);
  if (!artifacts.ok) return { ok: false, target, reason: artifacts.reason, compose };
  return { ok: true, target, compose, artifacts };
}

async function main() {
  const { target } = parseArgs(process.argv);
  const result = await runHubWptpContractGoldSuite(target);
  console.log(JSON.stringify({ kind: "chrysalis.hub.wptp-contract-gold", ...result }, null, 2));
  if (!result.ok && !result.skipped) process.exit(1);
  if (result.skipped) process.exit(0);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
