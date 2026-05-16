/**
 * Emit a Hono project from a chrysalis.webir.bundle JSON file (WPTP composed path).
 *
 * Requires: pnpm -r build (or built packages/webir + packages/emit-hono dist).
 *
 * Usage:
 *   node scripts/emit-webir-bundle-hono.mjs --bundle path/to/bundle.json --out generated/petstore-hono
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  process.stderr.write(
    "Usage: node scripts/emit-webir-bundle-hono.mjs --bundle <bundle.json> --out <dir>\n",
  );
  process.exit(1);
}

function parseArgs(argv) {
  let bundle = null;
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--bundle" && argv[i + 1]) bundle = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  if (!bundle || !out) usage();
  return { bundle: resolve(bundle), out: resolve(out) };
}

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { bundle, out } = parseArgs(process.argv.slice(2));

const raw = JSON.parse(readFileSync(bundle, "utf8"));
const moduleJson =
  raw?.format === "chrysalis.webir.bundle" && raw.module ? raw.module : raw;
if (!moduleJson?.meta || !Array.isArray(moduleJson.nodes)) {
  process.stderr.write("emit-webir-bundle-hono: expected chrysalis.webir.bundle or module snapshot\n");
  process.exit(1);
}

const { moduleFromGoldenSnapshot } = await import(
  new URL("../packages/webir/dist/index.js", import.meta.url).href
);
const { emit } = await import(new URL("../packages/emit-hono/dist/index.js", import.meta.url).href);

const mod = moduleFromGoldenSnapshot(moduleJson);
const result = await emit({ module: mod, outDir: out });
process.stdout.write(
  `${JSON.stringify({ ok: true, outDir: out, handlerCount: result.handlerCount, files: result.files.length }, null, 2)}\n`,
);
