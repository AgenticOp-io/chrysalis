#!/usr/bin/env node
/**
 * Emit Next.js from hub WebIR via bundle wrapper + WPTP script when available.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { hubBundlePath, hubWebirPath } from "./shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "javascript";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-nextjs-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const moduleJson = JSON.parse(await readFile(hubWebirPath(projectDir, origin), "utf8"));
  const bundle = {
    format: "chrysalis.webir.bundle",
    bundleVersion: "1.0.0",
    module: moduleJson,
  };
  const bundlePath = hubBundlePath(projectDir, origin);
  await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const out = join(projectDir, "generated", "nextjs");
  const script = join(root, "scripts", "emit-webir-bundle-nextjs.mjs");

  await new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [script, "--bundle", bundlePath, "--out", out], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => (code === 0 ? resolveP() : reject(new Error(`nextjs emit exit ${code}`))));
    child.on("error", reject);
  });

  console.log(JSON.stringify({ ok: true, outDir: out, bundlePath }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
