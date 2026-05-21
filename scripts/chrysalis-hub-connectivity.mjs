/**
 * SSH / local connectivity probes for Translation Hub (no cloud APIs).
 */
import { spawn } from "node:child_process";
import { access, constants as fsConstants } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_ORIGIN_AGENT_PATHS = [
  "~/.local/bin/chrysalis-origin-scan",
  "/usr/local/bin/chrysalis-origin-scan",
  "/opt/chrysalis/bin/chrysalis-origin-scan",
];

function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, shell: false });
    const out = [];
    const err = [];
    child.stdout?.on("data", (c) => out.push(c));
    child.stderr?.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      });
    });
    child.on("error", reject);
  });
}

async function commandExists(name) {
  try {
    const r = await runProcess("sh", ["-c", `command -v ${name}`]);
    return r.code === 0;
  } catch {
    return false;
  }
}

async function pathWritable(p) {
  try {
    await access(p, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} stdout
 * @returns {import('./chrysalis-hub-store.mjs').detectLanguagesFromFileList extends Function ? object : object}
 */
export function parseOriginAgentJson(stdout) {
  const j = JSON.parse(stdout.trim());
  if (j.error) throw new Error(j.error);
  if (!Array.isArray(j.languages)) throw new Error("origin-agent: missing languages array");
  return j;
}

export function buildSshArgs(ssh) {
  const port = ssh.port ? String(ssh.port) : "22";
  const args = ["-p", port, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new"];
  if (ssh.identityFile) args.push("-i", ssh.identityFile);
  args.push(`${ssh.user}@${ssh.host}`);
  return args;
}

/**
 * Remote shell command: run origin agent if installed, else inline find fallback.
 */
export function buildRemoteScanShell(remotePath, agentPaths = DEFAULT_ORIGIN_AGENT_PATHS) {
  const escaped = remotePath.replace(/'/g, "'\\''");
  const quotedAgents = agentPaths
    .map((p) => (p.startsWith("~/") ? `"$HOME/${p.slice(2)}"` : `"${p}"`))
    .join(" ");
  return `
ROOT='${escaped}'
for AGENT in ${quotedAgents}; do
  if [ -x "$AGENT" ]; then
    exec "$AGENT" "$ROOT"
  fi
done
find "$ROOT" -type f 2>/dev/null | head -n 8000
`.trim();
}

/**
 * Probe tools on the hub host (local install / same VM as operator web).
 */
export async function probeHubConnectivity() {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail });

  add("node", await commandExists("node"), "Node.js for Chrysalis CLI and operator web");
  add("pnpm", await commandExists("pnpm"), "pnpm workspace (optional if using built dist only)");
  add("php", await commandExists("php"), "PHP for oracle capture and nikic parser bridge");
  add("ssh", await commandExists("ssh"), "OpenSSH client for origin access");
  add("scp", await commandExists("scp"), "OpenSSH scp for code pull");
  add("python3", await commandExists("python3"), "Python3 for origin scan agent");
  add("redis-cli", await commandExists("redis-cli"), "Optional: probe Redis when CHRYSALIS_SESSION_REDIS_URL is set");

  const hubRoot = process.env.CHRYSALIS_HUB_ROOT ?? join(homedir(), ".chrysalis-hub");
  add("hub-registry-writable", await pathWritable(hubRoot), hubRoot);

  const sqlitePath = process.env.CHRYSALIS_DB_PATH;
  if (sqlitePath) {
    const parent = dirname(sqlitePath);
    add("sqlite-path-parent", await pathWritable(parent), sqlitePath);
  }

  const redisUrl = process.env.CHRYSALIS_SESSION_REDIS_URL;
  if (redisUrl && (await commandExists("redis-cli"))) {
    try {
      const r = await runProcess("redis-cli", ["-u", redisUrl, "PING"]);
      add("redis-ping", r.stdout.trim() === "PONG", redisUrl);
    } catch (e) {
      add("redis-ping", false, String(e));
    }
  }

  const agentInstaller = join(__dir, "agents", "install-origin-agent.sh");
  let installerOk = false;
  try {
    await access(agentInstaller, fsConstants.R_OK);
    installerOk = true;
  } catch {
    installerOk = false;
  }
  add("origin-agent-installer", installerOk, agentInstaller);

  const ok = checks.filter((c) => ["node", "ssh", "scp", "hub-registry-writable"].includes(c.id)).every((c) => c.ok);
  return { ok, checks, hubRoot };
}

/**
 * Probe origin host over SSH (agent, python3, php optional).
 */
export async function probeOriginOverSsh(ssh) {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail });

  const sshArgs = buildSshArgs(ssh);
  const pingCmd = "echo chrysalis-probe-ok";
  const ping = await runProcess("ssh", [...sshArgs, pingCmd]);
  add("ssh-reachable", ping.code === 0 && ping.stdout.includes("chrysalis-probe-ok"), ping.stderr.trim() || ssh.host);

  if (ping.code !== 0) {
    return { ok: false, checks };
  }

  const remoteChecks = `
command -v python3 >/dev/null && echo PY_OK || echo PY_MISSING
command -v php >/dev/null && php -v | head -1 || echo PHP_MISSING
for AGENT in ~/.local/bin/chrysalis-origin-scan /usr/local/bin/chrysalis-origin-scan; do
  if [ -x "$AGENT" ]; then echo AGENT_OK:$AGENT; exit 0; fi
done
echo AGENT_MISSING
`;
  const r = await runProcess("ssh", [...sshArgs, remoteChecks]);
  const lines = r.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line === "PY_OK") add("python3", true, "required for chrysalis-origin-scan");
    if (line === "PY_MISSING") add("python3", false, "install python3 on origin");
    if (line.startsWith("PHP_MISSING")) add("php", false, "optional for legacy capture on origin");
    if (line.startsWith("PHP") && !line.startsWith("PHP_MISSING")) add("php", true, line);
    if (line.startsWith("AGENT_OK:")) add("origin-agent", true, line.slice("AGENT_OK:".length));
    if (line === "AGENT_MISSING") {
      add("origin-agent", false, "run scripts/agents/install-origin-agent.sh on origin (see docs/HUB-CONNECTIVITY.md)");
    }
  }

  const ok = checks.filter((c) => c.id === "ssh-reachable" || c.id === "python3").every((c) => c.ok);
  return { ok, checks };
}
