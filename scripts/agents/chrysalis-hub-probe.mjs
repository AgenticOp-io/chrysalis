#!/usr/bin/env node
/**
 * Connectivity probe for Translation Hub hosts (hub + optional origin via SSH).
 * Usage: node scripts/agents/chrysalis-hub-probe.mjs [--ssh user@host] [--remote-path /app]
 */
import { probeHubConnectivity, probeOriginOverSsh } from "../chrysalis-hub-connectivity.mjs";

function parseArgs(argv) {
  const out = { ssh: null, remotePath: "/", port: 22, identityFile: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ssh" && argv[i + 1]) {
      const spec = argv[++i];
      const m = spec.match(/^([^@]+)@([^:]+)(?::(\d+))?$/);
      if (!m) throw new Error(`Invalid --ssh spec: ${spec}`);
      out.ssh = { user: m[1], host: m[2], port: m[3] ? Number(m[3]) : 22, remotePath: out.remotePath };
    } else if (a === "--remote-path" && argv[i + 1]) {
      out.remotePath = argv[++i];
      if (out.ssh) out.ssh.remotePath = out.remotePath;
    } else if (a === "--port" && argv[i + 1]) {
      out.port = Number(argv[++i]);
      if (out.ssh) out.ssh.port = out.port;
    } else if (a === "--identity" && argv[i + 1]) {
      out.identityFile = argv[++i];
      if (out.ssh) out.ssh.identityFile = out.identityFile;
    }
  }
  return out;
}

const args = parseArgs(process.argv);
const hub = await probeHubConnectivity();
const report = { hub, origin: null, ok: hub.ok };

if (args.ssh) {
  args.ssh.remotePath = args.remotePath;
  args.ssh.port = args.port;
  args.ssh.identityFile = args.identityFile;
  report.origin = await probeOriginOverSsh(args.ssh);
  report.ok = report.ok && report.origin.ok;
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
