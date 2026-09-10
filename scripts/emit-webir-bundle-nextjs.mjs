/**
 * Emit Next.js App Router stubs from a chrysalis.webir.bundle via @wptp/emit-nextjs (WPTP silver).
 * Chrysalis supplies WebIR bundle shape + optional moduleFromGoldenSnapshot validation; emit uses @wptp/emit-nextjs.
 *
 * Env:
 *   WPTP_EMIT_NEXTJS_ROOT  path to wptp-emit-nextjs (default: platforms/ then engines/ via wptp-siblings)
 *   WPTP_IR_ROOT           optional override for @wptp/ir (default: platforms/wptp-ir, else emit node_modules)
 *
 * Requires: pnpm -r build (webir); wptp-emit-nextjs npm run build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolveWptpPackageEntry, resolveWptpRepoRoot } from "./lib/wptp-siblings.mjs";

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
const emitNextJsRoot = resolveWptpRepoRoot(root, "wptp-emit-nextjs");
const platformsIr = resolveWptpRepoRoot(root, "wptp-ir");
const wptpIrRoot = resolve(
  process.env.WPTP_IR_ROOT ??
    (existsSync(join(platformsIr, "dist", "index.js"))
      ? platformsIr
      : join(emitNextJsRoot, "node_modules", "@wptp", "ir")),
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

const irEntry = resolveWptpPackageEntry(root, "wptp-ir") ?? join(wptpIrRoot, "dist/index.js");
const emitEntry = resolveWptpPackageEntry(root, "wptp-emit-nextjs") ?? join(emitNextJsRoot, "dist/index.js");
const { importWebIrBundleJson } = await import(pathToFileURL(irEntry).href);
const { emitNextJsAppRouter } = await import(pathToFileURL(emitEntry).href);

const ir = importWebIrBundleJson(bundleObj);
const emitted = emitNextJsAppRouter(ir);

function safeDestPath(outDir, relativePath) {
  const parts = relativePath.split(/[/\\]/).map((seg) => {
    if (platform() === "win32" && /:/.test(seg) && !/^[a-zA-Z]:$/.test(seg)) {
      return seg.replace(/:/g, "_");
    }
    return seg;
  });
  return join(outDir, ...parts);
}

mkdirSync(out, { recursive: true });
for (const f of emitted.files) {
  const dest = safeDestPath(out, f.relativePath);
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
