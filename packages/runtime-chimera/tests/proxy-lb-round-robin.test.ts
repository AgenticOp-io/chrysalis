/**
 * In-process round-robin proxy in front of two chimera instances (V2-M5 LB harness smoke).
 */
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
} from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { startChimera, type ChimeraHandle } from "../src/index.js";

describe("chimera LB round-robin harness", () => {
  const servers: Array<{ close: () => Promise<void> }> = [];
  const chimeras: ChimeraHandle[] = [];

  afterEach(async () => {
    for (const h of chimeras) await h.stop();
    chimeras.length = 0;
    for (const s of servers) await s.close();
    servers.length = 0;
  });

  async function mkUpstream(tag: string): Promise<string> {
    const server: Server = createServer((req, res) => {
      const path = (req.url ?? "/").split("?")[0] ?? "/";
      if (path.startsWith("/api/")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`${tag}:modern:${path}`);
      } else {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`${tag}:legacy:${path}`);
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as AddressInfo).port;
    servers.push({
      close: () => new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res()))),
    });
    return `http://127.0.0.1:${port}`;
  }

  function stripHopHeaders(h: IncomingMessage["headers"]): Record<string, string | string[]> {
    const hop = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "te",
      "trailers",
      "upgrade",
      "host",
    ]);
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(h)) {
      if (v == null) continue;
      if (hop.has(k.toLowerCase())) continue;
      out[k] = v;
    }
    return out;
  }

  async function mkLb(backends: readonly [number, number]): Promise<number> {
    let rr = 0;
    const lb: Server = createServer((clientReq, clientRes) => {
      const port = backends[rr++ % 2]!;
      const opts = {
        hostname: "127.0.0.1",
        port,
        path: clientReq.url ?? "/",
        method: clientReq.method ?? "GET",
        headers: stripHopHeaders(clientReq.headers),
      };
      const p = httpRequest(opts, (up) => {
        clientRes.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(clientRes);
      });
      p.on("error", () => {
        if (!clientRes.headersSent) clientRes.writeHead(502);
        clientRes.end("lb upstream error");
      });
      clientReq.pipe(p);
    });
    await new Promise<void>((r) => lb.listen(0, "127.0.0.1", r));
    const lbPort = (lb.address() as AddressInfo).port;
    servers.push({
      close: () => new Promise<void>((res, rej) => lb.close((e) => (e ? rej(e) : res()))),
    });
    return lbPort;
  }

  it("round-robin LB reaches both chimera instances", async () => {
    const uA = await mkUpstream("a");
    const uB = await mkUpstream("b");
    const rules = [{ match: "/api/*", target: "modern" as const }];
    const h1 = await startChimera({
      mode: "cutover",
      legacy: uA,
      modern: uA,
      rules,
      host: "127.0.0.1",
      port: 0,
    });
    const h2 = await startChimera({
      mode: "cutover",
      legacy: uB,
      modern: uB,
      rules,
      host: "127.0.0.1",
      port: 0,
    });
    chimeras.push(h1, h2);

    const lbPort = await mkLb([h1.port, h2.port]);
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const r = await fetch(`http://127.0.0.1:${lbPort}/api/x`);
      seen.add(await r.text());
    }
    expect(seen.has("a:modern:/api/x")).toBe(true);
    expect(seen.has("b:modern:/api/x")).toBe(true);
  });
});
