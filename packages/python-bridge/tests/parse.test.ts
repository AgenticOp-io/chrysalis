import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFile, parseSource, resolvePythonBinary, SCHEMA_VERSION } from "../src/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const literalFixture = join(repoRoot, "fixtures/hub-gold-python-literal/app.py");

function pythonAvailable(): boolean {
  return spawnSync(resolvePythonBinary(), ["-c", "import ast"], { encoding: "utf8" }).status === 0;
}

describe("@chrysalis/python-bridge", () => {
  it.skipIf(!pythonAvailable())("parses hub-gold-python-literal routes", async () => {
    const result = await parseFile(literalFixture);
    expect(result.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.routes.length).toBeGreaterThanOrEqual(2);
    const paths = result.routes.map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain("GET /health");
    expect(paths).toContain("GET /ping");
  });

  it.skipIf(!pythonAvailable())("parseSource returns empty routes on syntax error", async () => {
    const result = await parseSource("def broken(");
    expect(result.routes).toEqual([]);
  });

  it.skipIf(!pythonAvailable())("parses request-field returnTree on semantic fixture", async () => {
    const fixture = join(repoRoot, "fixtures/hub-python-semantic-req-res/app.py");
    const result = await parseFile(fixture);
    expect(result.routes.length).toBe(1);
    const route = result.routes[0];
    expect(route.returnKind).toBe("tree");
    expect(route.returnTree?.t).toBe("obj");
    const sources = new Set(
      route.returnTree?.t === "obj"
        ? route.returnTree.entries.map((e) =>
            e.value.t === "ref" ? e.value.source : null,
          ).filter(Boolean)
        : [],
    );
    expect(sources.has("path")).toBe(true);
    expect(sources.has("query")).toBe(true);
    expect(sources.has("body")).toBe(true);
  });

  it.skipIf(!pythonAvailable())("parses status tuple return as statusCode + tree", async () => {
    const src = `from flask import Flask
app = Flask(__name__)

@app.post("/items")
def create_item():
    return {"created": True}, 201
`;
    const result = await parseSource(src);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]?.statusCode).toBe(201);
    expect(result.routes[0]?.returnKind).toBe("tree");
    expect(result.routes[0]?.returnTree).toEqual({
      t: "obj",
      entries: [{ key: "created", value: { t: "lit", v: true } }],
    });
  });

  it.skipIf(!pythonAvailable())("parses hub-gold-starlette @app.route routes", async () => {
    const fixture = join(repoRoot, "fixtures/hub-gold-starlette/app.py");
    const result = await parseFile(fixture);
    expect(result.routes.length).toBe(20);
    const search = result.routes.find((r) => r.path === "/search");
    expect(search?.returnKind).toBe("tree");
    expect(search?.returnTree?.t).toBe("obj");
    const create = result.routes.find((r) => r.method === "POST" && r.path === "/items");
    expect(create?.statusCode).toBe(201);
  });

  it.skipIf(!pythonAvailable())("parses hub-gold-litestar bare @get|post routes", async () => {
    const fixture = join(repoRoot, "fixtures/hub-gold-litestar/app.py");
    const result = await parseFile(fixture);
    expect(result.routes.length).toBe(20);
    const search = result.routes.find((r) => r.path === "/search");
    expect(search?.returnKind).toBe("tree");
    expect(search?.returnTree?.t).toBe("obj");
    const create = result.routes.find((r) => r.method === "POST" && r.path === "/items");
    expect(create?.statusCode).toBe(201);
    const notify = result.routes.find((r) => r.path === "/notify");
    expect(notify?.statusCode).toBe(202);
  });

  it.skipIf(!pythonAvailable())("parses hub-gold-falcon add_route + on_get routes", async () => {
    const fixture = join(repoRoot, "fixtures/hub-gold-falcon/app.py");
    const result = await parseFile(fixture);
    expect(result.routes.length).toBe(20);
    const search = result.routes.find((r) => r.path === "/search");
    expect(search?.returnKind).toBe("tree");
    expect(search?.returnTree?.t).toBe("obj");
    const create = result.routes.find((r) => r.method === "POST" && r.path === "/items");
    expect(create?.statusCode).toBe(201);
    const item = result.routes.find((r) => r.method === "GET" && r.path === "/items/{id}");
    expect(item?.returnKind).toBe("tree");
  });

  it.skipIf(!pythonAvailable())("parses hub-gold-bottle @get|route + query.q + HTTPResponse", async () => {
    const fixture = join(repoRoot, "fixtures/hub-gold-bottle/app.py");
    const result = await parseFile(fixture);
    expect(result.routes.length).toBe(20);
    const search = result.routes.find((r) => r.path === "/search");
    expect(search?.returnKind).toBe("tree");
    expect(search?.returnTree?.t).toBe("obj");
    const qEntry =
      search?.returnTree?.t === "obj"
        ? search.returnTree.entries.find((e) => e.key === "q")
        : undefined;
    expect(qEntry?.value).toEqual({ t: "ref", source: "query", name: "q" });
    const create = result.routes.find((r) => r.method === "POST" && r.path === "/items");
    expect(create?.statusCode).toBe(201);
    expect(create?.returnKind).toBe("tree");
    const notify = result.routes.find((r) => r.path === "/notify");
    expect(notify?.method).toBe("POST");
    expect(notify?.statusCode).toBe(202);
    const item = result.routes.find((r) => r.method === "GET" && r.path === "/items/<id>");
    expect(item?.returnKind).toBe("tree");
  });

  it.skipIf(!pythonAvailable())("parses hub-gold-flask-blueprint url_prefix join", async () => {
    const fixture = join(repoRoot, "fixtures/hub-gold-flask-blueprint/app.py");
    const result = await parseFile(fixture);
    expect(result.routes.length).toBe(20);
    const health = result.routes.find((r) => r.path === "/api/health");
    expect(health?.method).toBe("GET");
    expect(health?.returnKind).toBe("tree");
    const search = result.routes.find((r) => r.path === "/api/search");
    expect(search?.returnKind).toBe("tree");
    const create = result.routes.find((r) => r.method === "POST" && r.path === "/api/items");
    expect(create?.statusCode).toBe(201);
    const item = result.routes.find((r) => r.method === "GET" && r.path === "/api/items/<id>");
    expect(item?.returnKind).toBe("tree");
    const stats = result.routes.find((r) => r.path === "/api/stats");
    expect(stats?.method).toBe("GET");
  });

  it("parse script file exists", () => {
    const script = join(dirname(fileURLToPath(import.meta.url)), "..", "python", "parse_routes.py");
    const src = readFileSync(script, "utf8");
    expect(src).toContain("route_from_decorator");
    expect(src).toContain("add_route");
    expect(src).toContain("peel_http_response");
    expect(src).toContain("request_ref_from_attr");
  });
});
