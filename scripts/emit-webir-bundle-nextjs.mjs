/**
 * Emit Next.js App Router stubs from a chrysalis.webir.bundle via @wptp/emit-nextjs (WPTP silver).
 * Chrysalis supplies WebIR bundle shape + optional moduleFromGoldenSnapshot validation; emit uses @wptp/emit-nextjs.
 *
 * Env:
 *   WPTP_EMIT_NEXTJS_ROOT  path to wptp-emit-nextjs (default: ../wptp-emit-nextjs)
 *   WPTP_IR_ROOT           optional override for @wptp/ir (default: wptp-emit-nextjs/node_modules/@wptp/ir)
 *
 * Requires: pnpm -r build (webir); wptp-emit-nextjs npm run build.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

function usage(code = 1) {
  const text = `Emit Next.js App Router from chrysalis.webir.bundle via @wptp/emit-nextjs (WPTP silver).

Usage:
  node scripts/emit-webir-bundle-nextjs.mjs --bundle <bundle.json> --out <dir>
`;
  if (code === 0) process.stdout.write(text);
  else process.stderr.write(text);
  process.exit(code);
}

function parseArgs(argv) {
  let bundle = null;
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "-h" || argv[i] === "--help") usage(0);
    else if (argv[i] === "--bundle" && argv[i + 1]) bundle = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  if (!bundle || !out) usage();
  return { bundle: resolve(bundle), out: resolve(out) };
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const emitNextJsRoot = resolve(process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(root, "..", "wptp-emit-nextjs"));
const wptpIrRoot = resolve(
  process.env.WPTP_IR_ROOT ?? join(emitNextJsRoot, "node_modules", "@wptp", "ir"),
);
const { bundle: bundlePath, out } = parseArgs(process.argv.slice(2));

const raw = JSON.parse(readFileSync(bundlePath, "utf8"));
const bundleObj =
  raw?.format === "chrysalis.webir.bundle"
    ? raw
    : { format: "chrysalis.webir.bundle", bundleVersion: "1.0.0", module: raw };

if (!bundleObj.module?.meta || !Array.isArray(bundleObj.module.nodes)) {
  process.stderr.write("emit-webir-bundle-nextjs: expected chrysalis.webir.bundle or module snapshot\n");
  process.exit(1);
}

const { moduleFromGoldenSnapshot } = await import(
  pathToFileURL(join(root, "packages/webir/dist/index.js")).href,
);
moduleFromGoldenSnapshot(bundleObj.module);

const { importWebIrBundleJson } = await import(pathToFileURL(join(wptpIrRoot, "dist/index.js")).href);
const { emitNextJsAppRouter } = await import(pathToFileURL(join(emitNextJsRoot, "dist/index.js")).href);

const ir = importWebIrBundleJson(bundleObj);
const emitted = emitNextJsAppRouter(ir);

mkdirSync(out, { recursive: true });
for (const f of emitted.files) {
  const dest = join(out, f.relativePath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, f.contents, "utf8");
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      outDir: out,
      handlerCount: emitted.files.length,
      files: emitted.files.length,
      skipped: emitted.skipped.length,
    },
    null,
    2,
  )}\n`,
);
