import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCwlRuntime, loadModuleFromCwlFile } from "../src/index.js";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD_CWL = resolve(ROOT, "fixtures/hub-gold-cwl/routes.cwl");

describe("@chrysalis/runtime-cwl", () => {
  it("serves CWL gold routes via fetch", () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({ module });
    expect(runtime.routes.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /health returns literal true", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/health" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("true");
  });

  it("GET /meta returns JSON object", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/meta" });
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.ok).toBe(true);
    expect(body.version).toBe(1);
  });

  it("GET / on full-stack gold returns HTML (G1151)", async () => {
    const fullstack = resolve(ROOT, "fixtures/hub-gold-cwl-fullstack/routes.cwl");
    const module = loadModuleFromCwlFile(fullstack, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/" });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<h1>Home</h1>");
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
  });

  it("interpolates path params in page HTML (G1189)", async () => {
    const fullstack = resolve(ROOT, "fixtures/hub-flagship-cwl-fullstack/routes.cwl");
    const module = loadModuleFromCwlFile(fullstack, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/docs/intro" });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("intro");
  });

  it("injects configured session map (G6209)", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({
      module,
      session: { user_id: { kind: "num", value: 42 }, role: { kind: "str", value: "admin" } },
    });
    expect(runtime.routes.length).toBeGreaterThanOrEqual(3);
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/health" });
    expect(res.status).toBe(200);
  });

  it("resolveSession maps cookies into handler session (G6210+)", async () => {
    const authEffects = resolve(ROOT, "fixtures/hub-gold-cwl-auth-effects/routes.cwl");
    const module = loadModuleFromCwlFile(authEffects, ROOT);
    let sawCookie = false;
    const runtime = createCwlRuntime({
      module,
      resolveSession: ({ cookies }) => {
        sawCookie = cookies.session_id === "abc123";
        return { user_id: { kind: "str", value: cookies.session_id ?? "" } };
      },
    });
    const res = await runtime.fetch({
      method: "GET",
      url: "http://127.0.0.1/me",
      headers: { cookie: "session_id=abc123" },
    });
    expect(res.status).toBe(200);
    expect(sawCookie).toBe(true);
  });

  it("resolveSession session.read echoes user_id in JSON body (G6211+)", async () => {
    const requestContext = resolve(ROOT, "fixtures/hub-gold-cwl-request-context/routes.cwl");
    const module = loadModuleFromCwlFile(requestContext, ROOT);
    let resolvedSid = "";
    const runtime = createCwlRuntime({
      module,
      resolveSession: ({ cookies }) => {
        resolvedSid = cookies.session_id ?? "";
        return { session_id: { kind: "str", value: resolvedSid } };
      },
    });
    const res = await runtime.fetch({
      method: "GET",
      url: "http://127.0.0.1/auth",
      headers: { cookie: "session_id=42", Authorization: "Bearer tok" },
    });
    expect(res.status).toBe(200);
    expect(resolvedSid).toBe("42");
    const body = JSON.parse(await res.text()) as { sid?: string };
    expect(body.sid).toBe("42");
  });

  it("resolveSession session.read echoes PHP $_SESSION body (G6226)", async () => {
    const { ingestDirectory } = await import("@chrysalis/ingest");
    const probe = resolve(ROOT, "fixtures/session-resolve-probe");
    const module = await ingestDirectory(probe);
    const runtime = createCwlRuntime({
      module,
      resolveSession: ({ cookies }) => ({
        user_id: { kind: "str", value: cookies.session_uid ?? "" },
      }),
    });
    const res = await runtime.fetch({
      method: "GET",
      url: "http://127.0.0.1/whoami",
      headers: { cookie: "session_uid=42" },
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text()) as { user_id?: string };
    expect(body.user_id).toBe("42");
  });

  it("page load sidecar in HTML (G1169)", async () => {
    const pageLoadGold = resolve(ROOT, "fixtures/hub-gold-cwl-page-load/routes.cwl");
    const module = loadModuleFromCwlFile(pageLoadGold, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/blog/hello" });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("cwl-page-load");
    expect(body).toContain('"slug":"hello"');
  });

  it("wraps HTML with UI stylesheet links and serves CSS (G9470)", async () => {
    const { loadCwlUiAssetsFromProject } = await import("../src/index.js");
    const fixture = resolve(ROOT, "fixtures/site-scale-matrix");
    const module = loadModuleFromCwlFile(resolve(fixture, "routes.cwl"), ROOT);
    const uiAssets = loadCwlUiAssetsFromProject(fixture);
    expect(uiAssets).not.toBeNull();
    const runtime = createCwlRuntime({ module, uiAssets: uiAssets! });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/login" });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain('href="/assets/original-css/login.css"');
    expect(body).toContain('href="/assets/original-css/layout.css"');
    expect(body).toContain("login-form");

    const css = await runtime.fetch({
      method: "GET",
      url: "http://127.0.0.1/assets/original-css/login.css",
    });
    expect(css.status).toBe(200);
    expect(css.headers.get("content-type")).toMatch(/text\/css/);
    expect(await css.text()).toContain("login");
  });
});
