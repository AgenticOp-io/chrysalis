#!/usr/bin/env node
/**
 * Run full hub translation: lift (non-PHP) or delegate to Chrysalis CLI (PHP) + emit/scaffold.
 * Usage: node scripts/hub-ingest/hub-translate.mjs <projectDir> --origin php --output hono
 */
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveEmitBackend } from "./shared.mjs";
import { runHubEmitPipeline } from "./wptp-emit-pipeline.mjs";
import { exportProjectMigrationCwlFromContractOrWebir } from "./hub-contract-cwl-import.mjs";
import { writeProjectCwlDiffArtifacts } from "./hub-cwl-diff.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { writeHubPostTranslateArtifacts } from "./hub-post-translate-artifacts.mjs";
import { resolveHubConvertIsRouting } from "./hub-llm-convert-is-routing.mjs";
import { runHubConvertHoleProposalPipeline } from "./hub-llm-convert-hole-proposals.mjs";

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
      env: { ...process.env },
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

async function emitTranslateResult(projectDir, origin, output, payload) {
  let deliveryArtifacts = null;
  try {
    deliveryArtifacts = await writeHubPostTranslateArtifacts(projectDir, { origin, output });
  } catch {
    deliveryArtifacts = null;
  }
  console.log(JSON.stringify({ ...payload, deliveryArtifacts }));
}

async function attachHoleProposals(projectDir, isRouting) {
  if (process.env.CHRYSALIS_HUB_SKIP_HOLE_PROPOSALS === "1") return null;
  try {
    return await runHubConvertHoleProposalPipeline({
      projectDir,
      domainId: isRouting?.domainId,
      trajectoryPath: isRouting?.trajectoryPath,
      tier: isRouting?.tier,
      skipLlm: isRouting?.skipLlm === true,
      enrichWithLlm: process.env.CHRYSALIS_HUB_CONVERT_ENRICH_LLM !== "0",
      recordVerifyGate: process.env.CHRYSALIS_HUB_CONVERT_RECORD_VERIFY !== "0",
    });
  } catch {
    return null;
  }
}

async function main() {
  const { projectDir, origin, output, cliBin } = parseArgs(process.argv);
  const hubIngest = join(root, "scripts/hub-ingest");

  const isRouting =
    process.env.CHRYSALIS_HUB_SKIP_IS_ROUTING === "1"
      ? null
      : await resolveHubConvertIsRouting({ repoRoot: root, origin, output, projectDir });

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
    let cwlExport = null;
    let openapiExport = null;
    try {
      cwlExport = await exportProjectMigrationCwlFromContractOrWebir(projectDir, { origin });
    } catch {
      cwlExport = { ok: false, reason: "cwl-export-failed" };
    }
    try {
      openapiExport = await exportProjectOpenApi(projectDir, { origin });
    } catch {
      openapiExport = { ok: false, reason: "openapi-export-failed" };
    }
    let cwlDiff = null;
    try {
      cwlDiff = await writeProjectCwlDiffArtifacts(projectDir, {});
    } catch {
      cwlDiff = null;
    }
    const holeProposals = await attachHoleProposals(projectDir, isRouting);
    await emitTranslateResult(projectDir, origin, output, {
      ok: true,
      origin,
      output,
      path: "chrysalis-php",
      isRouting,
      holeProposals,
      cwlExport,
      openapiExport,
      cwlDiff,
    });
    return;
  }

  const preferWptp = process.env.CHRYSALIS_HUB_PREFER_WPTP !== "0";
  if (preferWptp) {
    const r = await runHubEmitPipeline(projectDir, origin, output);
    let cwlExport = null;
    try {
      cwlExport = await exportProjectMigrationCwlFromContractOrWebir(projectDir, { origin });
    } catch {
      cwlExport = { ok: false, reason: "cwl-export-failed" };
    }
    let cwlDiff = null;
    try {
      cwlDiff = await writeProjectCwlDiffArtifacts(projectDir, {});
    } catch {
      cwlDiff = null;
    }
    const holeProposals = await attachHoleProposals(projectDir, isRouting);
    await emitTranslateResult(projectDir, origin, output, {
      ok: r.ok,
      origin,
      output,
      path: r.path,
      hole: r.hole ?? null,
      isRouting,
      holeProposals,
      cwlExport,
      cwlDiff,
    });
    if (!r.ok) process.exit(1);
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

  let cwlExport = null;
  try {
    cwlExport = await exportProjectMigrationCwlFromContractOrWebir(projectDir, { origin });
  } catch {
    cwlExport = { ok: false, reason: "cwl-export-failed" };
  }
  let cwlDiff = null;
  try {
    cwlDiff = await writeProjectCwlDiffArtifacts(projectDir, {});
  } catch {
    cwlDiff = null;
  }

  const holeProposals = await attachHoleProposals(projectDir, isRouting);
  await emitTranslateResult(projectDir, origin, output, {
    ok: true,
    origin,
    output,
    path: "hub-lift-emit",
    isRouting,
    holeProposals,
    cwlExport,
    cwlDiff,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
