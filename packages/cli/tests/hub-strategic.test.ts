import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("strategic plan deliverables", () => {
  test("hub-capability-matrix lists oracle product pairs including Node pilot", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.schemaVersion).toBe(2);
    expect(report.tiers.oracleProduct.pairCount).toBe(7);
    expect(report.kind).toBe("chrysalis.hub.capability-matrix");
    const nodePilot = report.tiers.oracleProduct.pairs.find(
      (p: { origin: string; output: string }) => p.origin === "javascript" && p.output === "hono",
    );
    expect(nodePilot?.fixture).toBe("fixtures/hub-flagship-express");
  });

  test("hub-evidence verify trend from history", async () => {
    const {
      appendEvidenceSnapshot,
      buildHubEvidenceReport,
      computeEvidenceTrend,
      readEvidenceHistory,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-evidence.mjs"));
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-evidence-trend-"));
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(join(dir, "reports", "verify"), { recursive: true });
      writeFileSync(
        join(dir, "reports", "verify", "summary.json"),
        `${JSON.stringify({
          aggregate: { correctness: 0.8, framesTotal: 10, framesPassed: 8 },
          endpoints: [],
        })}\n`,
      );
      const r1 = buildHubEvidenceReport(dir);
      appendEvidenceSnapshot(dir, r1);
      writeFileSync(
        join(dir, "reports", "verify", "summary.json"),
        `${JSON.stringify({
          aggregate: { correctness: 1, framesTotal: 10, framesPassed: 10 },
          endpoints: [],
        })}\n`,
      );
      const r2 = buildHubEvidenceReport(dir);
      appendEvidenceSnapshot(dir, r2);
      const history = readEvidenceHistory(dir);
      expect(history.length).toBe(2);
      const trend = computeEvidenceTrend(history);
      expect(trend.deltaCorrectness).toBeCloseTo(0.2, 5);
      expect(trend.improving).toBe(true);
      expect(r2.schemaVersion).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hub-evidence reads verify summary when present", async () => {
    const { buildHubEvidenceReport } = await import(resolve(ROOT, "scripts/hub-ingest/hub-evidence.mjs"));
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-evidence-"));
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(join(dir, "reports", "verify"), { recursive: true });
      writeFileSync(
        join(dir, "reports", "verify", "summary.json"),
        `${JSON.stringify({
          aggregate: { correctness: 0.95, framesTotal: 10, framesPassed: 9 },
          endpoints: [{ route: "GET /x", divergences: [{ kinds: ["body-mismatch"] }] }],
        })}\n`,
      );
      const ev = buildHubEvidenceReport(dir);
      expect(ev.verify.available).toBe(true);
      expect(ev.verify.correctness).toBe(0.95);
      expect(ev.playbooks.observed.some((o) => o.kind === "body-mismatch")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hub-migration-program api-slice template", async () => {
    const { buildMigrationProgram } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-migration-programs.mjs")
    );
    const report = buildMigrationProgram({
      origin: "php",
      outputs: ["hono"],
      programId: "api-slice",
    });
    expect(report.program.id).toBe("api-slice");
    expect(report.steps.length).toBeGreaterThan(4);
  });

  test("hub-laravel-verify-gaps produces backlog shape", async () => {
    const {
      buildLaravelVerifyGapsReport,
      resolveFlagshipVerifySummaryPath,
      routeLabelFromTraceFile,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps.mjs"));
    const report = buildLaravelVerifyGapsReport();
    expect(report.kind).toBe("chrysalis.hub.laravel-verify-gaps");
    expect(Array.isArray(report.backlog)).toBe(true);
  });

  test("hub-laravel-verify-gaps reads flagship hono summary", async () => {
    const { buildLaravelVerifyGapsReport, resolveFlagshipVerifySummaryPath } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps.mjs")
    );
    const flagship = join(ROOT, "reports/verify-flagship-laravel-full");
    const summaryPath = resolveFlagshipVerifySummaryPath(flagship);
    if (!summaryPath) return;
    const report = buildLaravelVerifyGapsReport({ reportDirs: [flagship] });
    expect(report.ok).toBe(true);
    expect(report.verify?.correctness).toBe(1);
    expect(report.backlog).toEqual([]);
  });

  test("hub-cwl-openapi-export projects routes", async () => {
    const { webirRoutesToOpenApi3 } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-openapi-export.mjs")
    );
    const doc = webirRoutesToOpenApi3([
      {
        method: "GET",
        path: "/items",
        handlerName: "items_list",
        body: { kind: "literal", value: { ok: true } },
      },
    ]);
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.paths["/items"]?.get?.operationId).toBe("items_list");
  });

  test("hub-express-flagship smoke", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-express-flagship.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const report = JSON.parse(text.slice(start, end + 1));
    expect(report.kind).toBe("chrysalis.hub.express-flagship");
    expect(report.schemaVersion).toBe(2);
    expect(report.lift?.routeCount).toBe(20);
    // G136: surfaces a hole-free CWL projection for the JavaScript-origin flagship.
    expect(report.cwlProjection.total).toBe(20);
    expect(report.cwlProjection.holeFree).toBe(20);
    // G138: the emit now returns real JSON bodies + applies response status, and the
    // live oracle mirrors it, so the projection carries status and trace replay is green.
    expect(report.cwlProjection.withStatus).toBe(2);
    expect(report.cwlProjection.withParams).toBe(5);
    expect(report.cwlProjection.objectBodies).toBeGreaterThanOrEqual(8);
    expect(report.gold?.hono).toBe(true);
    expect(report.traceReplay?.hono).toBe(true);
  });

  test("JS res.status(n).json emit applies status via __respond (G138)", () => {
    // The generated status route buffers the JSON body and responds with __status,
    // so the runtime returns a real application/json body with the explicit status.
    const handler = readFileSync(
      resolve(ROOT, "fixtures/hub-flagship-express/generated/hono/src/handlers/POST__items.ts"),
      "utf8",
    );
    expect(handler).toContain("__status = 201;");
    expect(handler).toContain("__html += JSON.stringify(({ created: true }))");
    expect(handler).toContain("return __respond(c, __html, __status);");
    // A no-status param route still uses the direct c.json path (real JSON body).
    const search = readFileSync(
      resolve(ROOT, "fixtures/hub-flagship-express/generated/hono/src/handlers/GET__search.ts"),
      "utf8",
    );
    expect(search).toContain('c.json(({ q: ((c.req.query("q")) ?? ("")) }))');
  });

  test("JavaScript lift extracts request params + status into a rich CWL projection (G137)", async () => {
    const fixture = resolve(ROOT, "fixtures/hub-gold-js-rich");
    const liftScript = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
    const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "javascript"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(lift.status).toBe(0);
    const liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
    expect(liftReport.holeCount).toBe(0);
    expect(liftReport.routeCount).toBe(7);

    const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
    const { summarizeCwlProjection, listCwlRoutes } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs")
    );
    const raw = JSON.parse(
      readFileSync(join(fixture, ".chrysalis/hub.javascript.webir.json"), "utf8"),
    );
    const mod = webir.moduleFromGoldenSnapshot(raw);
    const proj = summarizeCwlProjection(mod);
    // The lift now surfaces status + path/query params + a query default, hole-free.
    expect(proj.holeFree).toBe(7);
    expect(proj.total).toBe(7);
    expect(proj.withStatus).toBe(2);
    expect(proj.withParams).toBe(5);
    expect(proj.withParamDefaults).toBe(1);
    expect(proj.holeReasons).toEqual([]);

    const routes = listCwlRoutes(mod);
    const byKey = (m: string, p: string) => routes.find((r: any) => r.method === m && r.path === p);
    expect(byKey("POST", "/items")?.status).toBe(201);
    expect(byKey("GET", "/items/:id")?.params).toEqual([{ source: "path", name: "id" }]);
    expect(byKey("GET", "/search")?.params).toEqual([{ source: "query", name: "q", default: "" }]);
    expect(byKey("GET", "/users/:userId")?.contentType).toBe("text/plain; charset=utf-8");

    // CWL emit renders the rich projection faithfully and hole-free.
    const emitCwl = resolve(ROOT, "scripts/hub-ingest/emit-cwl-from-hub.mjs");
    const emit = spawnSync(process.execPath, [emitCwl, fixture, "--origin", "javascript"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(emit.status).toBe(0);
    const emitReport = JSON.parse(emit.stdout.trim().split("\n").pop() ?? "{}");
    expect(emitReport.holeCount).toBe(0);
    const cwl = readFileSync(join(fixture, "generated/cwl/routes.cwl"), "utf8");
    expect(cwl).toMatch(/status 201;/);
    expect(cwl).toMatch(/query q = "";/);
  });

  test("hub-plain-php-flagship smoke", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-plain-php-flagship.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const report = JSON.parse(text.slice(start, end + 1));
    expect(report.kind).toBe("chrysalis.hub.plain-php-flagship");
    expect(report.ingest?.routeCount).toBe(20);
    expect(report.ok).toBe(true);
  });

  test("hub-symfony-flagship smoke", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-symfony-flagship.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const report = JSON.parse(text.slice(start, end + 1));
    expect(report.kind).toBe("chrysalis.hub.symfony-flagship");
    expect(report.ingest?.routeCount).toBe(20);
    expect(report.routesParity?.ok).toBe(true);
    expect(report.ok).toBe(true);
  });

  test("hub-symfony-routes derives manifest from routes.yaml and stays in parity (G120)", async () => {
    const { symfonyYamlToRouteSpecs, symfonyRouteManifestParity, symfonyPathToManifest } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-symfony");
    const derived = symfonyYamlToRouteSpecs(fixture);
    expect(derived.routes.length).toBe(20);

    const itemShow = derived.routes.find((r) => r.method === "GET" && r.path === "/items/:id");
    expect(itemShow?.file).toBe("src/Controller/ItemsShowController.php");
    expect(itemShow?.pathParams).toEqual([{ name: "id", type: "int", phpVar: "id" }]);

    const userShow = derived.routes.find((r) => r.path === "/users/:userId");
    expect(userShow?.pathParams[0]).toEqual({ name: "userId", type: "string", phpVar: "userId" });

    expect(symfonyPathToManifest("/items/{id}").path).toBe("/items/:id");

    const parity = symfonyRouteManifestParity(fixture);
    expect(parity.ok).toBe(true);
    expect(parity.onlyInYaml).toEqual([]);
    expect(parity.onlyInManifest).toEqual([]);
  });

  test("hub-symfony-routes parses #[Route] attributes in parity with manifest (G121)", async () => {
    const { symfonyAttributeRouteSpecs, parseSymfonyAttributeRoute, symfonyRouteManifestParity } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-symfony");

    const attr = parseSymfonyAttributeRoute(
      "#[Route('/items/{id}', name: 'items_show', methods: ['GET'])]\npublic function __invoke(): void {}",
    );
    expect(attr).toEqual({ path: "/items/{id}", methods: ["GET"], name: "items_show" });

    const specs = symfonyAttributeRouteSpecs(fixture);
    expect(specs.routes.length).toBe(20);
    const del = specs.routes.find((r) => r.method === "DELETE" && r.path === "/items/:id");
    expect(del?.file).toBe("src/Controller/ItemsDeleteController.php");

    const parity = symfonyRouteManifestParity(fixture);
    expect(parity.attributes.ok).toBe(true);
    expect(parity.attributes.attributeRouteCount).toBe(20);
    expect(parity.attributes.onlyInAttributes).toEqual([]);
  });

  test("hub-symfony-routes combines class-level #[Route] prefix with method routes (G122)", async () => {
    const { parseSymfonyAttributeRoute, symfonyRouteManifestParity } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );

    const combined = parseSymfonyAttributeRoute(
      "#[Route('/api', name: 'api_')]\nfinal class C {\n#[Route('/items/{id}', name: 'items_show', methods: ['GET'])]\npublic function __invoke(): void {}\n}",
    );
    expect(combined).toEqual({ path: "/api/items/{id}", methods: ["GET"], name: "api_items_show" });

    // No class prefix -> unchanged method route.
    const plain = parseSymfonyAttributeRoute(
      "final class H {\n#[Route('/health', name: 'health', methods: ['GET'])]\npublic function __invoke(): void {}\n}",
    );
    expect(plain).toEqual({ path: "/health", methods: ["GET"], name: "health" });

    const probe = symfonyRouteManifestParity(resolve(ROOT, "fixtures/hub-symfony-attr-prefix"));
    expect(probe.ok).toBe(true);
    expect(probe.attributes.ok).toBe(true);
    expect(probe.manifestRouteCount).toBe(2);
    expect(probe.attributes.onlyInAttributes).toEqual([]);
  });

  test("live Symfony flagship uses class-level #[Route] prefixes in parity (G127)", async () => {
    const { symfonyAttributeRouteSpecs, symfonyRouteManifestParity } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-symfony");

    // The /items/{id} controllers carry a class-level #[Route('/items')] prefix
    // that must resolve to the same paths the manifest/yaml declare.
    const prefixed = ["ItemsShowController", "ItemsUpdateController", "ItemsPatchController", "ItemsDeleteController"];
    for (const cls of prefixed) {
      const src = readFileSync(resolve(fixture, "src/Controller", `${cls}.php`), "utf8");
      expect(src).toMatch(/#\[Route\('\/items', name: 'items_'\)\]\s*\nfinal class/);
      expect(src).toMatch(/#\[Route\('\/\{id\}'/);
    }

    const specs = symfonyAttributeRouteSpecs(fixture).routes;
    expect(specs.length).toBe(20);
    expect(specs.find((r) => r.method === "PATCH")?.path).toBe("/items/:id");

    const parity = symfonyRouteManifestParity(fixture);
    expect(parity.ok).toBe(true);
    expect(parity.attributes.onlyInAttributes).toEqual([]);
  });

  test("Symfony __invoke controller bodies lift into a rich CWL projection (G132)", async () => {
    const { summarizeCwlProjection } = await import(resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs"));
    const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
    const fixture = resolve(ROOT, "fixtures/hub-flagship-symfony");
    const raw = JSON.parse(readFileSync(resolve(fixture, ".chrysalis/hub.php.webir.json"), "utf8"));
    const cov = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));

    // Before G132 the Symfony flagship projected empty route shells (objectBodies 0).
    // The __invoke method bodies now lift like plain-php pages: hole-free + rich.
    expect(cov.total).toBe(20);
    expect(cov.holeFree).toBe(20);
    expect(cov.holeReasons).toEqual([]);
    expect(cov.objectBodies).toBeGreaterThanOrEqual(1);
    expect(cov.withParams).toBeGreaterThanOrEqual(1);
    expect(cov.withStatus).toBeGreaterThanOrEqual(1);
  });

  test("summarizeCwlProjection counts hole-free CWL coverage for the PHP flagship (G131)", async () => {
    const { summarizeCwlProjection } = await import(resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs"));
    const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const raw = JSON.parse(readFileSync(resolve(fixture, ".chrysalis/hub.php.webir.json"), "utf8"));
    const cov = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));

    // 20-route flagship projects hole-free with measurable fidelity coverage.
    expect(cov.total).toBe(20);
    expect(cov.holeFree).toBe(20);
    expect(cov.holeReasons).toEqual([]);
    // At least one route carries each projected feature (status, params, ?? default, object body).
    expect(cov.withStatus).toBeGreaterThanOrEqual(1);
    expect(cov.withParams).toBeGreaterThanOrEqual(1);
    expect(cov.withParamDefaults).toBeGreaterThanOrEqual(1);
    expect(cov.objectBodies).toBeGreaterThanOrEqual(1);
    expect(cov.withContentType).toBeGreaterThanOrEqual(cov.objectBodies);
  });

  test("Symfony class-prefix combines with empty-path collection routes (G130)", async () => {
    const { parseSymfonyAttributeRoute, symfonyAttributeRouteSpecs, symfonyRouteManifestParity } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-symfony");

    // Class prefix + empty method path -> the bare collection path, with combined name.
    const listed = parseSymfonyAttributeRoute(
      "#[Route('/items', name: 'items_')]\nfinal class C {\n#[Route('', name: 'list', methods: ['GET'])]\npublic function __invoke(): void {}\n}",
    );
    expect(listed).toEqual({ path: "/items", methods: ["GET"], name: "items_list" });

    // The live list/create controllers use the empty-path idiom under the prefix.
    for (const cls of ["ItemsListController", "ItemsCreateController"]) {
      const src = readFileSync(resolve(fixture, "src/Controller", `${cls}.php`), "utf8");
      expect(src).toMatch(/#\[Route\('\/items', name: 'items_'\)\]\s*\nfinal class/);
      expect(src).toMatch(/#\[Route\('',\s*name:/);
    }

    // Both resolve to /items (no path param) with the right method + name.
    const items = symfonyAttributeRouteSpecs(fixture).routes.filter((r) => r.path === "/items");
    expect(items.find((r) => r.method === "GET")?.name).toBe("items_list");
    expect(items.find((r) => r.method === "POST")?.name).toBe("items_create");
    expect(items.every((r) => r.pathParams.length === 0)).toBe(true);

    // Full surface + name parity still holds at 20 routes.
    const parity = symfonyRouteManifestParity(fixture);
    expect(parity.ok).toBe(true);
    expect(parity.names.ok).toBe(true);
  });

  test("live Symfony flagship resolves class-level #[Route] name prefixes in parity (G129)", async () => {
    const { parseSymfonyAttributeRoute, symfonyAttributeRouteSpecs, symfonyRouteManifestParity } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-symfony");

    // Class-level `name: 'items_'` + method `name: 'show'` -> `items_show`.
    const resolved = parseSymfonyAttributeRoute(
      "#[Route('/items', name: 'items_')]\nfinal class C {\n#[Route('/{id}', name: 'show', methods: ['GET'])]\npublic function __invoke(): void {}\n}",
    );
    expect(resolved).toEqual({ path: "/items/{id}", methods: ["GET"], name: "items_show" });

    // The four live /items controllers carry the class-level name prefix.
    for (const cls of ["ItemsShowController", "ItemsUpdateController", "ItemsPatchController", "ItemsDeleteController"]) {
      const src = readFileSync(resolve(fixture, "src/Controller", `${cls}.php`), "utf8");
      expect(src).toMatch(/#\[Route\('\/items', name: 'items_'\)\]/);
    }

    // Route names resolved from attributes match the yaml route names exactly.
    const names = symfonyAttributeRouteSpecs(fixture).routes.map((r) => r.name).filter(Boolean).sort();
    expect(names).toContain("items_show");
    expect(names).toContain("items_delete");

    const parity = symfonyRouteManifestParity(fixture);
    expect(parity.names.ok).toBe(true);
    expect(parity.names.yamlNameCount).toBe(20);
    expect(parity.names.attributeNameCount).toBe(20);
    expect(parity.names.onlyInYaml).toEqual([]);
    expect(parity.names.onlyInAttributes).toEqual([]);
  });

  test("CWL preserves ?? query defaults through emit and re-parse (G128)", async () => {
    const { listCwlRoutes } = await import(resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs"));
    const { parseCwlModule } = await import(resolve(ROOT, "scripts/hub-ingest/cwl-parser.mjs"));
    const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const raw = JSON.parse(readFileSync(resolve(fixture, ".chrysalis/hub.php.webir.json"), "utf8"));

    // The walker carries the `$_GET["q"] ?? ""` default onto the param declaration.
    const routes = listCwlRoutes(webir.moduleFromGoldenSnapshot(raw));
    const search = routes.find((r) => r.handlerName === "search");
    expect(search?.params).toEqual([{ source: "query", name: "q", default: "" }]);

    // It re-parses as a defaulted query declaration, not a bare one.
    const parsed = parseCwlModule('@route GET "/search"\nhandler search {\n  query q = "";\n  return { q: q };\n}\n', "r.cwl");
    const route = parsed.routes.find((r) => r.name === "search");
    expect(route?.body).toEqual({ kind: "object", entries: [{ key: "q", value: { kind: "queryParam", name: "q", default: "" } }] });
  });

  test("hub-symfony-routes parses scalar + multi-method #[Route] method lists (G123)", async () => {
    const { parseSymfonyAttributeRoute, symfonyRouteManifestParity } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-routes.mjs")
    );

    // Scalar string form: methods: 'POST' must NOT silently default to GET.
    const scalar = parseSymfonyAttributeRoute(
      "final class C {\n#[Route('/submit', name: 'submit', methods: 'POST')]\npublic function __invoke(): void {}\n}",
    );
    expect(scalar).toEqual({ path: "/submit", methods: ["POST"], name: "submit" });

    // Array form expands to multiple methods.
    const multi = parseSymfonyAttributeRoute(
      "final class C {\n#[Route('/resource', name: 'resource', methods: ['GET', 'POST'])]\npublic function __invoke(): void {}\n}",
    );
    expect(multi).toEqual({ path: "/resource", methods: ["GET", "POST"], name: "resource" });

    const probe = symfonyRouteManifestParity(resolve(ROOT, "fixtures/hub-symfony-attr-methods"));
    expect(probe.ok).toBe(true);
    expect(probe.attributes.ok).toBe(true);
    // 2 declarations -> 3 routes (POST /submit, GET /resource, POST /resource).
    expect(probe.manifestRouteCount).toBe(3);
    expect(probe.attributes.attributeRouteCount).toBe(3);
    expect(probe.attributes.onlyInAttributes).toEqual([]);
  });

  test("hub-node-express-oracle-verify smoke", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-node-express-oracle-verify.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const report = JSON.parse(text.slice(start, end + 1));
    expect(report.kind).toBe("chrysalis.hub.node-express-oracle-verify");
    expect(report.ok).toBe(true);
    expect(report.correctness).toBeGreaterThanOrEqual(1);
    expect(report.traceCount).toBe(20);
  });

  test("hub-node-oracle-spike runs and projects the express flagship (G135)", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-node-oracle-spike.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const report = JSON.parse(text.slice(start, end + 1));
    expect(report.kind).toBe("chrysalis.hub.node-oracle-spike");
    expect(report.schemaVersion).toBe(2);
    // The spike now drives the real 20-route express flagship, hole-free, with a
    // hole-free CWL projection (object bodies present), not just the literal smoke.
    expect(report.expressFlagship.routeCount).toBe(20);
    expect(report.expressFlagship.holeCount).toBe(0);
    expect(report.expressFlagship.cwlProjection.holeFree).toBe(20);
    expect(report.expressFlagship.cwlProjection.objectBodies).toBeGreaterThanOrEqual(1);
  });

  test("project-to-CWL migration export is hole-free with rich projection (G134)", async () => {
    const { exportProjectMigrationCwl } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-project-cwl-export.mjs")
    );
    // Both PHP flagships export a hole-free migration contract via the rich
    // listCwlRoutes projection (v0 literal-only projection would have holed most).
    for (const fixture of ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"]) {
      const meta = await exportProjectMigrationCwl(resolve(ROOT, fixture), { origin: "php" });
      expect(meta.ok).toBe(true);
      expect(meta.schemaVersion).toBe(2);
      expect(meta.routeCount).toBe(20);
      expect(meta.holeCount).toBe(0);
      const cwl = readFileSync(meta.cwlPath, "utf8");
      expect(cwl).toContain("module migration;");
      // Rich projection carries object returns + content-type, not just bare literals.
      expect(cwl).toMatch(/content-type/);
      expect(cwl).toMatch(/return \{/);
    }
  });

  test("hub-oracle-record javascript live-http mode", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "chrysalis-node-live-"));
    const out = join(outDir, "trace.ndjson");
    const server = createServer((req, res) => {
      if (req.url === "/health") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.url === "/meta") {
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("hub");
        return;
      }
      res.statusCode = 404;
      res.end("missing");
    });
    await new Promise<void>((resolveReady) => server.listen(0, "127.0.0.1", () => resolveReady()));
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("failed to bind test server");
    }
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    try {
      const script = resolve(ROOT, "scripts/hub-ingest/hub-oracle-record.mjs");
      const child = spawn(
        process.execPath,
        [script, "--origin", "javascript", "--base-url", baseUrl, "--routes", "GET /health,GET /meta", "--out", out],
        { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (b) => (stdout += String(b)));
      child.stderr.on("data", (b) => (stderr += String(b)));
      const code = await new Promise<number>((resolveExit) =>
        child.on("exit", (c) => resolveExit(c ?? 1)),
      );
      expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
      const text = stdout.trim();
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      const report = JSON.parse(text.slice(start, end + 1));
      expect(report.mode).toBe("live-http");
      expect(report.baseUrl).toBe(baseUrl);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
