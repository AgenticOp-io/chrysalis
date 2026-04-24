import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { canaryBucket } from "../src/canary.js";
import {
  compileRules,
  routeFor,
  startChimera,
  type ChimeraHandle,
} from "../src/index.js";

describe("compileRules + routeFor", () => {
  it("matches exact paths", () => {
    const compiled = compileRules([{ match: "/login", target: "modern" }]);
    expect(routeFor(compiled, "GET", "/login")?.target).toBe("modern");
    expect(routeFor(compiled, "GET", "/other")).toBeNull();
  });

  it("matches prefix paths with trailing *", () => {
    const compiled = compileRules([{ match: "/api/*", target: "modern" }]);
    expect(routeFor(compiled, "GET", "/api/users")?.target).toBe("modern");
    expect(routeFor(compiled, "GET", "/apx/users")).toBeNull();
  });

  it("respects method filter", () => {
    const compiled = compileRules([{ match: "POST /posts", target: "modern" }]);
    expect(routeFor(compiled, "POST", "/posts")?.target).toBe("modern");
    expect(routeFor(compiled, "GET", "/posts")).toBeNull();
  });

  it("first-match-wins ordering", () => {
    const compiled = compileRules([
      { match: "/a/*", target: "modern" },
      { match: "/a/stay", target: "legacy" },
    ]);
    expect(routeFor(compiled, "GET", "/a/stay")?.target).toBe("modern");
  });
});

describe("chimera proxy", () => {
  it("rejects canary mode without canary settings", async () => {
    await expect(
      startChimera({
        mode: "canary",
        legacy: "http://127.0.0.1:1",
        modern: "http://127.0.0.1:2",
        rules: [],
      }),
    ).rejects.toThrow(/canary/);
  });

  const servers: Array<{ close: () => Promise<void> }> = [];
  const chimeras: ChimeraHandle[] = [];

  afterEach(async () => {
    for (const h of chimeras) await h.stop();
    chimeras.length = 0;
    for (const s of servers) await s.close();
    servers.length = 0;
  });

  async function mkUpstream(
    handler: (req: import("node:http").IncomingMessage, body: string) =>
      | { status?: number; headers?: Record<string, string>; body: string }
      | Promise<{ status?: number; headers?: Record<string, string>; body: string }>,
  ): Promise<string> {
    const server: Server = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk.toString();
      const out = await handler(req, body);
      res.writeHead(out.status ?? 200, out.headers ?? { "content-type": "text/html" });
      res.end(out.body);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as AddressInfo).port;
    servers.push({ close: () => new Promise<void>((r, rej) => server.close((e) => (e ? rej(e) : r()))) });
    return `http://127.0.0.1:${port}`;
  }

  it("routes all requests to legacy in legacy mode", async () => {
    const legacy = await mkUpstream((req) => ({ body: `legacy:${req.url}` }));
    const modern = await mkUpstream(() => ({ body: "modern" }));
    const h = await startChimera({
      mode: "legacy",
      legacy,
      modern,
      rules: [{ match: "/api/*", target: "modern" }],
    });
    chimeras.push(h);
    const resp = await fetch(`http://127.0.0.1:${h.port}/api/foo`);
    expect(await resp.text()).toBe("legacy:/api/foo");
    expect(resp.headers.get("x-chrysalis-target")).toBe("legacy");
    expect(h.stats().byTarget.legacy).toBe(1);
    expect(h.stats().byTarget.modern).toBe(0);
  });

  it("routes per rule in cutover mode", async () => {
    const legacy = await mkUpstream((req) => ({ body: `legacy:${req.url}` }));
    const modern = await mkUpstream((req) => ({ body: `modern:${req.url}` }));
    const h = await startChimera({
      mode: "cutover",
      legacy,
      modern,
      rules: [{ match: "/api/*", target: "modern" }],
    });
    chimeras.push(h);
    expect(await (await fetch(`http://127.0.0.1:${h.port}/api/foo`)).text()).toBe(
      "modern:/api/foo",
    );
    expect(await (await fetch(`http://127.0.0.1:${h.port}/home`)).text()).toBe(
      "legacy:/home",
    );
    expect(h.stats().byTarget.modern).toBe(1);
    expect(h.stats().byTarget.legacy).toBe(1);
  });

  it("forwards POST bodies", async () => {
    const legacy = await mkUpstream(async (_req, body) => ({ body: `got:${body}` }));
    const modern = await mkUpstream(() => ({ body: "" }));
    const h = await startChimera({ mode: "legacy", legacy, modern, rules: [] });
    chimeras.push(h);
    const resp = await fetch(`http://127.0.0.1:${h.port}/upload`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello world",
    });
    expect(await resp.text()).toBe("got:hello world");
  });

  it("shadow mode: returns legacy to client, diffs modern in background", async () => {
    const legacy = await mkUpstream(() => ({ body: "<h1>legacy</h1>" }));
    const modern = await mkUpstream(() => ({ body: "<h1>modern</h1>" }));
    const shadowDir = mkdtempSync(join(tmpdir(), "chrysalis-shadow-"));
    const h = await startChimera({
      mode: "shadow",
      legacy,
      modern,
      rules: [],
      shadowLogDir: shadowDir,
    });
    chimeras.push(h);

    const resp = await fetch(`http://127.0.0.1:${h.port}/x`);
    expect(await resp.text()).toBe("<h1>legacy</h1>");
    expect(resp.headers.get("x-chrysalis-target")).toBe("legacy-shadow");

    // Wait for the fire-and-observe mirror to complete (counted by
    // agreed+diverged, not the immediate `requests` counter).
    for (let i = 0; i < 40; i++) {
      if (h.stats().shadow.agreed + h.stats().shadow.diverged >= 1) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(h.stats().shadow.requests).toBe(1);
    expect(h.stats().shadow.diverged).toBe(1);

    const log = readFileSync(join(shadowDir, "shadow.ndjson"), "utf8").trim();
    expect(log.length).toBeGreaterThan(0);
    const rec = JSON.parse(log.split("\n")[0]!);
    expect(rec.path).toBe("/x");
    expect(rec.divergences.length).toBeGreaterThan(0);
  });

  it("shadow mode: agreeing responses record zero divergences", async () => {
    const legacy = await mkUpstream(() => ({ body: "<h1>same</h1>" }));
    const modern = await mkUpstream(() => ({ body: "<h1>same</h1>" }));
    const shadowDir = mkdtempSync(join(tmpdir(), "chrysalis-shadow-"));
    const h = await startChimera({
      mode: "shadow",
      legacy,
      modern,
      rules: [],
      shadowLogDir: shadowDir,
    });
    chimeras.push(h);
    await fetch(`http://127.0.0.1:${h.port}/x`);
    for (let i = 0; i < 40; i++) {
      if (h.stats().shadow.agreed + h.stats().shadow.diverged >= 1) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(h.stats().shadow.agreed).toBe(1);
    expect(h.stats().shadow.diverged).toBe(0);
  });

  it("canary: percent 0 keeps modern-eligible routes on legacy", async () => {
    const legacy = await mkUpstream((req) => ({ body: `legacy:${req.url}` }));
    const modern = await mkUpstream((req) => ({ body: `modern:${req.url}` }));
    const h = await startChimera({
      mode: "canary",
      legacy,
      modern,
      rules: [{ match: "/api/*", target: "modern" }],
      canary: { percentModern: 0, salt: "s" },
    });
    chimeras.push(h);
    const resp = await fetch(`http://127.0.0.1:${h.port}/api/x`);
    expect(await resp.text()).toBe("legacy:/api/x");
    expect(resp.headers.get("x-chrysalis-target")).toBe("legacy");
    expect(resp.headers.get("x-chrysalis-canary")).toBe("out");
  });

  it("canary: percent 100 sends modern-eligible routes to modern", async () => {
    const legacy = await mkUpstream((req) => ({ body: `legacy:${req.url}` }));
    const modern = await mkUpstream((req) => ({ body: `modern:${req.url}` }));
    const h = await startChimera({
      mode: "canary",
      legacy,
      modern,
      rules: [{ match: "/api/*", target: "modern" }],
      canary: { percentModern: 100, salt: "s" },
    });
    chimeras.push(h);
    const resp = await fetch(`http://127.0.0.1:${h.port}/api/x`);
    expect(await resp.text()).toBe("modern:/api/x");
    expect(resp.headers.get("x-chrysalis-canary")).toBe("in");
  });

  it("canary: same cookie yields stable target at 50%", async () => {
    const legacy = await mkUpstream(() => ({ body: "legacy" }));
    const modern = await mkUpstream(() => ({ body: "modern" }));
    const salt = "proxy-stickiness";
    let vIn: string | null = null;
    let vOut: string | null = null;
    for (let i = 0; i < 500; i++) {
      const v = `u${i}`;
      const b = canaryBucket(`c:sid=${v}`, salt);
      if (b < 50 && !vIn) vIn = v;
      if (b >= 50 && !vOut) vOut = v;
      if (vIn && vOut) break;
    }
    expect(vIn).not.toBeNull();
    expect(vOut).not.toBeNull();
    const h = await startChimera({
      mode: "canary",
      legacy,
      modern,
      rules: [{ match: "/api/*", target: "modern" }],
      canary: { percentModern: 50, salt, stickinessCookie: "sid" },
    });
    chimeras.push(h);
    const url = `http://127.0.0.1:${h.port}/api/x`;
    const hIn = { headers: { cookie: `sid=${vIn}` } };
    const bodyA = await (await fetch(url, hIn)).text();
    const bodyB = await (await fetch(url, hIn)).text();
    expect(bodyA).toBe(bodyB);
    const bodyC = await (await fetch(url, { headers: { cookie: `sid=${vOut}` } })).text();
    expect(bodyA).not.toBe(bodyC);
  });
});
