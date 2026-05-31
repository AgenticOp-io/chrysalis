import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    expect(report.schemaVersion).toBe(6);
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
      expect(r2.schemaVersion).toBe(4);
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
    const { buildLaravelVerifyGapsReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps.mjs")
    );
    const report = buildLaravelVerifyGapsReport({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    expect(report.kind).toBe("chrysalis.hub.laravel-verify-gaps");
    expect(Array.isArray(report.backlog)).toBe(true);
    expect(report.backlog.length).toBeGreaterThan(0);
    expect(report.ingestNext?.divergenceKind).toBeTruthy();
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
    expect(report.schemaVersion).toBe(3);
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

  test("OpenAPI -> CWL import is a rich migration contract that round-trips (G139)", async () => {
    const fixture = resolve(ROOT, "fixtures/hub-gold-openapi-cwl");
    const { importOpenApiFileToCwl, openApiDocToCwlRoutes } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-openapi-to-cwl.mjs")
    );

    // Pure conversion: route surface is captured faithfully from the contract.
    const doc = JSON.parse(readFileSync(join(fixture, "openapi.json"), "utf8"));
    const converted = openApiDocToCwlRoutes(doc);
    expect(converted.length).toBe(7);
    const post = converted.find((r: any) => r.method === "POST" && r.path === "/items");
    expect(post?.status).toBe(201);
    const del = converted.find((r: any) => r.method === "DELETE" && r.path === "/items/:id");
    expect(del?.status).toBe(204);
    expect(del?.params).toEqual([{ name: "id", source: "path" }]);
    const search = converted.find((r: any) => r.method === "GET" && r.path === "/search");
    expect(search?.params).toEqual([{ name: "q", source: "query", default: "" }]);
    // No response example -> honest hole, never an invented body.
    const raw = converted.find((r: any) => r.path === "/raw");
    expect(raw?.holeReason).toBe("openapi:no-response-body");

    // Importer writes parseable CWL with the OpenAPI path style converted to `:id`.
    const report = await importOpenApiFileToCwl(join(fixture, "openapi.json"), {
      moduleName: "items_mini",
    });
    expect(report.ok).toBe(true);
    expect(report.routeCount).toBe(7);
    expect(report.holeFree).toBe(6);
    expect(report.withStatus).toBe(2);
    expect(report.withParams).toBe(3);
    const cwlText = readFileSync(report.cwlPath, "utf8");
    expect(cwlText).toMatch(/@route DELETE "\/items\/:id"/);
    expect(cwlText).toMatch(/status 201;/);
    expect(cwlText).toMatch(/query q = "";/);
    // Hole route keeps its known surface (content-type) alongside the body hole.
    expect(cwlText).toMatch(/content-type "application\/json";\n {2}hole openapi:no-response-body;/);

    // Round-trip: ingest the imported CWL back to WebIR, hole-free where the
    // contract was concrete (only the unspecified-body route remains a hole).
    const liftScript = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
    const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "cwl"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(lift.status).toBe(0);
    const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
    const { summarizeCwlProjection } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs")
    );
    const mod = webir.moduleFromGoldenSnapshot(
      JSON.parse(readFileSync(join(fixture, ".chrysalis/hub.cwl.webir.json"), "utf8")),
    );
    const proj = summarizeCwlProjection(mod);
    expect(proj.total).toBe(7);
    expect(proj.holeFree).toBe(6);
    expect(proj.withStatus).toBe(2);
    expect(proj.objectBodies).toBe(5);
    expect(proj.holeReasons).toEqual(["openapi:no-response-body"]);
  });

  test("HAR -> CWL import captures observed traffic and round-trips (G140)", async () => {
    const fixture = resolve(ROOT, "fixtures/hub-gold-har-cwl");
    const { importHarFileToCwl, harDocToCwlRoutes } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-har-to-cwl.mjs")
    );
    const doc = JSON.parse(readFileSync(join(fixture, "mini.har.json"), "utf8"));
    const converted = harDocToCwlRoutes(doc);
    expect(converted.length).toBe(6);
    expect(converted.find((r: any) => r.method === "POST" && r.path === "/items")?.status).toBe(201);
    expect(converted.find((r: any) => r.method === "GET" && r.path === "/search")?.params).toEqual([
      { name: "q", source: "query" },
    ]);

    const report = await importHarFileToCwl(join(fixture, "mini.har.json"), { moduleName: "items_capture" });
    expect(report.ok).toBe(true);
    expect(report.holeFree).toBe(6);
    expect(report.withStatus).toBe(2);

    const lift = spawnSync(process.execPath, [resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs"), fixture, "--language", "cwl"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(lift.status).toBe(0);
    const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
    const { summarizeCwlProjection } = await import(resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs"));
    const mod = webir.moduleFromGoldenSnapshot(
      JSON.parse(readFileSync(join(fixture, ".chrysalis/hub.cwl.webir.json"), "utf8")),
    );
    const proj = summarizeCwlProjection(mod);
    expect(proj.holeFree).toBe(6);
    expect(proj.withStatus).toBe(2);
    expect(proj.objectBodies).toBe(5);
  });

  test("hub-translate prefers OpenAPI import for migration.cwl (G140)", async () => {
    const { exportProjectMigrationCwlFromContractOrWebir } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-contract-cwl-import.mjs")
    );
    const openapiFixture = resolve(ROOT, "fixtures/hub-gold-openapi-cwl");
    const meta = await exportProjectMigrationCwlFromContractOrWebir(openapiFixture, { origin: "javascript" });
    expect(meta.ok).toBe(true);
    expect(meta.source).toBe("openapi-import");
    expect(meta.routeCount).toBe(7);
    expect(meta.holeCount).toBe(1);
    const cwl = readFileSync(meta.cwlPath, "utf8");
    expect(cwl).toContain("module migration;");
    expect(cwl).toMatch(/status 201;/);

    const harDir = mkdtempSync(join(tmpdir(), "chrysalis-har-contract-"));
    try {
      writeFileSync(join(harDir, "mini.har.json"), readFileSync(resolve(ROOT, "fixtures/hub-gold-har-cwl/mini.har.json"), "utf8"));
      const harMeta = await exportProjectMigrationCwlFromContractOrWebir(harDir, { origin: "javascript" });
      expect(harMeta.source).toBe("har-import");
      expect(harMeta.holeCount).toBe(0);
      expect(harMeta.routeCount).toBe(6);
    } finally {
      rmSync(harDir, { recursive: true, force: true });
    }
  });

  test("CWL semantic diff for PR review (G141)", async () => {
    const fixture = resolve(ROOT, "fixtures/hub-gold-cwl-diff");
    const { diffCwlFiles, renderCwlDiffMarkdown, writeProjectCwlDiffArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-diff.mjs")
    );
    const diff = diffCwlFiles(join(fixture, "base.cwl"), join(fixture, "head.cwl"));
    expect(diff.summary.added).toBe(1);
    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.changed).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
    expect(diff.added[0]?.route).toBe("POST /items");
    expect(diff.removed[0]?.route).toBe("GET /gone");
    expect(diff.changed[0]?.route).toBe("GET /items");
    expect(diff.changed[0]?.changes.some((c: any) => c.field === "body")).toBe(true);

    const md = renderCwlDiffMarkdown(diff);
    expect(md).toMatch(/## CWL migration contract diff/);
    expect(md).toMatch(/POST \/items/);
    expect(md).toMatch(/GET \/gone/);

    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-cwl-diff-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(join(tmp, ".chrysalis", "migration.cwl"), readFileSync(join(fixture, "head.cwl"), "utf8"));
      const artifacts = await writeProjectCwlDiffArtifacts(tmp, {
        baseCwl: join(fixture, "base.cwl"),
      });
      expect(artifacts?.summary.added).toBe(1);
      expect(existsSync(artifacts!.jsonPath)).toBe(true);
      expect(existsSync(artifacts!.mdPath)).toBe(true);
      const saved = JSON.parse(readFileSync(artifacts!.jsonPath, "utf8"));
      expect(saved.kind).toBe("chrysalis.hub.cwl-diff");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("site intelligence scan reports languages, routes, and risk (G142)", async () => {
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const { buildSiteIntelligenceReport, writeSiteIntelligenceArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-site-intelligence.mjs")
    );
    const report = await buildSiteIntelligenceReport(fixture);
    expect(report.kind).toBe("chrysalis.hub.site-intelligence");
    expect(report.primaryOrigin).toBe("php");
    expect(report.routeEstimate.count).toBe(20);
    expect(report.routeEstimate.source).toBe("chrysalis.routes.json");
    expect(report.frameworkHints).toContain("plain-php-manifest");
    expect(report.risk.level).toMatch(/low|medium/);

    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-site-intel-"));
    try {
      const artifacts = await writeSiteIntelligenceArtifacts(tmp, report);
      expect(existsSync(artifacts.jsonPath)).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("chimera cutover runbook ties evidence gates to operator phases (G143)", async () => {
    const {
      buildChimeraCutoverRunbook,
      renderChimeraCutoverMarkdown,
      writeChimeraCutoverArtifacts,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-chimera-cutover.mjs"));
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-chimera-cutover-"));
    try {
      mkdirSync(join(tmp, "reports", "verify"), { recursive: true });
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "reports", "verify", "summary.json"),
        readFileSync(resolve(ROOT, "fixtures/ci/tiny-blog-verify-for-status/summary.json"), "utf8"),
      );
      writeFileSync(join(tmp, "chrysalis.holes.json"), JSON.stringify({ holes: [] }, null, 2));
      writeFileSync(join(tmp, ".chrysalis", "migration.cwl"), readFileSync(resolve(ROOT, "fixtures/hub-gold-cwl/routes.cwl"), "utf8"));

      const report = await buildChimeraCutoverRunbook({
        projectDir: tmp,
        origin: "php",
        outputs: ["hono"],
        programId: "api-slice",
      });
      expect(report.kind).toBe("chrysalis.hub.chimera-cutover");
      expect(report.readyForShadow).toBe(true);
      expect(report.phases.map((p: { id: string }) => p.id)).toEqual(["prep", "shadow", "canary", "cutover"]);
      expect(report.operatorMetrics.verifyGatePass).toBe(true);
      expect(report.operatorMetrics.holeCount).toBe(0);

      const md = renderChimeraCutoverMarkdown(report);
      expect(md).toMatch(/Chimera cutover runbook/);
      expect(md).toMatch(/verify-gate/);

      const artifacts = await writeChimeraCutoverArtifacts(tmp, report);
      expect(existsSync(artifacts.jsonPath)).toBe(true);
      expect(existsSync(artifacts.mdPath)).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("migration assessment combines scan, path advice, and readiness tier (G144)", async () => {
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const { buildMigrationAssessment, writeMigrationAssessmentArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-migration-assessment.mjs")
    );
    const report = await buildMigrationAssessment({ projectDir: fixture, origin: "php", output: "hono" });
    expect(report.kind).toBe("chrysalis.hub.migration-assessment");
    expect(report.origin).toBe("php");
    expect(report.output).toBe("hono");
    expect(report.siteIntelligence.routeEstimate.count).toBe(20);
    expect(report.program.id).toBe("api-slice");
    expect(["scan-only", "assess", "pilot-ready", "program-ready", "cutover-ready"]).toContain(report.readinessTier);

    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-assessment-"));
    try {
      const artifacts = await writeMigrationAssessmentArtifacts(tmp, report);
      expect(existsSync(artifacts.jsonPath)).toBe(true);
      expect(existsSync(artifacts.mdPath)).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("apply path advice writes project path-advice.json (G145)", async () => {
    const { writePathAdviceArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-apply-path-advice.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const { jsonPath, report } = await writePathAdviceArtifacts(fixture, {
      origin: "php",
      output: "hono",
    });
    expect(report.kind).toBe("chrysalis.hub.apply-path-advice");
    expect(report.origin).toBe("php");
    expect(report.output).toBe("hono");
    expect(report.goldCoverage.suiteCount).toBeGreaterThan(0);
    expect(report.migrationProgram.id).toBe("api-slice");
    expect(existsSync(jsonPath)).toBe(true);
  });

  test("post-translate artifacts bundle site intel, path advice, assessment, cutover (G146)", async () => {
    const { writeHubPostTranslateArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-post-translate-artifacts.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const report = await writeHubPostTranslateArtifacts(fixture, { origin: "php", output: "hono" });
    expect(report.kind).toBe("chrysalis.hub.post-translate-artifacts");
    expect(report.written.siteIntelligence.ok).toBe(true);
    expect(report.written.pathAdvice.ok).toBe(true);
    expect(report.written.migrationAssessment.ok).toBe(true);
    expect(report.written.chimeraCutover.ok).toBe(true);
    expect(existsSync(join(fixture, ".chrysalis", "path-advice.json"))).toBe(true);
    expect(existsSync(join(fixture, ".chrysalis", "migration-assessment.json"))).toBe(true);
  });

  test("verify gaps ingest ranks divergences into ingest backlog (G147)", async () => {
    const { buildProjectVerifyGapsIngestReport, writeProjectVerifyGapsArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-verify-gaps-ingest.mjs")
    );
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-verify-gaps-"));
    try {
      mkdirSync(join(tmp, "reports", "verify"), { recursive: true });
      writeFileSync(
        join(tmp, "reports", "verify", "summary.json"),
        JSON.stringify(
          {
            aggregate: { correctness: 0.5, framesTotal: 2, framesPassed: 1 },
            endpoints: [
              {
                route: "GET /items",
                divergences: [{ kinds: ["body-mismatch"], details: ["json shape differs"] }],
              },
            ],
          },
          null,
          2,
        ),
      );
      const report = buildProjectVerifyGapsIngestReport(tmp);
      expect(report.kind).toBe("chrysalis.hub.verify-gaps-ingest");
      expect(report.ok).toBe(true);
      expect(report.backlog.length).toBe(1);
      expect(report.backlog[0]?.divergenceKind).toBe("body-mismatch");
      expect(report.ingestNext?.playbook?.title).toMatch(/body/i);

      const artifacts = await writeProjectVerifyGapsArtifacts(tmp, report);
      expect(existsSync(artifacts.jsonPath)).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("chrysalis-ingest-emit runner includes post-ingest-emit delivery step (G148)", async () => {
    const { hubJobSteps } = await import(resolve(ROOT, "scripts/chrysalis-hub-runners.mjs"));
    const steps = hubJobSteps("/repo", "/repo/packages/cli/dist/bin.js", "/tmp/proj", {
      sourceLang: "php",
      targetId: "hono",
      action: "chrysalis-ingest-emit",
    });
    expect(steps.map((s: { kind: string }) => s.kind)).toEqual([
      "ingest",
      "emit",
      "hub-post-ingest-emit",
      "hub-evidence-gate",
    ]);
  });

  test("post-ingest-emit exports contract and delivery artifacts (G148)", async () => {
    const { runHubPostIngestEmit } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-post-ingest-emit.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const report = await runHubPostIngestEmit(fixture, { origin: "php", output: "hono" });
    expect(report.kind).toBe("chrysalis.hub.post-ingest-emit");
    expect(report.cwlExport?.ok).toBe(true);
    expect(report.deliveryArtifacts?.written?.pathAdvice?.ok).toBe(true);
  });

  test("CWL runtime serves gold routes (G154)", async () => {
    const { createCwlRuntime, loadModuleFromCwlFile } = await import("@chrysalis/runtime-cwl");
    const cwl = resolve(ROOT, "fixtures/hub-gold-cwl/routes.cwl");
    const module = loadModuleFromCwlFile(cwl, ROOT);
    const runtime = createCwlRuntime({ module });
    const health = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/health" });
    expect(health.status).toBe(200);
    expect(await health.text()).toBe("true");
    const meta = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/meta" });
    const body = JSON.parse(await meta.text());
    expect(body.ok).toBe(true);
  });

  test("verify gaps ingest action surfaces remediation (G149)", async () => {
    const { runVerifyGapsIngestAction } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-verify-gaps-ingest-action.mjs")
    );
    const report = runVerifyGapsIngestAction(resolve(ROOT, "fixtures/hub-flagship-plain-php"));
    expect(report.kind).toBe("chrysalis.hub.verify-gaps-ingest-action");
    expect(report.ingestRemediation === null || typeof report.ingestRemediation?.suggestedCommand === "string").toBe(
      true,
    );
  });

  test("hub-translate runner bundles post-translate pipeline and evidence gate (G150/G174)", async () => {
    const { hubJobSteps } = await import(resolve(ROOT, "scripts/chrysalis-hub-runners.mjs"));
    const steps = hubJobSteps("/repo", "/repo/packages/cli/dist/bin.js", "/tmp/proj", {
      sourceLang: "php",
      targetId: "hono",
      action: "hub-translate",
    });
    expect(steps.map((s: { kind: string }) => s.kind)).toEqual(["hub-translate", "hub-evidence-gate"]);
  });

  test("post-translate artifacts bundle verify and evidence snapshot (G150)", async () => {
    const { writeHubPostTranslateArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-post-translate-artifacts.mjs")
    );
    const fixture = resolve(ROOT, "fixtures/hub-flagship-plain-php");
    const report = await writeHubPostTranslateArtifacts(fixture, { origin: "php", output: "hono" });
    expect(report.written.verifyGapsIngest?.ok).toBe(true);
    expect(report.written.verifyGapsIngestAction?.ok).toBe(true);
    expect(report.written.evidenceSnapshot?.ok).toBe(true);
  });

  test("post-translate verify skips without traces (G150)", async () => {
    const { runHubPostTranslateVerify } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-post-translate-verify.mjs")
    );
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-hub-verify-"));
    try {
      const report = runHubPostTranslateVerify(tmp);
      expect(report.kind).toBe("chrysalis.hub.post-translate-verify");
      expect(report.ok).toBe(true);
      expect(report.skipped).toBe("no-traces");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("plain-php flagship reports hono=fastify=nextjs emit parity (G151/G157)", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-plain-php-flagship.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const report = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    expect(report.emitParity?.ok).toBe(true);
    expect(report.emitParity?.targets).toEqual(["hono", "fastify", "nextjs"]);
  }, 360_000);

  test("symfony flagship reports hono=fastify=nextjs emit parity (G157)", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-symfony-flagship.mjs");
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const report = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    expect(report.emitParity?.ok).toBe(true);
    expect(report.emitParity?.targets).toEqual(["hono", "fastify", "nextjs"]);
  }, 360_000);

  test("chimera cutover API respects license tier map when enforced (G158)", async () => {
    const { assertHubLicenseAllows, HUB_LICENSE_FEATURES } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-license-status.mjs")
    );
    expect(HUB_LICENSE_FEATURES["hub-chimera-cutover"]?.minTier).toBe("enterprise");
    await expect(assertHubLicenseAllows("hub-chimera-cutover")).resolves.toBeTruthy();
  });

  test("delivery dashboard aggregates migration OS signals (G152)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const report = await buildDeliveryDashboard(resolve(ROOT, "fixtures/hub-flagship-plain-php"), {
      origin: "php",
      output: "hono",
    });
    expect(report.kind).toBe("chrysalis.hub.delivery-dashboard");
    expect(report.schemaVersion).toBe(10);
    expect(report.license?.hubFeatures?.length).toBeGreaterThan(0);
    expect(Array.isArray(report.artifacts)).toBe(true);
  });

  test("delivery dashboard includes CWL preview when migration.cwl exists (G160)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, copyFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-cwl-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      copyFileSync(
        resolve(ROOT, "fixtures/hub-gold-cwl-multi/routes.cwl"),
        join(tmp, ".chrysalis", "migration.cwl"),
      );
      copyFileSync(
        resolve(ROOT, "fixtures/hub-gold-cwl-multi/health.cwl"),
        join(tmp, ".chrysalis", "health.cwl"),
      );
      copyFileSync(
        resolve(ROOT, "fixtures/hub-gold-cwl-multi/meta.cwl"),
        join(tmp, ".chrysalis", "meta.cwl"),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "cwl", output: "hono" });
      expect(report.cwlPreview?.ok).toBe(true);
      expect(report.cwlPreview?.routeCount).toBe(3);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("laravel merged verify gaps feed global ingest backlog (G159)", async () => {
    const { buildLaravelVerifyGapsReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps.mjs")
    );
    const report = buildLaravelVerifyGapsReport({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    expect(report.backlog.length).toBeGreaterThanOrEqual(2);
    expect(report.ingestNext?.ingestOwner).toBe("packages/ingest");
  });

  test("laravel verify gaps resolved fixture has no backlog (G172)", async () => {
    const { buildLaravelVerifyGapsReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps.mjs")
    );
    const report = buildLaravelVerifyGapsReport({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps")],
    });
    expect(report.backlog.length).toBe(0);
    expect(report.ingestNext).toBeNull();
    expect(report.verify?.correctness).toBe(1);
  });

  test("express flagship reports hono=fastify=nextjs emit parity (G161)", () => {
    const script = resolve(ROOT, "scripts/hub-ingest/hub-express-flagship.mjs");
    const r = spawnSync(process.execPath, [script], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 300_000,
      env: { ...process.env, CHRYSALIS_HUB_EXPRESS_ORACLE: "0" },
    });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const report = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    expect(report.emitParity?.ok).toBe(true);
    expect(report.emitParity?.targets).toEqual(["hono", "fastify", "nextjs"]);
  }, 360_000);

  test("hub verify gate requires pro tier when license enforced (G162)", async () => {
    const { HUB_LICENSE_FEATURES } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-license-status.mjs")
    );
    expect(HUB_LICENSE_FEATURES["hub-verify-gate"]?.minTier).toBe("pro");
    expect(HUB_LICENSE_FEATURES["hub-cwl-preview"]?.minTier).toBe("dev");
  });

  test("laravel verify gaps action surfaces global ingest remediation (G163)", async () => {
    const { runLaravelVerifyGapsAction } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps-action.mjs")
    );
    const report = runLaravelVerifyGapsAction({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    expect(report.kind).toBe("chrysalis.hub.laravel-verify-gaps-action");
    expect(report.ingestRemediation?.owner).toBe("packages/ingest");
    expect(report.laravelVerifyGaps.backlogCount).toBeGreaterThanOrEqual(2);
  });

  test("post-translate writes cwl-preview.json when migration.cwl exists (G164)", async () => {
    const { writeHubPostTranslateArtifacts } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-post-translate-artifacts.mjs")
    );
    const { mkdtempSync, mkdirSync, copyFileSync, rmSync, existsSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-cwl-artifact-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      copyFileSync(
        resolve(ROOT, "fixtures/hub-gold-cwl-multi/routes.cwl"),
        join(tmp, ".chrysalis", "migration.cwl"),
      );
      copyFileSync(
        resolve(ROOT, "fixtures/hub-gold-cwl-multi/health.cwl"),
        join(tmp, ".chrysalis", "health.cwl"),
      );
      copyFileSync(
        resolve(ROOT, "fixtures/hub-gold-cwl-multi/meta.cwl"),
        join(tmp, ".chrysalis", "meta.cwl"),
      );
      const report = await writeHubPostTranslateArtifacts(tmp, { origin: "cwl", output: "hono" });
      expect(report.written.cwlPreview?.ok).toBe(true);
      expect(existsSync(join(tmp, ".chrysalis", "cwl-preview.json"))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion carries schema 41 sections (G165)", async () => {
    const { buildHubLaravelMinSmokeReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-min-smoke.mjs")
    );
    const { buildLaravelVerifyGapsReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps.mjs")
    );
    const gaps = buildLaravelVerifyGapsReport({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    const smoke = buildHubLaravelMinSmokeReport({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    expect(gaps.ingestNext?.divergenceKind).toBeTruthy();
    expect(gaps.backlog.length).toBeGreaterThan(0);
    expect(smoke.ok).toBe(true);
  });

  test("verify license gate covers async job entry point (G166)", async () => {
    const { HUB_LICENSE_FEATURES } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-license-status.mjs")
    );
    expect(HUB_LICENSE_FEATURES["hub-verify-gate"]?.minTier).toBe("pro");
  });

  test("laravel-min smoke links scaffold routes to verify gaps (G167)", async () => {
    const { buildHubLaravelMinSmokeReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-min-smoke.mjs")
    );
    const report = buildHubLaravelMinSmokeReport({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    expect(report.kind).toBe("chrysalis.hub.laravel-min-smoke");
    expect(report.routeCount).toBeGreaterThanOrEqual(15);
    expect(report.laravelVerifyGaps.backlogCount).toBeGreaterThanOrEqual(2);
  });

  test("delivery dashboard v4 surfaces laravel global action (G168)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v4-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, ".chrysalis", "site-intelligence.json"),
        `${JSON.stringify({ frameworkHints: ["laravel"] })}\n`,
      );
      writeFileSync(
        join(tmp, ".chrysalis", "cwl-preview.json"),
        `${JSON.stringify({ ok: true, routeCount: 5, holeCount: 0 })}\n`,
      );
      const report = await buildDeliveryDashboard(tmp, {
        origin: "php",
        output: "hono",
        laravelGapsReportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
      });
      expect(report.schemaVersion).toBe(10);
      expect(report.cwlPreview?.routeCount).toBe(5);
      expect(report.laravelGlobalAction?.ingestRemediation?.owner).toBe("packages/ingest");
      expect(report.month3Program?.oracleMicro?.fixture).toBe("fixtures/tiny-blog");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("migration assessment includes laravel global action (G169)", async () => {
    const { buildMigrationAssessment } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-migration-assessment.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-assess-laravel-"));
    try {
      writeFileSync(
        join(tmp, "composer.json"),
        `${JSON.stringify({ require: { "laravel/framework": "^11.0" } })}\n`,
      );
      const report = await buildMigrationAssessment({
        projectDir: tmp,
        origin: "php",
        output: "hono",
        laravelGapsReportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
      });
      expect(report.laravelGlobalAction?.ingestRemediation?.divergenceKind).toBeTruthy();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub evidence v3 adds verify-gaps blockers for Laravel sites (G170)", async () => {
    const { buildHubEvidenceReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-evidence.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-evidence-v3-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, ".chrysalis", "site-intelligence.json"),
        `${JSON.stringify({ frameworkHints: ["laravel"] })}\n`,
      );
      writeFileSync(join(tmp, ".chrysalis", "migration.cwl"), "module x;\nroute GET /health { return true; }\n");
      const report = buildHubEvidenceReport(tmp);
    expect(report.schemaVersion).toBe(4);
    expect(report.verifyGaps.laravelGlobal?.available).toBe(true);
      expect(report.verifyGaps.project.backlogCount).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 42 sections present (G171)", async () => {
    const { runLaravelVerifyGapsAction } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-gaps-action.mjs")
    );
    const action = runLaravelVerifyGapsAction({
      reportDirs: [resolve(ROOT, "fixtures/hub-laravel-verify-gaps-backlog")],
    });
    expect(action.ingestRemediation?.divergenceKind).toBeTruthy();
  });

  test("laravel verify export reads live flagship summary (G173)", async () => {
    const { exportHubLaravelVerifyLive } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-export.mjs")
    );
    const liveSummary = resolve(ROOT, "reports/verify-flagship-laravel-full/hono/summary.json");
    const { existsSync } = await import("node:fs");
    if (!existsSync(liveSummary)) {
      expect(true).toBe(true);
      return;
    }
    const report = exportHubLaravelVerifyLive();
    expect(report.ok).toBe(true);
    expect(report.aggregate?.correctness).toBeGreaterThanOrEqual(0);
  });

  test("hub evidence v4 includes migration plan and pipeline gate (G174)", async () => {
    const { buildHubEvidenceReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-evidence.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-evidence-v4-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, ".chrysalis", "migration-assessment.json"),
        `${JSON.stringify({
          readinessTier: "pilot-ready",
          origin: "php",
          output: "hono",
          program: { id: "api-slice" },
          nextSteps: ["Run verify replay", "Clear residual holes"],
        })}\n`,
      );
      writeFileSync(join(tmp, ".chrysalis", "migration.cwl"), "module x;\nroute GET /health { return true; }\n");
      const report = buildHubEvidenceReport(tmp);
      expect(report.schemaVersion).toBe(4);
      expect(report.migrationPlan?.programId).toBe("api-slice");
      expect(report.pipelineGate?.readinessTier).toBe("pilot-ready");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("oracle micro-fixture metadata points at tiny-blog (G176)", async () => {
    const { buildOracleMicroFixtureReport, ORACLE_MICRO_FIXTURE } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-oracle-micro-fixture.mjs")
    );
    const report = buildOracleMicroFixtureReport();
    expect(report.fixture).toBe(ORACLE_MICRO_FIXTURE);
    expect(report.routeCount).toBeGreaterThan(0);
    expect(report.exists).toBe(true);
  });

  test("CWL RFC-0006 runtime status smoke passes gold replay (G177)", async () => {
    const { runCwlResponseStatusSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-response-status-smoke.mjs")
    );
    const report = await runCwlResponseStatusSmoke();
    expect(report.ok).toBe(true);
    expect(report.cwlProjection?.withStatus).toBeGreaterThanOrEqual(2);
  }, 180_000);

  test("PHP Next.js flagship verify skips or passes with WPTP (G178)", async () => {
    const { runPhpNextjsFlagshipVerify } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-nextjs-verify.mjs")
    );
    const report = await runPhpNextjsFlagshipVerify();
    expect(report.fixture).toBe("fixtures/hub-flagship-plain-php");
    expect(report.ok === true || report.skip === "no-wptp-emit-nextjs").toBe(true);
  }, 300_000);

  test("project-to-CWL oracle gates export hole-free flagships (G179)", async () => {
    const { runProjectToCwlOracleGates } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-project-to-cwl-gates.mjs")
    );
    const report = await runProjectToCwlOracleGates();
    expect(report.ok).toBe(true);
    expect(report.schemaVersion).toBe(3);
    expect(report.exports.plainPhp.holeCount).toBe(0);
    expect(report.exports.symfony.holeCount).toBe(0);
    expect(report.exports.express.holeCount).toBe(0);
    expect(report.exports.laravelMin?.ok).toBe(true);
    expect(report.exports.tinyBlog?.ok).toBe(true);
  });

  test("hub completion schema 44 sections present (G180)", async () => {
    const { exportHubLaravelVerifyLive } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-verify-export.mjs")
    );
    const live = exportHubLaravelVerifyLive();
    expect(live.ok === true || live.error === "missing-summary").toBe(true);
    const { runCwlResponseStatusSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-response-status-smoke.mjs")
    );
    const statusSmoke = await runCwlResponseStatusSmoke();
    expect(statusSmoke.ok).toBe(true);
  }, 180_000);

  test("PHP Next.js symfony flagship verify skips or passes with WPTP (G181)", async () => {
    const { runPhpNextjsSymfonyFlagshipVerify } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-nextjs-verify.mjs")
    );
    const report = await runPhpNextjsSymfonyFlagshipVerify();
    expect(report.fixture).toBe("fixtures/hub-flagship-symfony");
    expect(report.ok === true || report.skip === "no-wptp-emit-nextjs").toBe(true);
  }, 300_000);

  test("CWL RFC-0005 request body runtime smoke passes (G182)", async () => {
    const { runCwlRequestBodySmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-request-body-smoke.mjs")
    );
    const report = await runCwlRequestBodySmoke();
    expect(report.ok).toBe(true);
    expect(report.cwlProjection?.total).toBeGreaterThanOrEqual(2);
    expect(report.traceReplay["cwl-request-body-hono"]).toBe(true);
  }, 180_000);

  test("capability matrix v6 lists migration OS smokes (G256)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(8);
    expect(report.migrationOs?.script).toBe("pnpm run hub:migration-os-smoke");
    expect(report.cwlInterchange?.allRfcRoundtripScript).toBe("pnpm run hub:cwl-all-rfc-roundtrip-smoke");
  });

  test("hub evidence smoke on plain-php flagship (G184)", async () => {
    const { runHubEvidenceSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-evidence-smoke.mjs")
    );
    const report = await runHubEvidenceSmoke();
    expect(report.ok).toBe(true);
    expect(report.evidence?.schemaVersion).toBe(4);
  }, 120_000);

  test("contract CWL smoke covers OpenAPI import and WebIR projection (G186)", async () => {
    const { runContractCwlSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-contract-cwl-smoke.mjs")
    );
    const report = await runContractCwlSmoke();
    expect(report.ok).toBe(true);
    expect(report.openapiImport?.source).toBe("openapi-import");
    expect(report.webirProjection?.source).toBe("webir-projection");
  }, 120_000);

  test("delivery dashboard v7 surfaces month3 RFC smokes (G198/G227)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v5-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, ".chrysalis", "site-intelligence.json"),
        `${JSON.stringify({ frameworkHints: ["plain-php"] })}\n`,
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.schemaVersion).toBe(10);
      expect(report.month3Program?.evidenceSmoke).toBe("hub:evidence-smoke");
      expect(report.month3Program?.translateE2e).toBe("hub:translate-e2e-smoke");
      expect(report.month3Program?.cwlRfcSmokes).toContain("hub:cwl-request-context-smoke");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 45 sections present (G190)", async () => {
    const { runCwlRequestBodySmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-request-body-smoke.mjs")
    );
    const { runHubEvidenceSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-evidence-smoke.mjs")
    );
    const body = await runCwlRequestBodySmoke();
    const evidence = await runHubEvidenceSmoke();
    expect(body.ok).toBe(true);
    expect(evidence.ok).toBe(true);
  }, 180_000);

  test("CWL body projection is hole-free with body params (G191)", async () => {
    const { runCwlRequestBodySmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-request-body-smoke.mjs")
    );
    const report = await runCwlRequestBodySmoke();
    expect(report.ok).toBe(true);
    expect(report.projectionOk).toBe(true);
    expect(report.cwlProjection?.holeFree).toBe(report.cwlProjection?.total);
    expect(report.cwlProjection?.withBodyParams).toBeGreaterThanOrEqual(2);
  }, 60_000);

  test("hub-translate E2E on plain-php flagship (G192)", async () => {
    const { runHubTranslateE2eSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-translate-e2e-smoke.mjs")
    );
    const report = runHubTranslateE2eSmoke();
    if (report.skip === "missing-cli-dist") {
      expect(report.skip).toBe("missing-cli-dist");
      return;
    }
    expect(report.ok).toBe(true);
    expect(report.cwlExport?.holeCount).toBe(0);
    expect(report.migrationCwlExists).toBe(true);
  }, 300_000);

  test("CWL body round-trip smoke (G197)", async () => {
    const { runCwlBodyRoundtripSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-body-roundtrip-smoke.mjs")
    );
    const report = await runCwlBodyRoundtripSmoke();
    expect(report.ok).toBe(true);
    expect(report.forwardProjection?.holeFree).toBe(report.forwardProjection?.total);
    expect(report.roundProjection?.holeFree).toBe(report.roundProjection?.total);
  }, 60_000);

  test("hub evidence live with pipeline gate pass (G194)", async () => {
    const { runHubEvidenceLive } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-evidence-live.mjs")
    );
    const report = await runHubEvidenceLive(undefined, { profile: "plainPhp" });
    expect(report.ok).toBe(true);
    expect(report.evidence?.pipelineGatePass).toBe(true);
  }, 120_000);

  test("delivery dashboard v7 strict env keys (G227)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v6-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, ".chrysalis", "site-intelligence.json"),
        `${JSON.stringify({ frameworkHints: ["plain-php"] })}\n`,
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.schemaVersion).toBe(10);
      expect(report.month3Program?.evidenceLive).toBe("hub:evidence-live");
      expect(report.month4Program?.migrationOsSmoke).toBe("hub:migration-os-smoke");
      expect(report.month3Program?.pipelineGateStrictEnv).toBe("CHRYSALIS_HUB_PIPELINE_GATE_STRICT");
      expect(report.month3Program?.requireWptpNextjsEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("capability matrix v7 lists CWL params and migration OS standalone smokes (G281)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(8);
    expect(report.cwlInterchange?.pathParamsScript).toBe("pnpm run hub:cwl-path-params-smoke");
    expect(report.migrationOsStandalone?.standaloneBatchScript).toBe(
      "pnpm run hub:migration-os-standalone-batch-smoke",
    );
  });

  test("hub completion schema 50 smokes present (G320)", async () => {
    const { runExpressDeliveryBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-express-delivery-batch-smoke.mjs")
    );
    const { runCwlInterchangeBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-interchange-batch-smoke.mjs")
    );
    const { runSymfonyMigrationOsBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-symfony-migration-os-batch-smoke.mjs")
    );
    const express = await runExpressDeliveryBatchSmoke();
    const interchange = await runCwlInterchangeBatchSmoke();
    const symfony = await runSymfonyMigrationOsBatchSmoke();
    expect(express.ok).toBe(true);
    expect(interchange.ok).toBe(true);
    expect(symfony.ok).toBe(true);
  }, 300_000);

  test("hub completion schema 51 smokes present (G350)", async () => {
    const { runLaravelMinDeliveryBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-min-delivery-batch-smoke.mjs")
    );
    const { runThreeOriginDeliveryBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-three-origin-delivery-batch-smoke.mjs")
    );
    const { runLaravelDepthBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-depth-batch-smoke.mjs")
    );
    const { runCwlFullBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-full-batch-smoke.mjs")
    );
    const laravelMin = await runLaravelMinDeliveryBatchSmoke();
    const threeOrigin = await runThreeOriginDeliveryBatchSmoke();
    const laravelDepth = runLaravelDepthBatchSmoke();
    const cwlFull = await runCwlFullBatchSmoke();
    expect(laravelMin.ok).toBe(true);
    expect(threeOrigin.ok).toBe(true);
    expect(laravelDepth.ok).toBe(true);
    expect(cwlFull.ok).toBe(true);
  }, 600_000);

  test("capability matrix v9 lists Laravel-min delivery smokes (G344)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(9);
    expect(report.laravelMinDelivery?.deliveryBatchScript).toBe("pnpm run hub:laravel-min-delivery-batch-smoke");
    expect(report.threeOriginDelivery?.batchScript).toBe("pnpm run hub:three-origin-delivery-batch-smoke");
  });

  test("delivery dashboard v11 surfaces month7 Laravel-min batches (G345)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v11-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(11);
      expect(report.month7Program?.laravelMinDeliveryBatch).toBe("hub:laravel-min-delivery-batch-smoke");
      expect(report.month7Program?.requireLaravelMinEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 52 smokes present (G380)", async () => {
    const { runFourOriginDeliveryBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-four-origin-delivery-batch-smoke.mjs")
    );
    const { runFullDeliveryMegaBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-full-delivery-mega-batch-smoke.mjs")
    );
    const { runOracleStandaloneBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-oracle-standalone-batch-smoke.mjs")
    );
    const { runCwlMegaBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-mega-batch-smoke.mjs")
    );
    const fourOrigin = await runFourOriginDeliveryBatchSmoke();
    const fullDelivery = await runFullDeliveryMegaBatchSmoke();
    const oracle = await runOracleStandaloneBatchSmoke();
    const cwlMega = await runCwlMegaBatchSmoke();
    expect(fourOrigin.ok).toBe(true);
    expect(fullDelivery.ok).toBe(true);
    expect(oracle.ok).toBe(true);
    expect(cwlMega.ok).toBe(true);
  }, 900_000);

  test("capability matrix v10 lists four-origin delivery smokes (G374)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(10);
    expect(report.fourOriginDelivery?.batchScript).toBe("pnpm run hub:four-origin-delivery-batch-smoke");
    expect(report.hubRunnerBatch?.schemaVersion).toBe(3);
  });

  test("delivery dashboard v12 surfaces month8 mega batches (G375)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v12-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(12);
      expect(report.month8Program?.fourOriginDeliveryBatch).toBe("hub:four-origin-delivery-batch-smoke");
      expect(report.month8Program?.requireFourOriginEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 53 smokes present (G410)", async () => {
    const { runAllDeliveryUltraMegaBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-all-delivery-ultra-mega-batch-smoke.mjs")
    );
    const { runOracleProductUltraBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs")
    );
    const { runMigrationOsMegaBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-migration-os-mega-batch-smoke.mjs")
    );
    const { runTinyBlogDepthBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-tiny-blog-depth-batch-smoke.mjs")
    );
    const allDelivery = await runAllDeliveryUltraMegaBatchSmoke();
    const oracle = await runOracleProductUltraBatchSmoke();
    const migrationOs = await runMigrationOsMegaBatchSmoke();
    const tinyBlog = await runTinyBlogDepthBatchSmoke();
    expect(allDelivery.ok).toBe(true);
    expect(oracle.ok).toBe(true);
    expect(migrationOs.ok).toBe(true);
    expect(tinyBlog.ok).toBe(true);
  }, 900_000);

  test("capability matrix v11 lists ultra mega batches (G401)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(11);
    expect(report.allDeliveryUltraMega?.batchScript).toBe("pnpm run hub:all-delivery-ultra-mega-batch-smoke");
    expect(report.deliveryPipelineRunner?.schemaVersion).toBe(3);
  });

  test("delivery dashboard v13 surfaces month9 ultra batches (G402)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v13-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(13);
      expect(report.month9Program?.oracleProductUltraBatch).toBe("hub:oracle-product-ultra-batch-smoke");
      expect(report.month9Program?.requireOracleUltraEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 54 smokes present (G440)", async () => {
    const { runOriginDepthUltraBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-origin-depth-ultra-batch-smoke.mjs")
    );
    const { runChimeraAssessmentMegaBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-chimera-assessment-mega-batch-smoke.mjs")
    );
    const { runVerifyProductUltraBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-verify-product-ultra-batch-smoke.mjs")
    );
    const { runChimeraCutoverOriginBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-chimera-cutover-origin-batch-smoke.mjs")
    );
    const originDepth = await runOriginDepthUltraBatchSmoke();
    const chimeraAssessment = await runChimeraAssessmentMegaBatchSmoke();
    const verifyProduct = await runVerifyProductUltraBatchSmoke();
    const chimeraOrigin = await runChimeraCutoverOriginBatchSmoke();
    expect(originDepth.ok).toBe(true);
    expect(chimeraAssessment.ok).toBe(true);
    expect(verifyProduct.ok).toBe(true);
    expect(chimeraOrigin.ok).toBe(true);
  }, 900_000);

  test("capability matrix v12 lists origin depth batches (G430)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(12);
    expect(report.originDepth?.ultraBatchScript).toBe("pnpm run hub:origin-depth-ultra-batch-smoke");
    expect(report.chimeraAssessmentMega?.batchScript).toBe("pnpm run hub:chimera-assessment-mega-batch-smoke");
  });

  test("delivery dashboard v14 surfaces month10 origin depth batches (G431)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v14-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(14);
      expect(report.month10Program?.originDepthUltraBatch).toBe("hub:origin-depth-ultra-batch-smoke");
      expect(report.month10Program?.requireOriginDepthEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 55 universal CWL all origins (G470)", async () => {
    const { runProjectToCwlAllOrigins } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-project-to-cwl-all-origins.mjs")
    );
    const { runCwlUniversalMegaBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-universal-mega-batch-smoke.mjs")
    );
    const { CWL_ORIGIN_FIXTURES } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-origin-fixtures.mjs")
    );
    expect(CWL_ORIGIN_FIXTURES.length).toBe(23);
    const allOrigins = await runProjectToCwlAllOrigins();
    const universal = await runCwlUniversalMegaBatchSmoke();
    expect(allOrigins.ok).toBe(true);
    expect(allOrigins.originCount).toBe(23);
    expect(universal.ok).toBe(true);
  }, 600_000);

  test("capability matrix v14 lists pattern-literal CWL (G484)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.cwlAllOrigins?.originCount).toBe(23);
    expect(report.cwlAllOrigins?.patternLiteralCwlBatchScript).toBe("pnpm run hub:cwl-pattern-literal-cwl-batch-smoke");
    expect(report.cwlAllOrigins?.patternLiteralCwlSuiteCount).toBe(18);
  });

  test("capability matrix v13 lists universal CWL all origins (G450)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.cwlAllOrigins?.originCount).toBe(23);
    expect(report.cwlAllOrigins?.batchScript).toBe("pnpm run hub:cwl-all-origins-batch-smoke");
  });

  test("delivery dashboard v16 surfaces month12 pattern-literal CWL (G485)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v16-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month12Program?.cwlPatternLiteralCwlBatch).toBe("hub:cwl-pattern-literal-cwl-batch-smoke");
      expect(report.month12Program?.requirePatternLiteralCwlEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("delivery dashboard v15 surfaces month11 universal CWL (G451)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v15-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month11Program?.cwlAllOriginsBatch).toBe("hub:cwl-all-origins-batch-smoke");
      expect(report.month11Program?.requireUniversalCwlEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 56 pattern-literal CWL (G500)", async () => {
    const { runCwlPatternLiteralCwlBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-pattern-literal-cwl-batch-smoke.mjs")
    );
    const { runHubTranslateCwlCoverageSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-translate-cwl-coverage-smoke.mjs")
    );
    const { hubGoldStructuralSuiteIds } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gold-manifest.mjs")
    );
    expect(hubGoldStructuralSuiteIds().length).toBe(154);
    const patternBatch = runCwlPatternLiteralCwlBatchSmoke();
    expect(patternBatch.ok).toBe(true);
    expect(patternBatch.suiteCount).toBe(18);
    const translateCwl = runHubTranslateCwlCoverageSmoke();
    expect(translateCwl.ok).toBe(true);
    expect(translateCwl.originCount).toBe(23);
  }, 600_000);

  test("hub completion schema 57 CWL roundtrip + translate all origins (G530)", async () => {
    const { runCwlPatternLiteralRoundtripBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-pattern-literal-roundtrip-batch-smoke.mjs")
    );
    const { runHubTranslateCwlCoverageSmoke, HUB_TRANSLATE_CWL_COVERAGE_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-translate-cwl-coverage-smoke.mjs")
    );
    expect(HUB_TRANSLATE_CWL_COVERAGE_SCHEMA_VERSION).toBe(2);
    const roundtrip = runCwlPatternLiteralRoundtripBatchSmoke();
    expect(roundtrip.ok).toBe(true);
    expect(roundtrip.suiteCount).toBe(21);
    const translateCwl = runHubTranslateCwlCoverageSmoke();
    expect(translateCwl.ok).toBe(true);
    expect(translateCwl.originCount).toBe(23);
  }, 900_000);

  test("capability matrix v15 lists CWL roundtrip + translate-all (G505)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.cwlAllOrigins?.patternLiteralRoundtripSuiteCount).toBe(21);
    expect(report.cwlAllOrigins?.translateCwlOriginCount).toBe(23);
  });

  test("delivery dashboard v17 surfaces month13 roundtrip (G506)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v17-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month13Program?.cwlPatternLiteralRoundtripBatch).toBe(
        "hub:cwl-pattern-literal-roundtrip-batch-smoke",
      );
      expect(report.month13Program?.requireTranslateCwlAllOriginsEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 58 CWL universe roundtrip (G560)", async () => {
    const { runCwlFlagshipRoundtripBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-flagship-roundtrip-batch-smoke.mjs")
    );
    const { runHubTranslateCwlRoundtripSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-translate-cwl-roundtrip-smoke.mjs")
    );
    const { runCwlUniversalMegaBatchSmoke, HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-universal-mega-batch-smoke.mjs")
    );
    expect(HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
    const flagship = runCwlFlagshipRoundtripBatchSmoke();
    expect(flagship.ok).toBe(true);
    expect(flagship.suiteCount).toBe(3);
    const translateRoundtrip = runHubTranslateCwlRoundtripSmoke();
    expect(translateRoundtrip.ok).toBe(true);
    expect(translateRoundtrip.originCount).toBe(23);
    const universal = await runCwlUniversalMegaBatchSmoke();
    expect(universal.ok).toBe(true);
    expect(universal.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(universal.translateCwlRoundtrip?.ok).toBe(true);
    expect(universal.patternLiteralRoundtrip?.ok).toBe(true);
  }, 1_200_000);

  test("hub completion schema 59 project-to-CWL roundtrip (G590)", async () => {
    const { runProjectToCwlRoundtripSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-project-to-cwl-roundtrip-smoke.mjs")
    );
    const { runCwlUniversalMegaBatchSmoke, HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-universal-mega-batch-smoke.mjs")
    );
    expect(HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION).toBeGreaterThanOrEqual(3);
    const projectRoundtrip = await runProjectToCwlRoundtripSmoke();
    expect(projectRoundtrip.ok).toBe(true);
    expect(projectRoundtrip.originCount).toBe(23);
    const universal = await runCwlUniversalMegaBatchSmoke();
    expect(universal.ok).toBe(true);
    expect(universal.schemaVersion).toBeGreaterThanOrEqual(3);
    expect(universal.projectToCwlRoundtrip?.ok).toBe(true);
  }, 1_800_000);

  test("hub completion schema 60 contract import CWL roundtrip (G620)", async () => {
    const { runContractImportCwlRoundtripSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-contract-import-cwl-roundtrip-smoke.mjs")
    );
    const { runCwlUniversalMegaBatchSmoke, HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-universal-mega-batch-smoke.mjs")
    );
    expect(HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION).toBeGreaterThanOrEqual(4);
    const contractRoundtrip = await runContractImportCwlRoundtripSmoke();
    expect(contractRoundtrip.ok).toBe(true);
    expect(contractRoundtrip.openapi?.ok).toBe(true);
    expect(contractRoundtrip.har?.ok).toBe(true);
    const universal = await runCwlUniversalMegaBatchSmoke();
    expect(universal.ok).toBe(true);
    expect(universal.schemaVersion).toBeGreaterThanOrEqual(4);
    expect(universal.contractImportCwlRoundtrip?.ok).toBe(true);
  }, 1_800_000);

  test("hub completion schema 61 PHP oracle micro verify (G650)", async () => {
    const { runPhpOracleMicroVerifyBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-oracle-micro-verify-batch-smoke.mjs")
    );
    const { runOracleProductUltraBatchSmoke, HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs")
    );
    expect(HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
    const microVerify = await runPhpOracleMicroVerifyBatchSmoke();
    expect(microVerify.ok).toBe(true);
    expect(microVerify.micro?.routeCount).toBe(5);
    expect(microVerify.nextjs?.ok === true || microVerify.nextjs?.skip === "no-wptp-emit-nextjs").toBe(true);
    const oracleUltra = await runOracleProductUltraBatchSmoke();
    expect(oracleUltra.ok).toBe(true);
    expect(oracleUltra.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(oracleUltra.phpOracleMicroVerify?.ok).toBe(true);
  }, 600_000);

  test("hub completion schema 62 PHP Next.js verify batch (G680)", async () => {
    const { runPhpNextjsVerifyBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-nextjs-verify-batch-smoke.mjs")
    );
    const { runOracleProductUltraBatchSmoke, HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs")
    );
    expect(HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION).toBeGreaterThanOrEqual(3);
    const nextjsBatch = await runPhpNextjsVerifyBatchSmoke();
    expect(nextjsBatch.ok).toBe(true);
    expect(nextjsBatch.tinyBlog?.ok === true || nextjsBatch.tinyBlog?.skip === "no-wptp-emit-nextjs").toBe(true);
    expect(nextjsBatch.plainPhpFlagship?.ok === true || nextjsBatch.plainPhpFlagship?.skip === "no-wptp-emit-nextjs").toBe(
      true,
    );
    expect(nextjsBatch.symfonyFlagship?.ok === true || nextjsBatch.symfonyFlagship?.skip === "no-wptp-emit-nextjs").toBe(
      true,
    );
    const oracleUltra = await runOracleProductUltraBatchSmoke();
    expect(oracleUltra.ok).toBe(true);
    expect(oracleUltra.schemaVersion).toBeGreaterThanOrEqual(3);
    expect(oracleUltra.phpNextjsVerifyBatch?.ok).toBe(true);
  }, 600_000);

  test("hub completion schema 63 PHP wedge batch (G710)", async () => {
    const { runPhpWedgeBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-wedge-batch-smoke.mjs")
    );
    const { runOracleProductUltraBatchSmoke, HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs")
    );
    expect(HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION).toBe(4);
    const wedgeBatch = await runPhpWedgeBatchSmoke();
    expect(wedgeBatch.ok).toBe(true);
    expect(wedgeBatch.nextjsVerify?.ok).toBe(true);
    expect(wedgeBatch.oracleMicro?.ok).toBe(true);
    expect(wedgeBatch.laravelGaps?.ok).toBe(true);
    expect(wedgeBatch.nodeExpressOracle?.ok).toBe(true);
    const oracleUltra = await runOracleProductUltraBatchSmoke();
    expect(oracleUltra.ok).toBe(true);
    expect(oracleUltra.schemaVersion).toBe(4);
    expect(oracleUltra.phpWedgeBatch?.ok).toBe(true);
  }, 600_000);

  test("capability matrix v20 lists PHP Next.js verify batch (G653)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(20);
    expect(report.phpNextjsVerifyBatch?.script).toBe("pnpm run hub:php-nextjs-verify-batch-smoke");
    expect(report.phpNextjsVerifyBatch?.fixtures?.length).toBe(3);
    expect((report.oracleProductUltra?.batchSchemaVersion ?? 0) >= 3).toBe(true);
  });

  test("capability matrix v21 lists PHP wedge batch (G684)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(21);
    expect(report.phpWedgeBatch?.script).toBe("pnpm run hub:php-wedge-batch-smoke");
    expect(report.phpWedgeBatch?.laravelVerifyGapsBatchScript).toBe(
      "pnpm run hub:laravel-verify-gaps-batch-smoke",
    );
    expect(report.oracleProductUltra?.batchSchemaVersion).toBe(4);
  });

  test("delivery dashboard v22 surfaces month18 PHP Next.js verify batch (G654)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v22-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(22);
      expect(report.month18Program?.phpNextjsVerifyBatch).toBe("hub:php-nextjs-verify-batch-smoke");
      expect(report.month18Program?.requirePhpNextjsVerifyBatchEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("delivery dashboard v23 surfaces month19 PHP wedge batch (G685)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v23-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBeGreaterThanOrEqual(23);
      expect(report.month19Program?.phpWedgeBatch).toBe("hub:php-wedge-batch-smoke");
      expect(report.month19Program?.laravelVerifyGapsBatch).toBe("hub:laravel-verify-gaps-batch-smoke");
      expect(report.month19Program?.requirePhpWedgeBatchEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 64 hub evidence MVP batch (G740)", async () => {
    const { runHubEvidenceMvpBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-evidence-mvp-batch-smoke.mjs")
    );
    const {
      runEvidenceStandaloneMegaBatchSmoke,
      HUB_EVIDENCE_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-evidence-standalone-mega-batch-smoke.mjs"));
    expect(HUB_EVIDENCE_STANDALONE_MEGA_BATCH_SCHEMA_VERSION).toBe(2);
    const mvpBatch = await runHubEvidenceMvpBatchSmoke();
    expect(mvpBatch.ok).toBe(true);
    expect(mvpBatch.trend?.ok).toBe(true);
    expect(mvpBatch.trend?.trendPoints).toBeGreaterThanOrEqual(2);
    expect(mvpBatch.evidence?.verifyGatePass).toBe(true);
    expect(mvpBatch.evidence?.pipelineGatePass).toBe(true);
    expect(mvpBatch.evidence?.programId).toBe("api-slice");
    const megaBatch = await runEvidenceStandaloneMegaBatchSmoke();
    expect(megaBatch.ok).toBe(true);
    expect(megaBatch.schemaVersion).toBe(2);
    expect(megaBatch.evidenceMvp?.ok).toBe(true);
  }, 120_000);

  test("capability matrix v22 lists hub evidence MVP batch (G713)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(22);
    expect(report.hubEvidenceMvpBatch?.script).toBe("pnpm run hub:evidence-mvp-batch-smoke");
    expect(report.hubEvidenceMvpBatch?.trendScript).toBe("pnpm run hub:evidence-trend-smoke");
    expect(report.evidenceStandaloneMega?.batchSchemaVersion).toBe(2);
  });

  test("delivery dashboard v24 surfaces month20 hub evidence MVP (G714)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v24-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBeGreaterThanOrEqual(24);
      expect(report.month20Program?.hubEvidenceMvpBatch).toBe("hub:evidence-mvp-batch-smoke");
      expect(report.month20Program?.requireHubEvidenceMvpBatchEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 65 WPTP strict batch (G770)", async () => {
    const { runWptpStrictBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-wptp-strict-batch-smoke.mjs")
    );
    const strictBatch = await runWptpStrictBatchSmoke();
    expect(strictBatch.ok === true || strictBatch.skip === "no-wptp-emit-nextjs" || strictBatch.skip === "no-wptp-matrix").toBe(
      true,
    );
    if (strictBatch.wptpEmitNextjsAvailable === true && strictBatch.wptpMatrixAvailable === true) {
      expect(strictBatch.skip).toBeNull();
      expect(strictBatch.nextjsBatch?.ok).toBe(true);
      expect(strictBatch.wptpGold?.ok).toBe(true);
    }
  }, 600_000);

  test("capability matrix v23 lists WPTP strict batch (G742)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(23);
    expect(report.wptpStrictBatch?.script).toBe("pnpm run hub:wptp-strict-batch-smoke");
    expect(report.wptpStrictBatch?.requireWptpNextjsEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS");
  });

  test("delivery dashboard v25 surfaces month21 WPTP strict batch (G743)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v25-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
      expect(report.month21Program?.wptpStrictBatch).toBe("hub:wptp-strict-batch-smoke");
      expect(report.month21Program?.requireWptpNextjsEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS");
      expect(report.month21Program?.requireWptpStrictBatchEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 66 flagship-full gaps batch (G800)", async () => {
    const {
      runFlagshipFullGapsBatchSmoke,
      HUB_FLAGSHIP_FULL_GAPS_BATCH_SCHEMA_VERSION,
    } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-flagship-full-gaps-batch-smoke.mjs")
    );
    expect(HUB_FLAGSHIP_FULL_GAPS_BATCH_SCHEMA_VERSION).toBe(2);
    const gapsBatch = runFlagshipFullGapsBatchSmoke();
    expect(gapsBatch.ok).toBe(true);
    expect(gapsBatch.expressSeed?.ok).toBe(true);
    expect(gapsBatch.plainPhp?.ok).toBe(true);
    expect(gapsBatch.symfony?.ok).toBe(true);
    expect(gapsBatch.express?.ok).toBe(true);
    expect(gapsBatch.express?.skipped).toBeNull();
    expect(gapsBatch.backlogCount).toBe(0);
  }, 120_000);

  test("hub completion schema 67 gaps ingest closure batch (G830)", async () => {
    const { runGapsIngestClosureBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gaps-ingest-closure-batch-smoke.mjs")
    );
    const closureBatch = runGapsIngestClosureBatchSmoke();
    expect(closureBatch.ok).toBe(true);
    expect(closureBatch.expressSeed?.ok).toBe(true);
    expect(closureBatch.flagshipFullGaps?.ok).toBe(true);
    expect(closureBatch.laravelClosure?.ok).toBe(true);
    expect(closureBatch.gapReingest?.ok).toBe(true);
  }, 120_000);

  test("hub completion schema 70 auth-probe verify closure (G920)", async () => {
    const { runLaravelAuthProbeReingestVerifyClosureSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs")
    );
    const { runGapsIngestStrictBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gaps-ingest-strict-batch-smoke.mjs")
    );
    const {
      runVerifyProductUltraBatchSmoke,
      HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-verify-product-ultra-batch-smoke.mjs"));
    const { HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-wedge-batch-smoke.mjs")
    );
    const { HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gap-reingest-batch-smoke.mjs")
    );
    expect(HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION).toBe(6);
    expect(HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION).toBe(4);
    expect(HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION).toBe(3);
    const verifyClosure = runLaravelAuthProbeReingestVerifyClosureSmoke();
    expect(verifyClosure.ok).toBe(true);
    expect(verifyClosure.backlogAfter).toBe(0);
    expect(verifyClosure.correctnessAfter).toBe(1);
    const strictBatch = runGapsIngestStrictBatchSmoke();
    expect(strictBatch.ok).toBe(true);
    expect(strictBatch.authProbeVerifyClosure?.ok).toBe(true);
    const verifyUltra = await runVerifyProductUltraBatchSmoke();
    expect(verifyUltra.ok).toBe(true);
    expect(verifyUltra.schemaVersion).toBe(6);
    expect(verifyUltra.authProbeVerifyClosure?.ok).toBe(true);
  }, 180_000);

  test("capability matrix v28 lists verify closure + batch v4/v6 (G902)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(28);
    expect(report.laravelAuthProbeReingest?.verifyClosureScript).toBe(
      "pnpm run hub:laravel-auth-probe-reingest-verify-closure-smoke",
    );
    expect(report.gapsIngestStrictBatch?.authProbeVerifyClosureScript).toBe(
      "pnpm run hub:laravel-auth-probe-reingest-verify-closure-smoke",
    );
    expect(report.phpWedgeBatch?.batchSchemaVersion).toBe(4);
    expect(report.verifyProductUltra?.batchSchemaVersion).toBe(6);
    expect(report.oracleProductUltra?.batchSchemaVersion).toBe(7);
    expect(report.evidenceStandaloneMega?.batchSchemaVersion).toBe(5);
  });

  test("hub completion schema 69 laravel auth-probe strict reingest (G890)", async () => {
    const { runLaravelAuthProbeReingestSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-laravel-auth-probe-reingest-smoke.mjs")
    );
    const { runGapsIngestStrictBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gaps-ingest-strict-batch-smoke.mjs")
    );
    const {
      runVerifyProductUltraBatchSmoke,
      HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-verify-product-ultra-batch-smoke.mjs"));
    const { HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-wedge-batch-smoke.mjs")
    );
    const { HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gap-reingest-batch-smoke.mjs")
    );
    expect(HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION).toBe(6);
    expect(HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION).toBe(4);
    expect(HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION).toBe(3);
    const authProbe = runLaravelAuthProbeReingestSmoke();
    expect(authProbe.ok).toBe(true);
    expect(authProbe.reingest?.exitCode).toBe(0);
    expect(authProbe.verifyClosure?.ok).toBe(true);
    const strictBatch = runGapsIngestStrictBatchSmoke();
    expect(strictBatch.ok).toBe(true);
    expect(strictBatch.authProbeReingest?.ok).toBe(true);
    const verifyUltra = await runVerifyProductUltraBatchSmoke();
    expect(verifyUltra.ok).toBe(true);
    expect(verifyUltra.schemaVersion).toBe(6);
    expect(verifyUltra.authProbeVerifyClosure?.ok).toBe(true);
  }, 180_000);

  test("capability matrix v27 lists auth-probe reingest + batch v3/v5 (G868)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(27);
    expect(report.laravelAuthProbeReingest?.script).toBe("pnpm run hub:laravel-auth-probe-reingest-smoke");
    expect(report.gapsIngestStrictBatch?.authProbeReingestScript).toBe(
      "pnpm run hub:laravel-auth-probe-reingest-smoke",
    );
    expect(report.phpWedgeBatch?.batchSchemaVersion).toBe(3);
    expect(report.verifyProductUltra?.batchSchemaVersion).toBe(5);
    expect(report.oracleProductUltra?.batchSchemaVersion).toBe(6);
    expect(report.evidenceStandaloneMega?.batchSchemaVersion).toBe(4);
  });

  test("hub completion schema 68 gaps ingest strict batch (G860)", async () => {
    const { runGapsIngestStrictBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-gaps-ingest-strict-batch-smoke.mjs")
    );
    const {
      runVerifyProductUltraBatchSmoke,
      HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    } = await import(resolve(ROOT, "scripts/hub-ingest/hub-verify-product-ultra-batch-smoke.mjs"));
    const { HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-php-wedge-batch-smoke.mjs")
    );
    expect(HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION).toBe(4);
    expect(HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION).toBe(2);
    const strictBatch = runGapsIngestStrictBatchSmoke();
    expect(strictBatch.ok).toBe(true);
    expect(strictBatch.laravelLiveClosure?.ok).toBe(true);
    expect(strictBatch.gapReingestStrict?.ok).toBe(true);
    const verifyUltra = await runVerifyProductUltraBatchSmoke();
    expect(verifyUltra.ok).toBe(true);
    expect(verifyUltra.schemaVersion).toBe(4);
    expect(verifyUltra.gapsIngestStrict?.ok).toBe(true);
  }, 180_000);

  test("capability matrix v26 lists gaps ingest strict batch (G839)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(26);
    expect(report.gapsIngestStrictBatch?.script).toBe("pnpm run hub:gaps-ingest-strict-batch-smoke");
    expect(report.phpWedgeBatch?.batchSchemaVersion).toBe(2);
    expect(report.verifyProductUltra?.batchSchemaVersion).toBe(4);
    expect(report.oracleProductUltra?.batchSchemaVersion).toBe(5);
  });

  test("capability matrix v25 lists gaps ingest closure batch (G808)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(report.gapsIngestClosureBatch?.script).toBe("pnpm run hub:gaps-ingest-closure-batch-smoke");
    expect(report.flagshipFullGapsBatch?.batchSchemaVersion).toBe(2);
    expect(report.verifyProductUltra?.batchSchemaVersion).toBe(3);
  });

  test("capability matrix v24 lists flagship-full gaps batch (G774)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(24);
    expect(report.flagshipFullGapsBatch?.script).toBe("pnpm run hub:flagship-full-gaps-batch-smoke");
    expect(report.flagshipFullGapsBatch?.fixtures?.length).toBe(3);
  });

  test("delivery dashboard v30 surfaces month26 verify closure (G903)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v30-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(30);
      expect(report.month26Program?.laravelAuthProbeVerifyClosure).toBe(
        "hub:laravel-auth-probe-reingest-verify-closure-smoke",
      );
      expect(report.month26Program?.requireGapReingestVerifyClosureEnv).toBe(
        "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("delivery dashboard v29 surfaces month25 auth-probe reingest (G869)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v29-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBeGreaterThanOrEqual(29);
      expect(report.month25Program?.laravelAuthProbeReingest).toBe("hub:laravel-auth-probe-reingest-smoke");
      expect(report.month25Program?.gapReingestBatchSchemaVersion).toBe(3);
      expect(report.month25Program?.requireGapReingestStrictEnv).toBe("CHRYSALIS_HUB_GAP_REINGEST_STRICT");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("delivery dashboard v28 surfaces month24 gaps ingest strict (G840)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v28-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(28);
      expect(report.month24Program?.gapsIngestStrictBatch).toBe("hub:gaps-ingest-strict-batch-smoke");
      expect(report.month24Program?.requireGapReingestStrictEnv).toBe("CHRYSALIS_HUB_GAP_REINGEST_STRICT");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("delivery dashboard v27 surfaces month23 gaps ingest closure (G809)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v27-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
      expect(report.month23Program?.gapsIngestClosureBatch).toBe("hub:gaps-ingest-closure-batch-smoke");
      expect(report.month23Program?.requireGapsIngestClosureBatchEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
      );
      expect(report.month23Program?.requireGapReingestEnv).toBe("CHRYSALIS_HUB_GAP_REINGEST");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("delivery dashboard v26 surfaces month22 flagship-full gaps (G775)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v26-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
      expect(report.month22Program?.flagshipFullGapsBatch).toBe("hub:flagship-full-gaps-batch-smoke");
      expect(report.month22Program?.requireFlagshipFullGapsBatchEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("capability matrix v19 lists oracle micro verify batch (G623)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.oracleMicroFixture?.microVerifyBatchScript).toBe(
      "pnpm run hub:php-oracle-micro-verify-batch-smoke",
    );
    expect((report.oracleProductUltra?.batchSchemaVersion ?? 0) >= 2).toBe(true);
  });

  test("delivery dashboard v21 surfaces month17 oracle micro verify (G624)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v21-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month17Program?.phpOracleMicroVerify).toBe("hub:php-oracle-micro-verify-batch-smoke");
      expect(report.month17Program?.requirePhpOracleMicroVerifyEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("capability matrix v18 lists contract import roundtrip (G593)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.cwlAllOrigins?.contractImportCwlRoundtripScript).toBe(
      "pnpm run hub:contract-import-cwl-roundtrip-smoke",
    );
    expect((report.cwlAllOrigins?.universalMegaBatchSchemaVersion ?? 0) >= 4).toBe(true);
  });

  test("delivery dashboard v20 surfaces month16 contract import roundtrip (G594)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v20-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month16Program?.contractImportCwlRoundtrip).toBe("hub:contract-import-cwl-roundtrip-smoke");
      expect(report.month16Program?.requireContractImportCwlRoundtripEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("capability matrix v17 lists project-to-CWL roundtrip (G563)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.cwlAllOrigins?.projectToCwlRoundtripScript).toBe("pnpm run hub:project-to-cwl-roundtrip-smoke");
    expect((report.cwlAllOrigins?.universalMegaBatchSchemaVersion ?? 0) >= 3).toBe(true);
  });

  test("delivery dashboard v19 surfaces month15 project roundtrip (G564)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v19-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month15Program?.projectToCwlRoundtrip).toBe("hub:project-to-cwl-roundtrip-smoke");
      expect(report.month15Program?.requireProjectToCwlRoundtripEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("capability matrix v16 lists translate roundtrip (G535)", async () => {
    const { buildHubCapabilityMatrixReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(report.cwlAllOrigins?.flagshipRoundtripSuiteCount).toBe(3);
    expect(report.cwlAllOrigins?.translateCwlRoundtripScript).toBe("pnpm run hub:translate-cwl-roundtrip-smoke");
    expect((report.cwlAllOrigins?.universalMegaBatchSchemaVersion ?? 0) >= 2).toBe(true);
  });

  test("delivery dashboard v18 surfaces month14 translate roundtrip (G536)", async () => {
    const { buildDeliveryDashboard } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v18-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.month14Program?.translateCwlRoundtrip).toBe("hub:translate-cwl-roundtrip-smoke");
      expect(report.month14Program?.requireFlagshipCwlRoundtripEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("capability matrix v8 lists express delivery smokes (G313)", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-capability-matrix.mjs")
    );
    const report = buildHubCapabilityMatrixReport();
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBe(8);
    expect(report.expressDelivery?.deliveryBatchScript).toBe("pnpm run hub:express-delivery-batch-smoke");
    expect(report.cwlBatchSmokes?.interchangeBatchScript).toBe("pnpm run hub:cwl-interchange-batch-smoke");
  });

  test("delivery dashboard v10 surfaces month6 standalone batches (G314)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v10-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(10);
      expect(report.month6Program?.expressDeliveryBatch).toBe("hub:express-delivery-batch-smoke");
      expect(report.month6Program?.requireStandaloneDeliveryEnv).toBe(
        "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 49 smokes present (G290)", async () => {
    const { runCwlParamsBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-params-batch-smoke.mjs")
    );
    const { runMigrationOsStandaloneBatchSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-migration-os-standalone-batch-smoke.mjs")
    );
    const { runCwlMultiGoldSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-multi-gold-smoke.mjs")
    );
    const params = await runCwlParamsBatchSmoke();
    const migrationOs = await runMigrationOsStandaloneBatchSmoke();
    const multi = await runCwlMultiGoldSmoke();
    expect(params.ok).toBe(true);
    expect(migrationOs.ok).toBe(true);
    expect(multi.ok).toBe(true);
  }, 300_000);

  test("delivery dashboard v9 surfaces month5 CWL params smokes (G282)", async () => {
    const { buildDeliveryDashboard, HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-dashboard.mjs")
    );
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmp = mkdtempSync(join(tmpdir(), "chrysalis-dash-v9-"));
    try {
      mkdirSync(join(tmp, ".chrysalis"), { recursive: true });
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ routes: [{ method: "GET", path: "/health" }] }),
      );
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION).toBe(10);
      expect(report.month5Program?.cwlPathParamsSmoke).toBe("hub:cwl-path-params-smoke");
      expect(report.month5Program?.requireCwlParamsEnv).toBe("CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("hub completion schema 48 smokes present (G260)", async () => {
    const { runMigrationOsSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-migration-os-smoke.mjs")
    );
    const { runCwlAllRfcRoundtripSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-all-rfc-roundtrip-smoke.mjs")
    );
    const { runCwlDiffSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-diff-smoke.mjs")
    );
    const migration = await runMigrationOsSmoke();
    const roundtrip = await runCwlAllRfcRoundtripSmoke();
    const diff = runCwlDiffSmoke();
    expect(migration.ok).toBe(true);
    expect(roundtrip.ok).toBe(true);
    expect(diff.ok).toBe(true);
  }, 180_000);

  test("hub completion schema 47 smokes present (G230)", async () => {
    const { runCwlRequestContextSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-request-context-smoke.mjs")
    );
    const { runContractRoundtripSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-contract-roundtrip-smoke.mjs")
    );
    const { runDeliveryPipelineSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-delivery-pipeline-smoke.mjs")
    );
    const ctx = await runCwlRequestContextSmoke();
    const contract = await runContractRoundtripSmoke();
    const delivery = await runDeliveryPipelineSmoke();
    expect(ctx.ok).toBe(true);
    expect(contract.ok).toBe(true);
    expect(delivery.ok).toBe(true);
  }, 180_000);

  test("CWL request-context projection is hole-free (G201/G202)", async () => {
    const { runCwlRequestContextSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-request-context-smoke.mjs")
    );
    const report = await runCwlRequestContextSmoke();
    expect(report.ok).toBe(true);
    expect(report.cwlProjection?.withHeaderParams).toBeGreaterThanOrEqual(1);
    expect(report.cwlProjection?.withCookieParams).toBeGreaterThanOrEqual(1);
  }, 60_000);

  test("hub-translate E2E symfony and express variants (G208/G209)", async () => {
    const { runHubTranslateE2eSmoke } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-translate-e2e-smoke.mjs")
    );
    const symfony = runHubTranslateE2eSmoke({ variant: "symfony" });
    const express = runHubTranslateE2eSmoke({ variant: "express" });
    if (symfony.skip === "missing-cli-dist") return;
    expect(symfony.ok).toBe(true);
    expect(express.ok).toBe(true);
  }, 300_000);

  test("hub license status maps tier to hub features (G153)", async () => {
    const { buildHubLicenseStatusReport, hubTierMeetsMinimum } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-license-status.mjs")
    );
    const report = await buildHubLicenseStatusReport();
    expect(report.kind).toBe("chrysalis.hub.license-status");
    expect(report.requireLicense).toBe(false);
    expect(report.gatePass).toBe(true);
    expect(hubTierMeetsMinimum("pro", "dev")).toBe(true);
    expect(hubTierMeetsMinimum("dev", "pro")).toBe(false);
    const batch = report.hubFeatures.find((f: { id: string }) => f.id === "hub-batch");
    expect(batch?.allowed).toBe(true);
  });

  test("CWL multi-file import resolves route graph (G155)", async () => {
    const { resolveCwlModuleFromPath } = await import(
      resolve(ROOT, "scripts/hub-ingest/cwl-module-graph.mjs")
    );
    const entry = resolve(ROOT, "fixtures/hub-gold-cwl-multi/routes.cwl");
    const mod = resolveCwlModuleFromPath(entry);
    expect(mod.imports).toEqual(["health.cwl", "meta.cwl"]);
    expect(mod.routes.map((r: { path: string }) => r.path).sort()).toEqual(["/health", "/meta", "/ping"]);
    const { createCwlRuntime, loadModuleFromCwlFile } = await import("@chrysalis/runtime-cwl");
    const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(entry, ROOT) });
    const ping = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/ping" });
    expect(ping.status).toBe(200);
    expect(await ping.text()).toBe("42");
  });

  test("hub CWL preview lists routes and probes runtime (G156)", async () => {
    const { buildCwlPreviewReport } = await import(
      resolve(ROOT, "scripts/hub-ingest/hub-cwl-preview.mjs")
    );
    const report = await buildCwlPreviewReport(resolve(ROOT, "fixtures/hub-gold-cwl-multi"), {
      cwlPath: resolve(ROOT, "fixtures/hub-gold-cwl-multi/routes.cwl"),
    });
    expect(report.kind).toBe("chrysalis.hub.cwl-preview");
    expect(report.ok).toBe(true);
    expect(report.routeCount).toBe(3);
    expect(report.imports).toEqual(["health.cwl", "meta.cwl"]);
    expect(report.probe?.status).toBe(200);
  });

  describe.sequential("flagship smokes", () => {
    test("hub-plain-php-flagship smoke", async () => {
      const { runPlainPhpFlagshipSmoke } = await import(
        resolve(ROOT, "scripts/hub-ingest/hub-plain-php-flagship.mjs")
      );
      const report = await runPlainPhpFlagshipSmoke();
      expect(report.kind).toBe("chrysalis.hub.plain-php-flagship");
      expect(report.ingest?.routeCount).toBe(20);
      expect(report.ok).toBe(true);
    }, 300_000);

    test("hub-symfony-flagship smoke", async () => {
      const { runSymfonyFlagshipSmoke } = await import(
        resolve(ROOT, "scripts/hub-ingest/hub-symfony-flagship.mjs")
      );
      const report = await runSymfonyFlagshipSmoke();
      expect(report.kind).toBe("chrysalis.hub.symfony-flagship");
      expect(report.ingest?.routeCount).toBe(20);
      expect(report.routesParity?.ok).toBe(true);
      expect(report.ok).toBe(true);
    }, 300_000);

    test("hub-express-flagship smoke", async () => {
      const { runExpressFlagshipSmoke } = await import(
        resolve(ROOT, "scripts/hub-ingest/hub-express-flagship.mjs")
      );
      const report = await runExpressFlagshipSmoke();
      expect(report.kind).toBe("chrysalis.hub.express-flagship");
      expect(report.lift?.routeCount).toBe(20);
      expect(report.ok).toBe(true);
    }, 300_000);
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
    expect(report.schemaVersion).toBe(3);
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
      expect(meta.schemaVersion).toBe(3);
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
