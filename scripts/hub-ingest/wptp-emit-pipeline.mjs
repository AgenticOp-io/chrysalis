/**
 * Prefer WPTP / WebIR emit over native scaffolds when siblings and artifacts exist.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { discoverContractArtifacts } from "./discover-contract-artifacts.mjs";
import { resolveEmitBackend } from "./shared.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function runNode(script, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      env: { ...process.env, CHRYSALIS_ROOT: root, ...env },
    });
    const err = [];
    child.stderr.on("data", (c) => err.push(c));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(Buffer.concat(err).toString("utf8") || `exit ${code}`))));
    child.on("error", reject);
  });
}

async function writeEmitNote(projectDir, note) {
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  const path = join(projectDir, ".chrysalis", "hub.emit-path.json");
  await writeFile(path, `${JSON.stringify({ ...note, generatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

/**
 * @returns {{ ok: boolean, path: string, hole?: string, detail?: string }}
 */
export async function runHubEmitPipeline(projectDir, origin, output) {
  const backend = resolveEmitBackend(output);
  const composeScript = join(root, "scripts/hub-ingest/wptp-compose-site.mjs");
  const contracts = await discoverContractArtifacts(projectDir);
  const contractFirst =
    (output === "nextjs" || backend === "hono") && (contracts.openapi !== null || contracts.har !== null);

  if (existsSync(composeScript)) {
    try {
      await runNode(composeScript, [projectDir, "--output", output === "nextjs" ? "nextjs" : backend === "fastify" ? "hono" : backend || "hono"], {
        WPTP_MATRIX_ROOT: process.env.WPTP_MATRIX_ROOT ?? join(root, "..", "wptp-matrix"),
        WPTP_EMIT_NEXTJS_ROOT: process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(root, "..", "wptp-emit-nextjs"),
      });
      await writeEmitNote(projectDir, {
        path: "wptp-compose",
        origin,
        output,
        contractFirst,
        openapi: contracts.openapi,
        har: contracts.har,
      });
      return { ok: true, path: "wptp-compose" };
    } catch (e) {
      if (contractFirst) {
        return { ok: false, path: "wptp-compose", hole: "hub:contract-compose-failed", detail: String(e) };
      }
      /* fall through */
    }
  }

  const webir = join(projectDir, ".chrysalis", `hub.${origin}.webir.json`);
  if (!existsSync(webir)) {
    try {
      await runNode(join(root, "scripts/hub-ingest/lift-to-webir.mjs"), [projectDir, "--language", origin]);
    } catch (e) {
      return { ok: false, path: "scaffold", hole: "hub:lift-failed", detail: String(e) };
    }
  }

  if (output === "nextjs") {
    try {
      await runNode(join(root, "scripts/hub-ingest/emit-nextjs-from-hub.mjs"), [projectDir, "--origin", origin]);
      await writeEmitNote(projectDir, { path: "hub-webir-nextjs", origin, output });
      return { ok: true, path: "hub-webir-nextjs" };
    } catch {
      /* continue */
    }
  }

  if (backend === "hono" || backend === "fastify") {
    try {
      await runNode(join(root, "scripts/hub-ingest/emit-from-hub.mjs"), [
        projectDir,
        "--origin",
        origin,
        "--target",
        backend,
      ]);
      await writeEmitNote(projectDir, { path: "hub-webir-emit", origin, output: backend });
      return { ok: true, path: "hub-webir-emit" };
    } catch {
      /* continue */
    }
  }

  if (output === "python") {
    try {
      await runNode(join(root, "scripts/hub-ingest/emit-python-from-hub.mjs"), [projectDir, "--origin", origin]);
      await writeEmitNote(projectDir, { path: "hub-webir-python", origin, output: "python" });
      return { ok: true, path: "hub-webir-python" };
    } catch {
      /* continue */
    }
  }

  if (output === "java") {
    try {
      await runNode(join(root, "scripts/hub-ingest/emit-java-from-hub.mjs"), [projectDir, "--origin", origin]);
      await writeEmitNote(projectDir, { path: "hub-webir-java", origin, output: "java" });
      return { ok: true, path: "hub-webir-java" };
    } catch {
      /* continue */
    }
  }

  if (output === "go") {
    try {
      await runNode(join(root, "scripts/hub-ingest/emit-go-from-hub.mjs"), [projectDir, "--origin", origin]);
      await writeEmitNote(projectDir, { path: "hub-webir-go", origin, output: "go" });
      return { ok: true, path: "hub-webir-go" };
    } catch {
      /* continue */
    }
  }

  if (output === "cwl") {
    try {
      await runNode(join(root, "scripts/hub-ingest/emit-cwl-from-hub.mjs"), [projectDir, "--origin", origin]);
      await writeEmitNote(projectDir, { path: "hub-webir-cwl", origin, output: "cwl" });
      return { ok: true, path: "hub-webir-cwl" };
    } catch {
      /* continue */
    }
  }

  const nativeEmitScripts = {
    ruby: "emit-ruby-from-hub.mjs",
    csharp: "emit-csharp-from-hub.mjs",
    rust: "emit-rust-from-hub.mjs",
    kotlin: "emit-kotlin-from-hub.mjs",
    scala: "emit-scala-from-hub.mjs",
    swift: "emit-swift-from-hub.mjs",
  };
  if (nativeEmitScripts[output]) {
    try {
      await runNode(join(root, "scripts/hub-ingest", nativeEmitScripts[output]), [projectDir, "--origin", origin]);
      await writeEmitNote(projectDir, { path: `hub-webir-${output}`, origin, output });
      return { ok: true, path: `hub-webir-${output}` };
    } catch {
      /* continue */
    }
  }

  try {
    await runNode(join(root, "scripts/hub-ingest/emit-target-project.mjs"), [projectDir, "--origin", origin, "--output", output]);
    await writeEmitNote(projectDir, {
      path: "scaffold",
      origin,
      output,
      hole: "hub:emit-scaffold-fallback",
      detail: "WPTP/WebIR emit unavailable; emitted native scaffold (honest open grade).",
    });
    return { ok: true, path: "scaffold", hole: "hub:emit-scaffold-fallback" };
  } catch (e) {
    return { ok: false, path: "failed", hole: "hub:emit-failed", detail: String(e) };
  }
}
