#!/usr/bin/env node
/**
 * SSH into an origin site and run chrysalis-origin-bootstrap.sh (scan agent + capture kit docs).
 * Usage: node scripts/chrysalis-hub-prep-origin.mjs --host user@host --path /var/www/app [--identity ~/.ssh/id]
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentsDir = join(repoRoot, "scripts", "agents");

function parseArgs(argv) {
  let host = "";
  let user = "";
  let port = "22";
  let remotePath = ".";
  let identityFile;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--host" && argv[i + 1]) {
      const h = argv[++i];
      if (h.includes("@")) {
        [user, host] = h.split("@");
      } else host = h;
    } else if (argv[i] === "--user" && argv[i + 1]) user = argv[++i];
    else if (argv[i] === "--port" && argv[i + 1]) port = argv[++i];
    else if (argv[i] === "--path" && argv[i + 1]) remotePath = argv[++i];
    else if (argv[i] === "--identity" && argv[i + 1]) identityFile = argv[++i];
  }
  if (!host) throw new Error("usage: --host user@host --path /var/www/app");
  if (!user) throw new Error("--host must be user@host");
  return { user, host, port, remotePath, identityFile };
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false });
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

function sshArgs(ssh) {
  const args = ["-p", String(ssh.port ?? 22), "-o", "BatchMode=yes", "-o", "ConnectTimeout=30", "-o", "StrictHostKeyChecking=accept-new"];
  if (ssh.identityFile) args.push("-i", ssh.identityFile);
  args.push(`${ssh.user}@${ssh.host}`);
  return args;
}

export function parseOriginPrepJson(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith("{")) continue;
    try {
      const j = JSON.parse(line);
      if (j.kind === "chrysalis.origin.prep") return j;
    } catch {
      /* continue */
    }
  }
  throw new Error("origin prep: no chrysalis.origin.prep JSON in SSH output");
}

export async function prepOriginOverSsh(ssh, remotePath = ssh.remotePath ?? ".") {
  const remoteStaging = `/tmp/chrysalis-agents-${Date.now()}`;
  const scpArgs = ["-P", String(ssh.port ?? 22), "-r", "-o", "BatchMode=yes", "-o", "ConnectTimeout=30", "-o", "StrictHostKeyChecking=accept-new"];
  if (ssh.identityFile) scpArgs.push("-i", ssh.identityFile);
  scpArgs.push(`${agentsDir}/`, `${ssh.user}@${ssh.host}:${remoteStaging}/`);

  const up = await run("scp", scpArgs);
  if (up.code !== 0) {
    throw new Error(up.stderr.trim() || `scp agents failed (${up.code})`);
  }

  const escapedPath = remotePath.replace(/'/g, "'\\''");
  const remoteCmd = `chmod +x '${remoteStaging}'/*.sh && '${remoteStaging}/chrysalis-origin-bootstrap.sh' '${escapedPath}' '${remoteStaging}'`;
  const r = await run("ssh", [...sshArgs(ssh), remoteCmd]);
  await run("ssh", [...sshArgs(ssh), `rm -rf '${remoteStaging}'`]).catch(() => {});

  if (r.code !== 0) {
    throw new Error(r.stderr.trim() || r.stdout.trim() || `origin bootstrap failed (${r.code})`);
  }
  const prep = parseOriginPrepJson(r.stdout);
  return { ok: true, prep, stdout: r.stdout, stderr: r.stderr };
}

async function main() {
  const ssh = parseArgs(process.argv);
  const result = await prepOriginOverSsh(ssh);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
