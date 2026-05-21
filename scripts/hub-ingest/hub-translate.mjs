#!/usr/bin/env node
/**
 * Run full hub translation: lift (non-PHP) or delegate to Chrysalis CLI (PHP) + emit/scaffold.
 * Usage: node scripts/hub-ingest/hub-translate.mjs <projectDir> --origin php --output hono
 */
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveEmitBackend } from "./shared.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "php";
  let output = "typescript";
  let cliBin = join(root, "packages/cli/dist/bin.js");
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
    else if (argv[i] === "--cli" && argv[i + 1]) cliBin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: hub-translate.mjs <projectDir> --origin <lang> --output <lang>");
  return { projectDir: resolve(projectDir), origin, output, cliBin };
}

function runNode(script, args) {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env: process.env });
    let out = "";
    child.stdout.on("data", (c) => {
      out += c;
      process.stdout.write(c);
    });
    child.stderr.on("data", (c) => process.stderr.write(c));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${script} failed (${code})`));
      else resolveP(out);
    });
    child.on("error", reject);
  });
}

function runCli(cliBin, args) {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [cliBin, ...args], {
      cwd: root,
      env: { ...process.env, CHRYSALIS_SKIP_PARSER_VENDOR: process.env.CHRYSALIS_SKIP_PARSER_VENDOR ?? "1" },
    });
    child.stdout.on("data", (c) => process.stdout.write(c));
    child.stderr.on("data", (c) => process.stderr.write(c));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`chrysalis failed (${code})`));
      else resolveP();
    });
    child.on("error", reject);
  });
}

async function main() {
  const { projectDir, origin, output, cliBin } = parseArgs(process.argv);
  const hubIngest = join(root, "scripts/hub-ingest");

  if (origin === "php") {
    const progress = join(projectDir, ".chrysalis", "ingest.progress");
    const backend = resolveEmitBackend(output);
    if (output === "nextjs") {
      /* export-project-webir runs ingest internally */
    } else {
      await runCli(cliBin, ["ingest", projectDir, "--ingest-progress-file", progress]);
    }
    if (backend === "hono" || backend === "fastify") {
      await runCli(cliBin, ["emit", projectDir, "--out", join(projectDir, "generated", backend), "--target", backend]);
    } else if (output === "nextjs") {
      const webirOut = join(projectDir, ".chrysalis", "ingested.webir.json");
      const bundleOut = join(projectDir, ".chrysalis", "ingested.webir.bundle.json");
      await runNode(join(hubIngest, "export-project-webir.mjs"), [projectDir, "--out", webirOut]);
      await runNode(join(root, "scripts/export-webir-bundle.mjs"), ["--in", webirOut, "--out", bundleOut]);
      await runNode(join(root, "scripts/emit-webir-bundle-nextjs.mjs"), [
        "--bundle",
        bundleOut,
        "--out",
        join(projectDir, "generated", "nextjs"),
      ]);
    } else if (backend) {
      await runCli(cliBin, ["emit", projectDir, "--out", join(projectDir, "generated", backend), "--target", backend]);
    } else {
      const webirOut = join(projectDir, ".chrysalis", "ingested.webir.json");
      try {
        await runNode(join(hubIngest, "export-project-webir.mjs"), [projectDir, "--out", webirOut]);
      } catch {
        /* export optional when ingest already wrote WebIR */
      }
      await runNode(join(hubIngest, "emit-target-project.mjs"), [projectDir, "--origin", origin, "--output", output]);
    }
    console.log(JSON.stringify({ ok: true, origin, output, path: "chrysalis-php" }));
    return;
  }

  await runNode(join(hubIngest, "lift-to-webir.mjs"), [projectDir, "--language", origin]);

  const backend = resolveEmitBackend(output);
  if (output === "nextjs") {
    await runNode(join(hubIngest, "emit-nextjs-from-hub.mjs"), [projectDir, "--origin", origin]);
  } else if (backend) {
    await runNode(join(hubIngest, "emit-from-hub.mjs"), [projectDir, "--origin", origin, "--target", backend]);
  } else {
    await runNode(join(hubIngest, "emit-target-project.mjs"), [projectDir, "--origin", origin, "--output", output]);
  }

  console.log(JSON.stringify({ ok: true, origin, output, path: "hub-lift-emit" }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
