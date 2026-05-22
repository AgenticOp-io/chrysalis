#!/usr/bin/env node
/**
 * Per-site WPTP silver compose when OpenAPI/HAR/WebIR artifacts exist in the site tree.
 * Usage: node scripts/hub-ingest/wptp-compose-site.mjs <siteDir> --output nextjs|hono
 */
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const siteDir = argv[2];
  let output = "nextjs";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
  }
  if (!siteDir) throw new Error("usage: wptp-compose-site.mjs <siteDir> --output nextjs|hono");
  return { siteDir: resolve(siteDir), output };
}

async function findFirst(dir, pattern) {
  const names = await readdir(dir).catch(() => []);
  for (const name of names) {
    if (pattern.test(name)) return join(dir, name);
  }
  return null;
}

function runNode(script, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env: { ...process.env, ...env } });
    const err = [];
    child.stderr.on("data", (c) => err.push(c));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(Buffer.concat(err).toString("utf8") || `exit ${code}`))));
    child.on("error", reject);
  });
}

async function main() {
  const { siteDir, output } = parseArgs(process.argv);
  const chrysalisRoot = process.env.CHRYSALIS_ROOT ?? root;
  const matrixRoot = process.env.WPTP_MATRIX_ROOT ?? join(root, "..", "wptp-matrix");
  const emitNextJsRoot = process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(root, "..", "wptp-emit-nextjs");
  const webir = join(siteDir, ".chrysalis", "ingested.webir.json");
  const bundle = join(siteDir, ".chrysalis", "ingested.webir.bundle.json");
  const outDir = join(siteDir, "generated", output === "hono" ? "hono" : "nextjs");

  if (!existsSync(webir) && existsSync(join(siteDir, "chrysalis.routes.json"))) {
    await runNode(join(root, "scripts/hub-ingest/export-project-webir.mjs"), [siteDir, "--out", webir]);
  }

  if (existsSync(webir)) {
    await mkdir(join(siteDir, ".chrysalis"), { recursive: true });
    if (!existsSync(bundle)) {
      await runNode(join(root, "scripts/export-webir-bundle.mjs"), ["--in", webir, "--out", bundle]);
    }
    if (output === "nextjs" && existsSync(join(emitNextJsRoot, "dist/index.js"))) {
      await runNode(join(root, "scripts/emit-webir-bundle-nextjs.mjs"), ["--bundle", bundle, "--out", outDir]);
      console.log(JSON.stringify({ ok: true, path: "webir-nextjs", outDir }));
      return;
    }
    if (output === "hono") {
      await runNode(join(root, "scripts/emit-webir-bundle-hono.mjs"), ["--bundle", bundle, "--out", outDir]);
      console.log(JSON.stringify({ ok: true, path: "webir-hono", outDir }));
      return;
    }
  }

  const openapi =
    (await findFirst(siteDir, /\.openapi\.(json|ya?ml)$/i)) ||
    (await findFirst(siteDir, /^openapi\.(json|ya?ml)$/i));
  const har = await findFirst(siteDir, /\.har\.json$/i);

  if (!existsSync(join(matrixRoot, "src", "verify-silver-chrysalis.ts"))) {
    throw new Error(`wptp-matrix missing at ${matrixRoot}`);
  }

  const { runSilverOpenApiIrNextJsChrysalis, runSilverHarIrNextJsChrysalis, runSilverOpenApiIrHonoChrysalis } =
    await import(pathToFileURL(join(matrixRoot, "src", "verify-silver-chrysalis.ts")).href);

  if (openapi && output === "nextjs") {
    const r = runSilverOpenApiIrNextJsChrysalis(openapi, chrysalisRoot, emitNextJsRoot);
    if (!r.ok) throw new Error(r.detail ?? "OpenAPI→Next failed");
    console.log(JSON.stringify({ ok: true, path: "openapi-nextjs", id: r.id }));
    return;
  }
  if (har && output === "nextjs") {
    const r = runSilverHarIrNextJsChrysalis(har, chrysalisRoot, emitNextJsRoot);
    if (!r.ok) throw new Error(r.detail ?? "HAR→Next failed");
    console.log(JSON.stringify({ ok: true, path: "har-nextjs", id: r.id }));
    return;
  }
  if (openapi && output === "hono") {
    const r = runSilverOpenApiIrHonoChrysalis(openapi, chrysalisRoot);
    if (!r.ok) throw new Error(r.detail ?? "OpenAPI→Hono failed");
    console.log(JSON.stringify({ ok: true, path: "openapi-hono", id: r.id }));
    return;
  }

  throw new Error(
    "no compose inputs: add openapi.json/yaml, .har.json, or run Chrysalis ingest first (.chrysalis/ingested.webir.json)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
