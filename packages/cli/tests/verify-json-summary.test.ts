import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, type Trace } from "@chrysalis/oracle";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

function mkTrace(overrides: {
  traceId: string;
  startedAt: string;
  method: string;
  path: string;
  expectedStatus: number;
  expectedBody: string;
}): Trace {
  return {
    header: {
      type: "header",
      schemaVersion: SCHEMA_VERSION,
      traceId: overrides.traceId,
      startedAt: overrides.startedAt,
      php: { version: "8.3.0", sapi: "cli-server" },
      redaction: { configHash: "deadbeef", rules: [] },
    },
    events: [
      {
        type: "http.request",
        method: overrides.method,
        path: overrides.path,
        query: {},
        headers: {},
        cookies: {},
        post: {},
        rawBody: null,
        session: {},
      },
      {
        type: "http.response",
        status: overrides.expectedStatus,
        headers: { "content-type": "text/html" },
        body: overrides.expectedBody,
        bodyTruncated: false,
        session: {},
      },
    ],
    footer: {
      type: "footer",
      endedAt: overrides.startedAt,
      durationUs: 1000,
      eventCount: 2,
      exitStatus: 0,
    },
  };
}

function traceToNdjson(t: Trace): string {
  const lines = [JSON.stringify(t.header), ...t.events.map((e) => JSON.stringify(e)), JSON.stringify(t.footer)];
  return `${lines.join("\n")}\n`;
}

describe("verify --json-summary", () => {
  test("prints one JSON line with schemaVersion and toolVersion", async () => {
    const t = mkTrace({
      traceId: "j1",
      startedAt: "2026-04-28T12:00:00.000Z",
      method: "GET",
      path: "/ok",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    const traceDir = mkdtempSync(join(tmpdir(), "chrysalis-verify-json-"));
    try {
      const dayDir = join(traceDir, "2026-04-28");
      mkdirSync(dayDir, { recursive: true });
      writeFileSync(join(dayDir, "j1.ndjson"), traceToNdjson(t), "utf8");

      const server: Server = createServer((req, res) => {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("ok");
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
      const port = (server.address() as AddressInfo).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      // Do not use spawnSync: it blocks the event loop and this in-process server cannot accept connections.
      const r = await new Promise<{ status: number | null; stdout: string; stderr: string }>((res, rej) => {
        const chunksOut: Buffer[] = [];
        const chunksErr: Buffer[] = [];
        const child = spawn(
          process.execPath,
          [BIN, "verify", traceDir, "--base-url", baseUrl, "--threshold", "0", "--json-summary"],
          {
            cwd: ROOT,
            env: { ...process.env, CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN: "1" },
          },
        );
        child.stdout?.on("data", (d) => chunksOut.push(d as Buffer));
        child.stderr?.on("data", (d) => chunksErr.push(d as Buffer));
        child.on("error", rej);
        child.on("close", (status) => {
          res({
            status,
            stdout: Buffer.concat(chunksOut).toString("utf8"),
            stderr: Buffer.concat(chunksErr).toString("utf8"),
          });
        });
      });

      await new Promise<void>((resolv, rej) => server.close((err) => (err ? rej(err) : resolv())));

      expect(r.status).toBe(0);
      const out = r.stdout.trim().split(/\r?\n/).filter(Boolean);
      expect(out.length).toBe(1);
      const summary = JSON.parse(out[0]!) as {
        kind: string;
        schemaVersion: number;
        toolVersion: string;
        pass: boolean;
      };
      expect(summary.kind).toBe("chrysalis.verify.summary");
      expect(summary.schemaVersion).toBe(1);
      expect(typeof summary.toolVersion).toBe("string");
      expect(summary.toolVersion.length).toBeGreaterThan(0);
      expect(summary.pass).toBe(true);
    } finally {
      rmSync(traceDir, { recursive: true, force: true });
    }
  });
});
