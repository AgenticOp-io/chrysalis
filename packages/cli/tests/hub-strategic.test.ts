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

  test("hub-translate runner is single step with bundled post-translate pipeline (G150)", async () => {
    const { hubJobSteps } = await import(resolve(ROOT, "scripts/chrysalis-hub-runners.mjs"));
    const steps = hubJobSteps("/repo", "/repo/packages/cli/dist/bin.js", "/tmp/proj", {
      sourceLang: "php",
      targetId: "hono",
      action: "hub-translate",
    });
    expect(steps.map((s: { kind: string }) => s.kind)).toEqual(["hub-translate"]);
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
    expect(report.schemaVersion).toBe(4);
    expect(report.evidence).toBeDefined();
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
      const report = await buildDeliveryDashboard(tmp, { origin: "php", output: "hono" });
      expect(report.schemaVersion).toBe(4);
      expect(report.cwlPreview?.routeCount).toBe(5);
      expect(report.laravelGlobalAction?.ingestRemediation?.owner).toBe("packages/ingest");
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
      const report = await buildMigrationAssessment({ projectDir: tmp, origin: "php", output: "hono" });
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
      expect(report.schemaVersion).toBe(3);
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
    const action = runLaravelVerifyGapsAction();
    expect(action.ingestRemediation?.divergenceKind).toBeTruthy();
  });

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
  }, 120_000);

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
  }, 120_000);

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
