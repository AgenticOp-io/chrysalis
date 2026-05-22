/**
 * Optional WPTP silver harness smoke from hub (VM with wptp-matrix sibling).
 */
import { spawn } from "node:child_process";
import { access, constants as fsConstants } from "node:fs/promises";
import { join } from "node:path";
import { WPTP_CI_REFERENCES } from "./chrysalis-hub-store.mjs";

async function exists(p) {
  try {
    await access(p, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function runNodeScript(repo, scriptRel, envExtra = {}) {
  const script = join(repo, scriptRel);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: repo,
      env: { ...process.env, CHRYSALIS_ROOT: repo, ...envExtra },
    });
    const out = [];
    const err = [];
    child.stdout?.on("data", (c) => out.push(c));
    child.stderr?.on("data", (c) => err.push(c));
    child.on("close", (code) =>
      resolve({ code: code ?? 1, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") }),
    );
    child.on("error", reject);
  });
}

/** Run in-repo WPTP CI harness when siblings exist (hub VM smoke, not per-customer site). */
export async function runWptpHubSmoke(repo, outputLanguage = "nextjs") {
  const matrixRoot = process.env.WPTP_MATRIX_ROOT ?? join(repo, "..", "wptp-matrix");
  const matrixOk = await exists(join(matrixRoot, "src", "verify-silver-chrysalis.ts"));
  const refs = WPTP_CI_REFERENCES;

  if (outputLanguage === "nextjs" || outputLanguage === "hono") {
    const key = outputLanguage === "nextjs" ? "wptpSilverNextjs" : "wptpD3Silver";
    const ref = refs[key];
    if (!matrixOk) {
      return {
        ok: false,
        skipped: true,
        reason: `wptp-matrix not found at ${matrixRoot}`,
        reference: ref,
      };
    }
    const r = await runNodeScript(repo, ref.script, { WPTP_MATRIX_ROOT: matrixRoot });
    return { ok: r.code === 0, exitCode: r.code, stdout: r.stdout, stderr: r.stderr, reference: ref };
  }

  return {
    ok: false,
    skipped: true,
    reason: `No WPTP hub smoke for output ${outputLanguage}; use hub-translate (scaffold or Chrysalis emit).`,
    references: refs,
  };
}

/** Per-site WPTP compose from project-local OpenAPI/HAR/WebIR. */
export async function runSiteWptpCompose(repo, site, outputLanguage) {
  const script = join(repo, "scripts/hub-ingest/wptp-compose-site.mjs");
  const out = [];
  const err = [];
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [script, site.localDir, "--output", outputLanguage === "hono" ? "hono" : "nextjs"],
      {
        cwd: repo,
        env: {
          ...process.env,
          CHRYSALIS_ROOT: repo,
          WPTP_MATRIX_ROOT: process.env.WPTP_MATRIX_ROOT ?? join(repo, "..", "wptp-matrix"),
          WPTP_EMIT_NEXTJS_ROOT: process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(repo, "..", "wptp-emit-nextjs"),
        },
      },
    );
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      const stdout = Buffer.concat(out).toString("utf8");
      const stderr = Buffer.concat(err).toString("utf8");
      let parsed = null;
      for (const line of stdout.trim().split(/\r?\n/)) {
        if (line.startsWith("{")) {
          try {
            parsed = JSON.parse(line);
          } catch {
            /* ignore */
          }
        }
      }
      if (code === 0) resolve({ ok: true, ...parsed, stdout, stderr });
      else reject(new Error(stderr.trim() || stdout.trim() || `wptp-compose-site failed (${code})`));
    });
    child.on("error", reject);
  });
}
