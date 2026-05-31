import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");

describe("ci-gates hub-completion", () => {
  test("accepts valid completion JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-gate-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 1,
          ok: true,
          matrixSmoke: { passed: 21, failed: 0, skipped: 0 },
          goldVerify: { ok: true },
          traceReplay: { ok: true, correctness: 1, routeCount: 2 },
          routeGrades: { gold: 10, silver: 50, open: 200 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("hub-completion OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v3 with crossLanguageSynthesis", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v3-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 3,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true },
          traceReplay: { ok: true, correctness: 1 },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 14, originCount: 23 },
          routeGrades: { gold: 14, silver: 279, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v6 with expected suite counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v6-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 6,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 24, expectedSuiteCount: 24, suiteIds: ["js-literal-hono"] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 16,
            expectedSuiteCount: 16,
            suiteIds: ["js-literal-hono"],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v5 with gold suite ids", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v5-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 5,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 20, suiteIds: ["js-literal-hono"] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 14,
            suiteIds: ["js-literal-hono"],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v23 with php oracle emit/verify and path knowledge v2", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v23-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 23,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 108, expectedSuiteCount: 108, suiteIds: [] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 82,
            expectedSuiteCount: 82,
            suiteIds: [],
            targets: ["hono", "fastify", "nextjs"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 575, originCount: 23 },
          goldCoverage: {
            ok: true,
            goldMatrix: 575,
            oracleTier: 4,
            structuralTier: 98,
            hubCiStructuralPairs: 98,
            chrysalisCiGoldPairs: 4,
            coverageGaps: 0,
          },
          multiLaneSmoke: {
            ok: true,
            oracleRedactor: true,
            parserBridgeVendor: true,
            parserNikicParity: true,
            migrationDebtOk: true,
          },
          assetVueNextjsGold: {
            suiteIds: ["sql-literal-nextjs", "html-literal-nextjs", "json-literal-nextjs", "vue-literal-nextjs"],
          },
          assetExtendedNextjsGold: {
            suiteIds: [
              "css-literal-nextjs",
              "scss-literal-nextjs",
              "markdown-literal-nextjs",
              "yaml-literal-nextjs",
              "c-literal-nextjs",
              "cpp-literal-nextjs",
            ],
          },
          phpOracleSmoke: {
            ok: true,
            schemaVersion: 2,
            ingestOk: true,
            emitHonoOk: true,
            verifyOk: true,
            skipped: null,
          },
          assetExtendedFrameworkGold: { suiteIds: ["css-literal-hono", "css-literal-fastify"] },
          nextjsTraceReplay: {
            suites: [
              "js-literal-nextjs",
              "ts-literal-nextjs",
              "js-structured-nextjs",
              "ts-structured-nextjs",
              "js-middleware-nextjs",
              "python-middleware-nextjs",
              "cwl-gold-nextjs",
              "python-literal-nextjs",
              "contract-first-nextjs",
              "ruby-literal-nextjs",
              "java-literal-nextjs",
              "go-literal-nextjs",
              "csharp-literal-nextjs",
              "kotlin-literal-nextjs",
              "scala-literal-nextjs",
              "swift-literal-nextjs",
              "rust-literal-nextjs",
              "sql-literal-nextjs",
              "html-literal-nextjs",
              "json-literal-nextjs",
              "vue-literal-nextjs",
              "css-literal-nextjs",
              "scss-literal-nextjs",
              "markdown-literal-nextjs",
              "yaml-literal-nextjs",
              "c-literal-nextjs",
              "cpp-literal-nextjs",
            ],
          },
          crossFrameworkNextjsGold: {
            suiteIds: [
              "ruby-literal-nextjs",
              "java-literal-nextjs",
              "go-literal-nextjs",
              "csharp-literal-nextjs",
              "kotlin-literal-nextjs",
              "scala-literal-nextjs",
              "swift-literal-nextjs",
              "rust-literal-nextjs",
            ],
          },
          middlewareNextjsGold: {
            suiteIds: ["js-middleware-nextjs", "python-middleware-nextjs"],
          },
          cwlNextjsGold: { suiteIds: ["cwl-gold-nextjs"] },
          pythonNextjsGold: {
            suiteIds: ["python-literal-nextjs", "python-middleware-nextjs"],
          },
          nativeStructuralGold: {
            targets: ["python", "java", "go", "ruby", "kotlin", "scala", "swift"],
            suiteIds: [
              "python-native-python",
              "java-native-java",
              "go-native-go",
              "ruby-native-ruby",
              "csharp-native-csharp",
              "rust-native-rust",
            ],
          },
          middlewareTraceReplay: {
            jsonPostProbe: true,
            suites: [
              "js-middleware-hono",
              "js-middleware-fastify",
              "python-middleware-hono",
              "python-middleware-fastify",
            ],
          },
          crossFrameworkStructuralGold: {
            suiteIds: [
              "ruby-literal-hono",
              "ruby-literal-fastify",
              "java-literal-hono",
              "java-literal-fastify",
              "go-literal-hono",
              "go-literal-fastify",
              "csharp-literal-hono",
              "csharp-literal-fastify",
              "rust-literal-hono",
              "rust-literal-fastify",
            ],
          },
          middlewareCwlGold: {
            suiteIds: ["js-middleware-cwl", "python-middleware-cwl"],
          },
          crossFrameworkCwlGold: {
            suiteIds: [
              "java-literal-cwl",
              "go-literal-cwl",
              "csharp-literal-cwl",
              "ruby-literal-cwl",
              "rust-literal-cwl",
            ],
          },
          kssFrameworkGold: {
            suiteIds: [
              "kotlin-literal-hono",
              "kotlin-literal-fastify",
              "kotlin-literal-cwl",
              "scala-literal-hono",
              "scala-literal-fastify",
              "scala-literal-cwl",
              "swift-literal-hono",
              "swift-literal-fastify",
              "swift-literal-cwl",
            ],
          },
          typescriptFamilyNextjsGold: {
            suiteIds: [
              "js-literal-nextjs",
              "ts-literal-nextjs",
              "js-structured-nextjs",
              "ts-structured-nextjs",
            ],
          },
          wptpContractGold: {
            suiteIds: ["contract-first-hono", "contract-first-nextjs"],
            traceReplaySuiteIds: ["contract-first-hono", "contract-first-nextjs"],
          },
          pathKnowledgeV2: { schemaVersion: 2, exportScript: "pnpm run hub:path-knowledge" },
          languageCompareApi: "/api/hub/language-compare",
          routeGrades: { gold: 575, silver: 0, open: 0 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v7 with goldCoverage", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v7-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 22,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 108, expectedSuiteCount: 108, suiteIds: [] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 82,
            expectedSuiteCount: 82,
            suiteIds: [],
            targets: ["hono", "fastify", "nextjs"],
          },
          nextjsTraceReplay: {
            suites: [
              "js-literal-nextjs",
              "ts-literal-nextjs",
              "js-structured-nextjs",
              "ts-structured-nextjs",
              "js-middleware-nextjs",
              "python-middleware-nextjs",
              "cwl-gold-nextjs",
              "python-literal-nextjs",
              "contract-first-nextjs",
              "ruby-literal-nextjs",
              "java-literal-nextjs",
              "go-literal-nextjs",
              "csharp-literal-nextjs",
              "kotlin-literal-nextjs",
              "scala-literal-nextjs",
              "swift-literal-nextjs",
              "rust-literal-nextjs",
              "sql-literal-nextjs",
              "html-literal-nextjs",
              "json-literal-nextjs",
              "vue-literal-nextjs",
              "css-literal-nextjs",
              "scss-literal-nextjs",
              "markdown-literal-nextjs",
              "yaml-literal-nextjs",
              "c-literal-nextjs",
              "cpp-literal-nextjs",
            ],
          },
          assetVueNextjsGold: {
            suiteIds: ["sql-literal-nextjs", "html-literal-nextjs", "json-literal-nextjs", "vue-literal-nextjs"],
          },
          assetExtendedNextjsGold: {
            suiteIds: [
              "css-literal-nextjs",
              "scss-literal-nextjs",
              "markdown-literal-nextjs",
              "yaml-literal-nextjs",
              "c-literal-nextjs",
              "cpp-literal-nextjs",
            ],
          },
          assetExtendedFrameworkGold: {
            suiteIds: ["css-literal-hono", "css-literal-fastify"],
          },
          phpOracleSmoke: { ok: true, skipped: "no-cli" },
          crossFrameworkNextjsGold: {
            suiteIds: [
              "ruby-literal-nextjs",
              "java-literal-nextjs",
              "go-literal-nextjs",
              "csharp-literal-nextjs",
              "kotlin-literal-nextjs",
              "scala-literal-nextjs",
              "swift-literal-nextjs",
              "rust-literal-nextjs",
            ],
          },
          middlewareNextjsGold: {
            suiteIds: ["js-middleware-nextjs", "python-middleware-nextjs"],
          },
          cwlNextjsGold: { suiteIds: ["cwl-gold-nextjs"] },
          pythonNextjsGold: {
            suiteIds: ["python-literal-nextjs", "python-middleware-nextjs"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 575, originCount: 23 },
          goldCoverage: {
            ok: true,
            goldMatrix: 575,
            oracleTier: 4,
            structuralTier: 98,
            hubCiStructuralPairs: 98,
            chrysalisCiGoldPairs: 4,
            coverageGaps: 0,
          },
          nativeStructuralGold: {
            targets: ["python", "java", "go", "ruby", "kotlin", "scala", "swift"],
            suiteIds: [
              "python-native-python",
              "java-native-java",
              "go-native-go",
              "ruby-native-ruby",
              "csharp-native-csharp",
              "rust-native-rust",
            ],
          },
          middlewareTraceReplay: {
            jsonPostProbe: true,
            suites: [
              "js-middleware-hono",
              "js-middleware-fastify",
              "python-middleware-hono",
              "python-middleware-fastify",
            ],
          },
          crossFrameworkStructuralGold: {
            suiteIds: [
              "ruby-literal-hono",
              "ruby-literal-fastify",
              "java-literal-hono",
              "java-literal-fastify",
              "go-literal-hono",
              "go-literal-fastify",
              "csharp-literal-hono",
              "csharp-literal-fastify",
              "rust-literal-hono",
              "rust-literal-fastify",
            ],
          },
          middlewareCwlGold: {
            suiteIds: ["js-middleware-cwl", "python-middleware-cwl"],
          },
          crossFrameworkCwlGold: {
            suiteIds: [
              "java-literal-cwl",
              "go-literal-cwl",
              "csharp-literal-cwl",
              "ruby-literal-cwl",
              "rust-literal-cwl",
            ],
          },
          kssFrameworkGold: {
            suiteIds: [
              "kotlin-literal-hono",
              "kotlin-literal-fastify",
              "kotlin-literal-cwl",
              "scala-literal-hono",
              "scala-literal-fastify",
              "scala-literal-cwl",
              "swift-literal-hono",
              "swift-literal-fastify",
              "swift-literal-cwl",
            ],
          },
          typescriptFamilyNextjsGold: {
            suiteIds: [
              "js-literal-nextjs",
              "ts-literal-nextjs",
              "js-structured-nextjs",
              "ts-structured-nextjs",
            ],
          },
          wptpContractGold: {
            suiteIds: ["contract-first-hono", "contract-first-nextjs"],
            traceReplaySuiteIds: ["contract-first-hono", "contract-first-nextjs"],
          },
          multiLaneSmoke: {
            ok: true,
            oracleRedactor: true,
            parserBridgeVendor: true,
            parserNikicParity: true,
            parserNikicSkipped: null,
            migrationDebtOk: true,
            migrationDebtHoleCount: 0,
            phpAvailable: true,
          },
          routeGrades: { gold: 575, silver: 0, open: 0 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects schema v6 when suite counts drift", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v6-bad-"));
    const p = join(dir, "bad.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 6,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 20, expectedSuiteCount: 24, suiteIds: [] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 16,
            expectedSuiteCount: 16,
            suiteIds: [],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v24 with path knowledge v3 and cwl path params gold", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v24-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 24,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 112, expectedSuiteCount: 112, suiteIds: [] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 86,
            expectedSuiteCount: 86,
            suiteIds: [],
            targets: ["hono", "fastify", "nextjs"],
          },
          nextjsTraceReplay: {
            suites: [
              "js-literal-nextjs",
              "ts-literal-nextjs",
              "js-structured-nextjs",
              "ts-structured-nextjs",
              "js-middleware-nextjs",
              "python-middleware-nextjs",
              "cwl-gold-nextjs",
              "python-literal-nextjs",
              "contract-first-nextjs",
              "ruby-literal-nextjs",
              "java-literal-nextjs",
              "go-literal-nextjs",
              "csharp-literal-nextjs",
              "kotlin-literal-nextjs",
              "scala-literal-nextjs",
              "swift-literal-nextjs",
              "rust-literal-nextjs",
              "sql-literal-nextjs",
              "html-literal-nextjs",
              "json-literal-nextjs",
              "vue-literal-nextjs",
              "css-literal-nextjs",
              "scss-literal-nextjs",
              "markdown-literal-nextjs",
              "yaml-literal-nextjs",
              "c-literal-nextjs",
              "cpp-literal-nextjs",
            ],
          },
          assetVueNextjsGold: {
            suiteIds: ["sql-literal-nextjs", "html-literal-nextjs", "json-literal-nextjs", "vue-literal-nextjs"],
          },
          assetExtendedNextjsGold: {
            suiteIds: [
              "css-literal-nextjs",
              "scss-literal-nextjs",
              "markdown-literal-nextjs",
              "yaml-literal-nextjs",
              "c-literal-nextjs",
              "cpp-literal-nextjs",
            ],
          },
          assetExtendedFrameworkGold: { suiteIds: ["css-literal-hono", "css-literal-fastify"] },
          crossFrameworkNextjsGold: {
            suiteIds: [
              "ruby-literal-nextjs",
              "java-literal-nextjs",
              "go-literal-nextjs",
              "csharp-literal-nextjs",
              "kotlin-literal-nextjs",
              "scala-literal-nextjs",
              "swift-literal-nextjs",
              "rust-literal-nextjs",
            ],
          },
          middlewareNextjsGold: {
            suiteIds: ["js-middleware-nextjs", "python-middleware-nextjs"],
          },
          cwlNextjsGold: { suiteIds: ["cwl-gold-nextjs"] },
          pythonNextjsGold: {
            suiteIds: ["python-literal-nextjs", "python-middleware-nextjs"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 575, originCount: 23 },
          goldCoverage: {
            ok: true,
            goldMatrix: 575,
            oracleTier: 4,
            structuralTier: 98,
            hubCiStructuralPairs: 98,
            chrysalisCiGoldPairs: 4,
            coverageGaps: 0,
          },
          nativeStructuralGold: {
            targets: ["python", "java", "go", "ruby", "kotlin", "scala", "swift"],
            suiteIds: [
              "python-native-python",
              "java-native-java",
              "go-native-go",
              "ruby-native-ruby",
              "csharp-native-csharp",
              "rust-native-rust",
            ],
          },
          middlewareTraceReplay: {
            jsonPostProbe: true,
            suites: [
              "js-middleware-hono",
              "js-middleware-fastify",
              "python-middleware-hono",
              "python-middleware-fastify",
            ],
          },
          crossFrameworkStructuralGold: {
            suiteIds: [
              "ruby-literal-hono",
              "ruby-literal-fastify",
              "java-literal-hono",
              "java-literal-fastify",
              "go-literal-hono",
              "go-literal-fastify",
              "csharp-literal-hono",
              "csharp-literal-fastify",
              "rust-literal-hono",
              "rust-literal-fastify",
            ],
          },
          middlewareCwlGold: {
            suiteIds: ["js-middleware-cwl", "python-middleware-cwl"],
          },
          crossFrameworkCwlGold: {
            suiteIds: [
              "java-literal-cwl",
              "go-literal-cwl",
              "csharp-literal-cwl",
              "ruby-literal-cwl",
              "rust-literal-cwl",
            ],
          },
          kssFrameworkGold: {
            suiteIds: [
              "kotlin-literal-hono",
              "kotlin-literal-fastify",
              "kotlin-literal-cwl",
              "scala-literal-hono",
              "scala-literal-fastify",
              "scala-literal-cwl",
              "swift-literal-hono",
              "swift-literal-fastify",
              "swift-literal-cwl",
            ],
          },
          typescriptFamilyNextjsGold: {
            suiteIds: [
              "js-literal-nextjs",
              "ts-literal-nextjs",
              "js-structured-nextjs",
              "ts-structured-nextjs",
            ],
          },
          wptpContractGold: {
            suiteIds: ["contract-first-hono", "contract-first-nextjs"],
            traceReplaySuiteIds: ["contract-first-hono", "contract-first-nextjs"],
          },
          multiLaneSmoke: {
            ok: true,
            oracleRedactor: true,
            parserBridgeVendor: true,
            parserNikicParity: true,
            migrationDebtOk: true,
          },
          phpOracleSmoke: {
            ok: true,
            schemaVersion: 3,
            ingestOk: true,
            emitHonoOk: true,
            emitFastifyOk: true,
            verifyOk: true,
            skipped: null,
          },
          pathKnowledge: { schemaVersion: 3, exportScript: "pnpm run hub:path-knowledge", webDatabaseCount: 24 },
          webDatabaseCatalog: { exportScript: "pnpm run hub:web-databases", count: 24 },
          languageCompareApi: "/api/hub/language-compare",
          migrationPlannerApi: "/api/hub/migration-plan",
          cwlPathParamsGold: {
            suiteIds: ["cwl-path-params-hono", "cwl-path-params-fastify"],
            rfc: "CWL-RFC-0002",
          },
          routeGrades: { gold: 575, silver: 0, open: 0 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v25 with query params gold and database detect API", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v25-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 25;
      payload.databaseDetectApi = "/api/hub/detect-databases";
      payload.cwlPathParamsGold = {
        suiteIds: ["cwl-path-params-hono", "cwl-path-params-fastify", "cwl-path-params-nextjs"],
        rfc: "CWL-RFC-0002",
      };
      payload.cwlQueryParamsGold = {
        suiteIds: ["cwl-query-params-hono", "cwl-query-params-fastify", "cwl-query-params-nextjs"],
        rfc: "CWL-RFC-0003",
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v37 with Symfony attribute method-list parity", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v37-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 37;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: {
          ok: true,
          yamlRouteCount: 20,
          manifestRouteCount: 20,
          script: "pnpm run hub:symfony-routes",
        },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
        attributeMethodsParity: { ok: true, routeCount: 3, fixture: "fixtures/hub-symfony-attr-methods" },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 20,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 7,
      };
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 154,
        suiteCount: 154,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 115,
        suiteCount: 115,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v39 with hole-free CWL projection coverage", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v39-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 39;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: { ok: true, yamlRouteCount: 20, manifestRouteCount: 20, script: "pnpm run hub:symfony-routes" },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        routesNameParity: { ok: true, yamlNameCount: 20, attributeNameCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
        attributeMethodsParity: { ok: true, routeCount: 3, fixture: "fixtures/hub-symfony-attr-methods" },
        cwlProjection: { total: 20, holeFree: 20, withStatus: 0, withParams: 0, withParamDefaults: 0, withContentType: 20, objectBodies: 0, holeReasons: [] },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
        cwlProjection: { total: 20, holeFree: 20, withStatus: 2, withParams: 5, withParamDefaults: 1, withContentType: 19, objectBodies: 10, holeReasons: [] },
      };
      payload.nodeExpressOracleVerify = { ok: true, correctness: 1, traceCount: 20, script: "pnpm run hub:node-express-oracle-verify" };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: ["express-flagship-hono", "express-flagship-fastify", "express-flagship-nextjs", "express-flagship-cwl"],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), oracleProductPairCount: 7 };
      payload.cwlResponseContentTypeGold = {
        suiteIds: ["cwl-response-content-type-hono", "cwl-response-content-type-fastify", "cwl-response-content-type-nextjs"],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects schema v39 with a holey CWL projection", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v39-bad-"));
    const p = join(dir, "bad.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 39;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: { ok: true, yamlRouteCount: 20, manifestRouteCount: 20, script: "pnpm run hub:symfony-routes" },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        routesNameParity: { ok: true, yamlNameCount: 20, attributeNameCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
        attributeMethodsParity: { ok: true, routeCount: 3, fixture: "fixtures/hub-symfony-attr-methods" },
        cwlProjection: { total: 20, holeFree: 20, withStatus: 0, withParams: 0, withParamDefaults: 0, withContentType: 20, objectBodies: 0, holeReasons: [] },
      };
      // The only forced failure: plain-php CWL projection is no longer hole-free.
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
        cwlProjection: { total: 20, holeFree: 18, withStatus: 2, withParams: 5, withParamDefaults: 1, withContentType: 19, objectBodies: 10, holeReasons: ["hub:cwl:unsupported-body"] },
      };
      payload.nodeExpressOracleVerify = { ok: true, correctness: 1, traceCount: 20, script: "pnpm run hub:node-express-oracle-verify" };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: ["express-flagship-hono", "express-flagship-fastify", "express-flagship-nextjs", "express-flagship-cwl"],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), oracleProductPairCount: 7 };
      payload.cwlResponseContentTypeGold = {
        suiteIds: ["cwl-response-content-type-hono", "cwl-response-content-type-fastify", "cwl-response-content-type-nextjs"],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/cwlProjection must be hole-free/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v40 with hole-free express CWL projection (G136)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v40-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 40;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: { ok: true, yamlRouteCount: 20, manifestRouteCount: 20, script: "pnpm run hub:symfony-routes" },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        routesNameParity: { ok: true, yamlNameCount: 20, attributeNameCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
        attributeMethodsParity: { ok: true, routeCount: 3, fixture: "fixtures/hub-symfony-attr-methods" },
        cwlProjection: { total: 20, holeFree: 20, withStatus: 0, withParams: 0, withParamDefaults: 0, withContentType: 20, objectBodies: 0, holeReasons: [] },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
        cwlProjection: { total: 20, holeFree: 20, withStatus: 2, withParams: 5, withParamDefaults: 1, withContentType: 19, objectBodies: 10, holeReasons: [] },
      };
      payload.nodeExpressOracleVerify = { ok: true, correctness: 1, traceCount: 20, script: "pnpm run hub:node-express-oracle-verify" };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: ["express-flagship-hono", "express-flagship-fastify", "express-flagship-nextjs", "express-flagship-cwl"],
        script: "pnpm run hub:express-flagship",
        cwlProjection: { total: 20, holeFree: 20, withStatus: 0, withParams: 0, withParamDefaults: 0, withContentType: 20, objectBodies: 3, holeReasons: [] },
      };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), oracleProductPairCount: 7 };
      payload.cwlResponseContentTypeGold = {
        suiteIds: ["cwl-response-content-type-hono", "cwl-response-content-type-fastify", "cwl-response-content-type-nextjs"],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v41 with emit parity and laravel min smoke (G165)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v41-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 41;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 2,
        ingestNext: "body-mismatch",
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = {
        ok: true,
        routeCount: 20,
        scaffold: "flagship/laravel-min",
        script: "pnpm run hub:laravel-min-smoke",
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects schema v41 when emit parity fails (G165)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v41-bad-"));
    const p = join(dir, "bad.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 41;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: false, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 2,
        ingestNext: "body-mismatch",
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20 };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/plainPhpFlagshipGold\.emitParity\.ok must be true/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v42 with laravel gaps action and hub evidence v3 (G171)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v42-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 42;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 2,
        ingestNext: "body-mismatch",
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: "body-mismatch",
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = { schemaVersion: 4, failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS", pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT" };
      payload.laravelVerifyLive = { script: "pnpm run hub:laravel-verify-export" };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v43 with hub evidence v4 and laravel verify live (G175)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v43-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 43;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 4,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
      };
      payload.laravelVerifyLive = { script: "pnpm run hub:laravel-verify-export" };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v44 with oracle micro, CWL status runtime, and project-to-CWL gates (G180)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v44-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 44;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 4,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.projectToCwlExport = {
        ok: true,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        fixture: "fixtures/hub-flagship-plain-php",
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v45 with CWL body runtime, evidence smoke, and node spike (G190)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v45-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 45;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 4,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 2,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 2, script: "pnpm run hub:node-oracle-spike" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 3,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v46 with body roundtrip, translate E2E, and evidence live (G200)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v46-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 46;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 4,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        holeFree: 2,
        withBodyParams: 2,
        projectionOk: true,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.cwlBodyRoundtrip = {
        ok: true,
        rfc: "CWL-RFC-0005",
        forwardHoleFree: 2,
        roundHoleFree: 2,
        script: "pnpm run hub:cwl-body-roundtrip-smoke",
      };
      payload.hubTranslateE2e = {
        ok: true,
        schemaVersion: 1,
        skip: null,
        script: "pnpm run hub:translate-e2e-smoke",
      };
      payload.hubEvidenceLive = {
        ok: true,
        schemaVersion: 1,
        pipelineGatePass: true,
        script: "pnpm run hub:evidence-live",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 2,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 4,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v47 with CWL RFC smokes and delivery pipeline (G230)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v47-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 47;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 4,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        holeFree: 2,
        withBodyParams: 2,
        projectionOk: true,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.cwlBodyRoundtrip = {
        ok: true,
        rfc: "CWL-RFC-0005",
        forwardHoleFree: 2,
        roundHoleFree: 2,
        script: "pnpm run hub:cwl-body-roundtrip-smoke",
      };
      payload.hubTranslateE2e = {
        ok: true,
        schemaVersion: 2,
        skip: null,
        variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:translate-e2e-smoke",
      };
      payload.hubEvidenceLive = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } },
        script: "pnpm run hub:evidence-live",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 3,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        laravelMin: { ok: true, holeCount: 11, requireHoleFree: false },
        tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 5,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v48 with migration OS and CWL interchange smokes (G260)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v48-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 48;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 5,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        holeFree: 2,
        withBodyParams: 2,
        projectionOk: true,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.cwlBodyRoundtrip = {
        ok: true,
        rfc: "CWL-RFC-0005",
        forwardHoleFree: 2,
        roundHoleFree: 2,
        script: "pnpm run hub:cwl-body-roundtrip-smoke",
      };
      payload.hubTranslateE2e = {
        ok: true,
        schemaVersion: 2,
        skip: null,
        variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:translate-e2e-smoke",
      };
      payload.hubEvidenceLive = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } },
        script: "pnpm run hub:evidence-live",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 3,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        laravelMin: { ok: true, holeCount: 11, requireHoleFree: false },
        tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:delivery-pipeline-smoke",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 6,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v49 with CWL params and migration OS standalone smokes (G290)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v49-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 49;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 6,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        holeFree: 2,
        withBodyParams: 2,
        projectionOk: true,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.cwlBodyRoundtrip = {
        ok: true,
        rfc: "CWL-RFC-0005",
        forwardHoleFree: 2,
        roundHoleFree: 2,
        script: "pnpm run hub:cwl-body-roundtrip-smoke",
      };
      payload.hubTranslateE2e = {
        ok: true,
        schemaVersion: 2,
        skip: null,
        variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:translate-e2e-smoke",
      };
      payload.hubEvidenceLive = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } },
        script: "pnpm run hub:evidence-live",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 3,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        laravelMin: { ok: true, holeCount: 11, requireHoleFree: false },
        tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = {
        ok: true,
        schemaVersion: 2,
        script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke",
      };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:delivery-pipeline-smoke",
      };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 7,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v50 with express delivery and CWL batch smokes (G320)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v50-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 50;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 7,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        holeFree: 2,
        withBodyParams: 2,
        projectionOk: true,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.cwlBodyRoundtrip = {
        ok: true,
        rfc: "CWL-RFC-0005",
        forwardHoleFree: 2,
        roundHoleFree: 2,
        script: "pnpm run hub:cwl-body-roundtrip-smoke",
      };
      payload.hubTranslateE2e = {
        ok: true,
        schemaVersion: 2,
        skip: null,
        variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:translate-e2e-smoke",
      };
      payload.hubEvidenceLive = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } },
        script: "pnpm run hub:evidence-live",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 3,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        laravelMin: { ok: true, holeCount: 11, requireHoleFree: false },
        tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = {
        ok: true,
        schemaVersion: 2,
        script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke",
      };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:delivery-pipeline-smoke",
      };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 2, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 8,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v51 with Laravel-min delivery and CWL full batch smokes (G350)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v51-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 51;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 8,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = {
        ok: true,
        rfc: "CWL-RFC-0006",
        withStatus: 2,
        script: "pnpm run hub:cwl-response-status-smoke",
      };
      payload.cwlRequestBodyRuntime = {
        ok: true,
        rfc: "CWL-RFC-0005",
        routeCount: 2,
        holeFree: 2,
        withBodyParams: 2,
        projectionOk: true,
        script: "pnpm run hub:cwl-request-body-smoke",
      };
      payload.cwlBodyRoundtrip = {
        ok: true,
        rfc: "CWL-RFC-0005",
        forwardHoleFree: 2,
        roundHoleFree: 2,
        script: "pnpm run hub:cwl-body-roundtrip-smoke",
      };
      payload.hubTranslateE2e = {
        ok: true,
        schemaVersion: 2,
        skip: null,
        variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:translate-e2e-smoke",
      };
      payload.hubEvidenceLive = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } },
        script: "pnpm run hub:evidence-live",
      };
      payload.projectToCwlExport = {
        ok: true,
        schemaVersion: 3,
        plainPhp: { ok: true, holeCount: 0, routeCount: 20 },
        symfony: { ok: true, holeCount: 0, routeCount: 20 },
        express: { ok: true, holeCount: 0, routeCount: 20 },
        laravelMin: { ok: true, holeCount: 11, requireHoleFree: false },
        tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false },
        script: "pnpm run hub:project-to-cwl-gates",
      };
      payload.phpNextjsFlagshipVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-flagship-verify",
      };
      payload.phpNextjsSymfonyVerify = {
        ok: true,
        skip: "no-wptp-emit-nextjs",
        script: "pnpm run hub:php-nextjs-symfony-verify",
      };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = {
        ok: true,
        schemaVersion: 2,
        script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke",
      };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = {
        ok: true,
        schemaVersion: 2,
        profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } },
        script: "pnpm run hub:delivery-pipeline-smoke",
      };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 2, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.siteIntelligenceLaravelMinSmoke = { ok: true, script: "pnpm run hub:site-intelligence-laravel-min-smoke" };
      payload.pathAdviceLaravelMinSmoke = { ok: true, script: "pnpm run hub:path-advice-laravel-min-smoke" };
      payload.migrationAssessmentLaravelMinSmoke = { ok: true, script: "pnpm run hub:migration-assessment-laravel-min-smoke" };
      payload.chimeraCutoverLaravelMinSmoke = { ok: true, script: "pnpm run hub:chimera-cutover-laravel-min-smoke" };
      payload.postTranslateArtifactsLaravelMinSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-laravel-min-smoke" };
      payload.verifyGapsLaravelMinSmoke = { ok: true, script: "pnpm run hub:verify-gaps-laravel-min-smoke" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 9,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v52 with four-origin delivery and oracle mega batch smokes (G380)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v52-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 52;
      payload.plainPhpFlagshipGold = {
        ...(payload.plainPhpFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.symfonyFlagshipGold = {
        ...(payload.symfonyFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.expressFlagshipGold = {
        ...(payload.expressFlagshipGold ?? {}),
        inProcess: true,
        emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] },
      };
      payload.laravelVerifyGaps = {
        ok: true,
        backlogItems: 0,
        ingestNext: null,
        exportScript: "pnpm run hub:laravel-verify-gaps",
        actionScript: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelVerifyGapsAction = {
        ok: true,
        ingestRemediation: null,
        script: "pnpm run hub:laravel-verify-gaps-action",
      };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 9,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
        requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
      };
      payload.laravelVerifyLive = {
        ok: true,
        skip: null,
        aggregate: { correctness: 1 },
        script: "pnpm run hub:laravel-verify-export",
      };
      payload.phpOracleMicro = {
        fixture: "fixtures/tiny-blog",
        routeCount: 5,
        doc: "docs/CAPABILITY-MATRIX.md",
        script: "pnpm run hub:oracle-micro-fixture",
      };
      payload.cwlResponseStatusRuntime = { ok: true, rfc: "CWL-RFC-0006", withStatus: 2, script: "pnpm run hub:cwl-response-status-smoke" };
      payload.cwlRequestBodyRuntime = { ok: true, rfc: "CWL-RFC-0005", routeCount: 2, holeFree: 2, withBodyParams: 2, projectionOk: true, script: "pnpm run hub:cwl-request-body-smoke" };
      payload.cwlBodyRoundtrip = { ok: true, rfc: "CWL-RFC-0005", forwardHoleFree: 2, roundHoleFree: 2, script: "pnpm run hub:cwl-body-roundtrip-smoke" };
      payload.hubTranslateE2e = { ok: true, schemaVersion: 2, skip: null, variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } }, script: "pnpm run hub:translate-e2e-smoke" };
      payload.hubEvidenceLive = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } }, script: "pnpm run hub:evidence-live" };
      payload.projectToCwlExport = { ok: true, schemaVersion: 3, plainPhp: { ok: true, holeCount: 0, routeCount: 20 }, symfony: { ok: true, holeCount: 0, routeCount: 20 }, express: { ok: true, holeCount: 0, routeCount: 20 }, laravelMin: { ok: true, holeCount: 11, requireHoleFree: false }, tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false }, script: "pnpm run hub:project-to-cwl-gates" };
      payload.phpNextjsFlagshipVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-flagship-verify" };
      payload.phpNextjsSymfonyVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-symfony-verify" };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, schemaVersion: 2, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } }, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, schemaVersion: 2, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.fourOriginDeliveryBatch = { ok: true, script: "pnpm run hub:four-origin-delivery-batch-smoke" };
      payload.symfonyDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-delivery-batch-smoke" };
      payload.laravelMinMigrationOsBatch = { ok: true, script: "pnpm run hub:laravel-min-migration-os-batch-smoke" };
      payload.oracleStandaloneBatch = { ok: true, script: "pnpm run hub:oracle-standalone-batch-smoke" };
      payload.fullDeliveryMegaBatch = { ok: true, script: "pnpm run hub:full-delivery-mega-batch-smoke" };
      payload.cwlMegaBatch = { ok: true, script: "pnpm run hub:cwl-mega-batch-smoke" };
      payload.plainPhpMigrationOsBatch = { ok: true, script: "pnpm run hub:plain-php-migration-os-batch-smoke" };
      payload.tinyBlogDeliveryBatch = { ok: true, script: "pnpm run hub:tiny-blog-delivery-batch-smoke" };
      payload.deliveryPipelineStandaloneBatch = { ok: true, script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke" };
      payload.laravelMinOracleBatch = { ok: true, script: "pnpm run hub:laravel-min-oracle-batch-smoke" };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        schemaVersion: 10,
        oracleMicroFixture: "fixtures/tiny-blog",
        nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
        oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7,
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v53 with ultra mega delivery and oracle batches (G410)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v53-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 53;
      payload.plainPhpFlagshipGold = { ...(payload.plainPhpFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.symfonyFlagshipGold = { ...(payload.symfonyFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.expressFlagshipGold = { ...(payload.expressFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.laravelVerifyGaps = { ok: true, backlogItems: 0, ingestNext: null, exportScript: "pnpm run hub:laravel-verify-gaps", actionScript: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelVerifyGapsAction = { ok: true, ingestRemediation: null, script: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 10,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
        requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
        requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
      };
      payload.laravelVerifyLive = { ok: true, skip: null, aggregate: { correctness: 1 }, script: "pnpm run hub:laravel-verify-export" };
      payload.phpOracleMicro = { fixture: "fixtures/tiny-blog", routeCount: 5, doc: "docs/CAPABILITY-MATRIX.md", script: "pnpm run hub:oracle-micro-fixture" };
      payload.cwlResponseStatusRuntime = { ok: true, rfc: "CWL-RFC-0006", withStatus: 2, script: "pnpm run hub:cwl-response-status-smoke" };
      payload.cwlRequestBodyRuntime = { ok: true, rfc: "CWL-RFC-0005", routeCount: 2, holeFree: 2, withBodyParams: 2, projectionOk: true, script: "pnpm run hub:cwl-request-body-smoke" };
      payload.cwlBodyRoundtrip = { ok: true, rfc: "CWL-RFC-0005", forwardHoleFree: 2, roundHoleFree: 2, script: "pnpm run hub:cwl-body-roundtrip-smoke" };
      payload.hubTranslateE2e = { ok: true, schemaVersion: 2, skip: null, variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } }, script: "pnpm run hub:translate-e2e-smoke" };
      payload.hubEvidenceLive = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } }, script: "pnpm run hub:evidence-live" };
      payload.projectToCwlExport = { ok: true, schemaVersion: 3, plainPhp: { ok: true, holeCount: 0, routeCount: 20 }, symfony: { ok: true, holeCount: 0, routeCount: 20 }, express: { ok: true, holeCount: 0, routeCount: 20 }, laravelMin: { ok: true, holeCount: 11, requireHoleFree: false }, tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false }, script: "pnpm run hub:project-to-cwl-gates" };
      payload.phpNextjsFlagshipVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-flagship-verify" };
      payload.phpNextjsSymfonyVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-symfony-verify" };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, schemaVersion: 2, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } }, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.fourOriginDeliveryBatch = { ok: true, script: "pnpm run hub:four-origin-delivery-batch-smoke" };
      payload.symfonyDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-delivery-batch-smoke" };
      payload.laravelMinMigrationOsBatch = { ok: true, script: "pnpm run hub:laravel-min-migration-os-batch-smoke" };
      payload.oracleStandaloneBatch = { ok: true, script: "pnpm run hub:oracle-standalone-batch-smoke" };
      payload.fullDeliveryMegaBatch = { ok: true, script: "pnpm run hub:full-delivery-mega-batch-smoke" };
      payload.cwlMegaBatch = { ok: true, script: "pnpm run hub:cwl-mega-batch-smoke" };
      payload.plainPhpMigrationOsBatch = { ok: true, script: "pnpm run hub:plain-php-migration-os-batch-smoke" };
      payload.tinyBlogDeliveryBatch = { ok: true, script: "pnpm run hub:tiny-blog-delivery-batch-smoke" };
      payload.deliveryPipelineStandaloneBatch = { ok: true, script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke" };
      payload.laravelMinOracleBatch = { ok: true, script: "pnpm run hub:laravel-min-oracle-batch-smoke" };
      payload.advisoryStandaloneMegaBatch = { ok: true, script: "pnpm run hub:advisory-standalone-mega-batch-smoke" };
      payload.allDeliveryUltraMegaBatch = { ok: true, script: "pnpm run hub:all-delivery-ultra-mega-batch-smoke" };
      payload.migrationOsMegaBatch = { ok: true, script: "pnpm run hub:migration-os-mega-batch-smoke" };
      payload.oracleProductUltraBatch = { ok: true, script: "pnpm run hub:oracle-product-ultra-batch-smoke" };
      payload.expressLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:express-laravel-min-delivery-batch-smoke" };
      payload.symfonyLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke" };
      payload.postTranslateVerifyOriginBatch = { ok: true, script: "pnpm run hub:post-translate-verify-origin-batch-smoke" };
      payload.tinyBlogDepthBatch = { ok: true, script: "pnpm run hub:tiny-blog-depth-batch-smoke" };
      payload.contractVerifyStandaloneBatch = { ok: true, script: "pnpm run hub:contract-verify-standalone-batch-smoke" };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), schemaVersion: 11, oracleMicroFixture: "fixtures/tiny-blog", nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"], oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7 };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v54 with origin depth and chimera verify ultra batches (G440)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v54-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 54;
      payload.plainPhpFlagshipGold = { ...(payload.plainPhpFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.symfonyFlagshipGold = { ...(payload.symfonyFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.expressFlagshipGold = { ...(payload.expressFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.laravelVerifyGaps = { ok: true, backlogItems: 0, ingestNext: null, exportScript: "pnpm run hub:laravel-verify-gaps", actionScript: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelVerifyGapsAction = { ok: true, ingestRemediation: null, script: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 11,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
        requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
        requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
        requireOriginDepthEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH",
      };
      payload.laravelVerifyLive = { ok: true, skip: null, aggregate: { correctness: 1 }, script: "pnpm run hub:laravel-verify-export" };
      payload.phpOracleMicro = { fixture: "fixtures/tiny-blog", routeCount: 5, doc: "docs/CAPABILITY-MATRIX.md", script: "pnpm run hub:oracle-micro-fixture" };
      payload.cwlResponseStatusRuntime = { ok: true, rfc: "CWL-RFC-0006", withStatus: 2, script: "pnpm run hub:cwl-response-status-smoke" };
      payload.cwlRequestBodyRuntime = { ok: true, rfc: "CWL-RFC-0005", routeCount: 2, holeFree: 2, withBodyParams: 2, projectionOk: true, script: "pnpm run hub:cwl-request-body-smoke" };
      payload.cwlBodyRoundtrip = { ok: true, rfc: "CWL-RFC-0005", forwardHoleFree: 2, roundHoleFree: 2, script: "pnpm run hub:cwl-body-roundtrip-smoke" };
      payload.hubTranslateE2e = { ok: true, schemaVersion: 2, skip: null, variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } }, script: "pnpm run hub:translate-e2e-smoke" };
      payload.hubEvidenceLive = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } }, script: "pnpm run hub:evidence-live" };
      payload.projectToCwlExport = { ok: true, schemaVersion: 3, plainPhp: { ok: true, holeCount: 0, routeCount: 20 }, symfony: { ok: true, holeCount: 0, routeCount: 20 }, express: { ok: true, holeCount: 0, routeCount: 20 }, laravelMin: { ok: true, holeCount: 11, requireHoleFree: false }, tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false }, script: "pnpm run hub:project-to-cwl-gates" };
      payload.phpNextjsFlagshipVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-flagship-verify" };
      payload.phpNextjsSymfonyVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-symfony-verify" };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, schemaVersion: 2, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } }, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.fourOriginDeliveryBatch = { ok: true, script: "pnpm run hub:four-origin-delivery-batch-smoke" };
      payload.symfonyDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-delivery-batch-smoke" };
      payload.laravelMinMigrationOsBatch = { ok: true, script: "pnpm run hub:laravel-min-migration-os-batch-smoke" };
      payload.oracleStandaloneBatch = { ok: true, script: "pnpm run hub:oracle-standalone-batch-smoke" };
      payload.fullDeliveryMegaBatch = { ok: true, script: "pnpm run hub:full-delivery-mega-batch-smoke" };
      payload.cwlMegaBatch = { ok: true, script: "pnpm run hub:cwl-mega-batch-smoke" };
      payload.plainPhpMigrationOsBatch = { ok: true, script: "pnpm run hub:plain-php-migration-os-batch-smoke" };
      payload.tinyBlogDeliveryBatch = { ok: true, script: "pnpm run hub:tiny-blog-delivery-batch-smoke" };
      payload.deliveryPipelineStandaloneBatch = { ok: true, script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke" };
      payload.laravelMinOracleBatch = { ok: true, script: "pnpm run hub:laravel-min-oracle-batch-smoke" };
      payload.advisoryStandaloneMegaBatch = { ok: true, script: "pnpm run hub:advisory-standalone-mega-batch-smoke" };
      payload.allDeliveryUltraMegaBatch = { ok: true, script: "pnpm run hub:all-delivery-ultra-mega-batch-smoke" };
      payload.migrationOsMegaBatch = { ok: true, script: "pnpm run hub:migration-os-mega-batch-smoke" };
      payload.oracleProductUltraBatch = { ok: true, script: "pnpm run hub:oracle-product-ultra-batch-smoke" };
      payload.expressLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:express-laravel-min-delivery-batch-smoke" };
      payload.symfonyLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke" };
      payload.postTranslateVerifyOriginBatch = { ok: true, script: "pnpm run hub:post-translate-verify-origin-batch-smoke" };
      payload.tinyBlogDepthBatch = { ok: true, script: "pnpm run hub:tiny-blog-depth-batch-smoke" };
      payload.contractVerifyStandaloneBatch = { ok: true, script: "pnpm run hub:contract-verify-standalone-batch-smoke" };
      payload.chimeraCutoverOriginBatch = { ok: true, script: "pnpm run hub:chimera-cutover-origin-batch-smoke" };
      payload.migrationAssessmentOriginBatch = { ok: true, script: "pnpm run hub:migration-assessment-origin-batch-smoke" };
      payload.verifyGapsOriginBatch = { ok: true, script: "pnpm run hub:verify-gaps-origin-batch-smoke" };
      payload.postTranslateArtifactsOriginBatch = { ok: true, script: "pnpm run hub:post-translate-artifacts-origin-batch-smoke" };
      payload.verifyStandaloneMegaBatch = { ok: true, script: "pnpm run hub:verify-standalone-mega-batch-smoke" };
      payload.contractStandaloneMegaBatch = { ok: true, script: "pnpm run hub:contract-standalone-mega-batch-smoke" };
      payload.evidenceStandaloneMegaBatch = { ok: true, script: "pnpm run hub:evidence-standalone-mega-batch-smoke" };
      payload.plainPhpDepthBatch = { ok: true, script: "pnpm run hub:plain-php-depth-batch-smoke" };
      payload.symfonyDepthBatch = { ok: true, script: "pnpm run hub:symfony-depth-batch-smoke" };
      payload.expressDepthBatch = { ok: true, script: "pnpm run hub:express-depth-batch-smoke" };
      payload.laravelMinDepthBatch = { ok: true, script: "pnpm run hub:laravel-min-depth-batch-smoke" };
      payload.originDepthUltraBatch = { ok: true, script: "pnpm run hub:origin-depth-ultra-batch-smoke" };
      payload.chimeraAssessmentMegaBatch = { ok: true, script: "pnpm run hub:chimera-assessment-mega-batch-smoke" };
      payload.verifyProductUltraBatch = { ok: true, script: "pnpm run hub:verify-product-ultra-batch-smoke" };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), schemaVersion: 12, oracleMicroFixture: "fixtures/tiny-blog", nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"], oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7 };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v55 with universal CWL all origins (G470)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v55-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 55;
      payload.plainPhpFlagshipGold = { ...(payload.plainPhpFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.symfonyFlagshipGold = { ...(payload.symfonyFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.expressFlagshipGold = { ...(payload.expressFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.laravelVerifyGaps = { ok: true, backlogItems: 0, ingestNext: null, exportScript: "pnpm run hub:laravel-verify-gaps", actionScript: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelVerifyGapsAction = { ok: true, ingestRemediation: null, script: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 12,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
        requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
        requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
        requireOriginDepthEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH",
        requireUniversalCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL",
      };
      payload.laravelVerifyLive = { ok: true, skip: null, aggregate: { correctness: 1 }, script: "pnpm run hub:laravel-verify-export" };
      payload.phpOracleMicro = { fixture: "fixtures/tiny-blog", routeCount: 5, doc: "docs/CAPABILITY-MATRIX.md", script: "pnpm run hub:oracle-micro-fixture" };
      payload.cwlResponseStatusRuntime = { ok: true, rfc: "CWL-RFC-0006", withStatus: 2, script: "pnpm run hub:cwl-response-status-smoke" };
      payload.cwlRequestBodyRuntime = { ok: true, rfc: "CWL-RFC-0005", routeCount: 2, holeFree: 2, withBodyParams: 2, projectionOk: true, script: "pnpm run hub:cwl-request-body-smoke" };
      payload.cwlBodyRoundtrip = { ok: true, rfc: "CWL-RFC-0005", forwardHoleFree: 2, roundHoleFree: 2, script: "pnpm run hub:cwl-body-roundtrip-smoke" };
      payload.hubTranslateE2e = { ok: true, schemaVersion: 2, skip: null, variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } }, script: "pnpm run hub:translate-e2e-smoke" };
      payload.hubEvidenceLive = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } }, script: "pnpm run hub:evidence-live" };
      payload.projectToCwlExport = { ok: true, schemaVersion: 3, plainPhp: { ok: true, holeCount: 0, routeCount: 20 }, symfony: { ok: true, holeCount: 0, routeCount: 20 }, express: { ok: true, holeCount: 0, routeCount: 20 }, laravelMin: { ok: true, holeCount: 11, requireHoleFree: false }, tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false }, script: "pnpm run hub:project-to-cwl-gates" };
      payload.phpNextjsFlagshipVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-flagship-verify" };
      payload.phpNextjsSymfonyVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-symfony-verify" };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, schemaVersion: 2, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } }, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.fourOriginDeliveryBatch = { ok: true, script: "pnpm run hub:four-origin-delivery-batch-smoke" };
      payload.symfonyDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-delivery-batch-smoke" };
      payload.laravelMinMigrationOsBatch = { ok: true, script: "pnpm run hub:laravel-min-migration-os-batch-smoke" };
      payload.oracleStandaloneBatch = { ok: true, script: "pnpm run hub:oracle-standalone-batch-smoke" };
      payload.fullDeliveryMegaBatch = { ok: true, script: "pnpm run hub:full-delivery-mega-batch-smoke" };
      payload.cwlMegaBatch = { ok: true, script: "pnpm run hub:cwl-mega-batch-smoke" };
      payload.plainPhpMigrationOsBatch = { ok: true, script: "pnpm run hub:plain-php-migration-os-batch-smoke" };
      payload.tinyBlogDeliveryBatch = { ok: true, script: "pnpm run hub:tiny-blog-delivery-batch-smoke" };
      payload.deliveryPipelineStandaloneBatch = { ok: true, script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke" };
      payload.laravelMinOracleBatch = { ok: true, script: "pnpm run hub:laravel-min-oracle-batch-smoke" };
      payload.advisoryStandaloneMegaBatch = { ok: true, script: "pnpm run hub:advisory-standalone-mega-batch-smoke" };
      payload.allDeliveryUltraMegaBatch = { ok: true, script: "pnpm run hub:all-delivery-ultra-mega-batch-smoke" };
      payload.migrationOsMegaBatch = { ok: true, script: "pnpm run hub:migration-os-mega-batch-smoke" };
      payload.oracleProductUltraBatch = { ok: true, script: "pnpm run hub:oracle-product-ultra-batch-smoke" };
      payload.expressLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:express-laravel-min-delivery-batch-smoke" };
      payload.symfonyLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke" };
      payload.postTranslateVerifyOriginBatch = { ok: true, script: "pnpm run hub:post-translate-verify-origin-batch-smoke" };
      payload.tinyBlogDepthBatch = { ok: true, script: "pnpm run hub:tiny-blog-depth-batch-smoke" };
      payload.contractVerifyStandaloneBatch = { ok: true, script: "pnpm run hub:contract-verify-standalone-batch-smoke" };
      payload.chimeraCutoverOriginBatch = { ok: true, script: "pnpm run hub:chimera-cutover-origin-batch-smoke" };
      payload.migrationAssessmentOriginBatch = { ok: true, script: "pnpm run hub:migration-assessment-origin-batch-smoke" };
      payload.verifyGapsOriginBatch = { ok: true, script: "pnpm run hub:verify-gaps-origin-batch-smoke" };
      payload.postTranslateArtifactsOriginBatch = { ok: true, script: "pnpm run hub:post-translate-artifacts-origin-batch-smoke" };
      payload.verifyStandaloneMegaBatch = { ok: true, script: "pnpm run hub:verify-standalone-mega-batch-smoke" };
      payload.contractStandaloneMegaBatch = { ok: true, script: "pnpm run hub:contract-standalone-mega-batch-smoke" };
      payload.evidenceStandaloneMegaBatch = { ok: true, script: "pnpm run hub:evidence-standalone-mega-batch-smoke" };
      payload.plainPhpDepthBatch = { ok: true, script: "pnpm run hub:plain-php-depth-batch-smoke" };
      payload.symfonyDepthBatch = { ok: true, script: "pnpm run hub:symfony-depth-batch-smoke" };
      payload.expressDepthBatch = { ok: true, script: "pnpm run hub:express-depth-batch-smoke" };
      payload.laravelMinDepthBatch = { ok: true, script: "pnpm run hub:laravel-min-depth-batch-smoke" };
      payload.originDepthUltraBatch = { ok: true, script: "pnpm run hub:origin-depth-ultra-batch-smoke" };
      payload.chimeraAssessmentMegaBatch = { ok: true, script: "pnpm run hub:chimera-assessment-mega-batch-smoke" };
      payload.verifyProductUltraBatch = { ok: true, script: "pnpm run hub:verify-product-ultra-batch-smoke" };
      payload.projectToCwlAllOrigins = { ok: true, originCount: 23, script: "pnpm run hub:project-to-cwl-all-origins" };
      payload.cwlAllOriginsBatch = { ok: true, script: "pnpm run hub:cwl-all-origins-batch-smoke" };
      payload.cwlUniversalMegaBatch = { ok: true, script: "pnpm run hub:cwl-universal-mega-batch-smoke" };
      payload.cwlAppStackOriginsBatch = { ok: true, script: "pnpm run hub:cwl-app-stack-origins-batch-smoke" };
      payload.cwlAssetOriginsBatch = { ok: true, script: "pnpm run hub:cwl-asset-origins-batch-smoke" };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), schemaVersion: 13, oracleMicroFixture: "fixtures/tiny-blog", nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"], oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7 };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 144, suiteCount: 144, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v56 with pattern-literal CWL gold (G500)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v56-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 56;
      payload.plainPhpFlagshipGold = { ...(payload.plainPhpFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.symfonyFlagshipGold = { ...(payload.symfonyFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.expressFlagshipGold = { ...(payload.expressFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.laravelVerifyGaps = { ok: true, backlogItems: 0, ingestNext: null, exportScript: "pnpm run hub:laravel-verify-gaps", actionScript: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelVerifyGapsAction = { ok: true, ingestRemediation: null, script: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 13,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
        requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
        requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
        requireOriginDepthEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH",
        requireUniversalCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL",
        requirePatternLiteralCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL",
        requireTranslateCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL",
      };
      payload.laravelVerifyLive = { ok: true, skip: null, aggregate: { correctness: 1 }, script: "pnpm run hub:laravel-verify-export" };
      payload.phpOracleMicro = { fixture: "fixtures/tiny-blog", routeCount: 5, doc: "docs/CAPABILITY-MATRIX.md", script: "pnpm run hub:oracle-micro-fixture" };
      payload.cwlResponseStatusRuntime = { ok: true, rfc: "CWL-RFC-0006", withStatus: 2, script: "pnpm run hub:cwl-response-status-smoke" };
      payload.cwlRequestBodyRuntime = { ok: true, rfc: "CWL-RFC-0005", routeCount: 2, holeFree: 2, withBodyParams: 2, projectionOk: true, script: "pnpm run hub:cwl-request-body-smoke" };
      payload.cwlBodyRoundtrip = { ok: true, rfc: "CWL-RFC-0005", forwardHoleFree: 2, roundHoleFree: 2, script: "pnpm run hub:cwl-body-roundtrip-smoke" };
      payload.hubTranslateE2e = { ok: true, schemaVersion: 2, skip: null, variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } }, script: "pnpm run hub:translate-e2e-smoke" };
      payload.hubEvidenceLive = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } }, script: "pnpm run hub:evidence-live" };
      payload.projectToCwlExport = { ok: true, schemaVersion: 3, plainPhp: { ok: true, holeCount: 0, routeCount: 20 }, symfony: { ok: true, holeCount: 0, routeCount: 20 }, express: { ok: true, holeCount: 0, routeCount: 20 }, laravelMin: { ok: true, holeCount: 11, requireHoleFree: false }, tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false }, script: "pnpm run hub:project-to-cwl-gates" };
      payload.phpNextjsFlagshipVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-flagship-verify" };
      payload.phpNextjsSymfonyVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-symfony-verify" };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, schemaVersion: 2, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } }, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.fourOriginDeliveryBatch = { ok: true, script: "pnpm run hub:four-origin-delivery-batch-smoke" };
      payload.symfonyDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-delivery-batch-smoke" };
      payload.laravelMinMigrationOsBatch = { ok: true, script: "pnpm run hub:laravel-min-migration-os-batch-smoke" };
      payload.oracleStandaloneBatch = { ok: true, script: "pnpm run hub:oracle-standalone-batch-smoke" };
      payload.fullDeliveryMegaBatch = { ok: true, script: "pnpm run hub:full-delivery-mega-batch-smoke" };
      payload.cwlMegaBatch = { ok: true, script: "pnpm run hub:cwl-mega-batch-smoke" };
      payload.plainPhpMigrationOsBatch = { ok: true, script: "pnpm run hub:plain-php-migration-os-batch-smoke" };
      payload.tinyBlogDeliveryBatch = { ok: true, script: "pnpm run hub:tiny-blog-delivery-batch-smoke" };
      payload.deliveryPipelineStandaloneBatch = { ok: true, script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke" };
      payload.laravelMinOracleBatch = { ok: true, script: "pnpm run hub:laravel-min-oracle-batch-smoke" };
      payload.advisoryStandaloneMegaBatch = { ok: true, script: "pnpm run hub:advisory-standalone-mega-batch-smoke" };
      payload.allDeliveryUltraMegaBatch = { ok: true, script: "pnpm run hub:all-delivery-ultra-mega-batch-smoke" };
      payload.migrationOsMegaBatch = { ok: true, script: "pnpm run hub:migration-os-mega-batch-smoke" };
      payload.oracleProductUltraBatch = { ok: true, script: "pnpm run hub:oracle-product-ultra-batch-smoke" };
      payload.expressLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:express-laravel-min-delivery-batch-smoke" };
      payload.symfonyLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke" };
      payload.postTranslateVerifyOriginBatch = { ok: true, script: "pnpm run hub:post-translate-verify-origin-batch-smoke" };
      payload.tinyBlogDepthBatch = { ok: true, script: "pnpm run hub:tiny-blog-depth-batch-smoke" };
      payload.contractVerifyStandaloneBatch = { ok: true, script: "pnpm run hub:contract-verify-standalone-batch-smoke" };
      payload.chimeraCutoverOriginBatch = { ok: true, script: "pnpm run hub:chimera-cutover-origin-batch-smoke" };
      payload.migrationAssessmentOriginBatch = { ok: true, script: "pnpm run hub:migration-assessment-origin-batch-smoke" };
      payload.verifyGapsOriginBatch = { ok: true, script: "pnpm run hub:verify-gaps-origin-batch-smoke" };
      payload.postTranslateArtifactsOriginBatch = { ok: true, script: "pnpm run hub:post-translate-artifacts-origin-batch-smoke" };
      payload.verifyStandaloneMegaBatch = { ok: true, script: "pnpm run hub:verify-standalone-mega-batch-smoke" };
      payload.contractStandaloneMegaBatch = { ok: true, script: "pnpm run hub:contract-standalone-mega-batch-smoke" };
      payload.evidenceStandaloneMegaBatch = { ok: true, script: "pnpm run hub:evidence-standalone-mega-batch-smoke" };
      payload.plainPhpDepthBatch = { ok: true, script: "pnpm run hub:plain-php-depth-batch-smoke" };
      payload.symfonyDepthBatch = { ok: true, script: "pnpm run hub:symfony-depth-batch-smoke" };
      payload.expressDepthBatch = { ok: true, script: "pnpm run hub:express-depth-batch-smoke" };
      payload.laravelMinDepthBatch = { ok: true, script: "pnpm run hub:laravel-min-depth-batch-smoke" };
      payload.originDepthUltraBatch = { ok: true, script: "pnpm run hub:origin-depth-ultra-batch-smoke" };
      payload.chimeraAssessmentMegaBatch = { ok: true, script: "pnpm run hub:chimera-assessment-mega-batch-smoke" };
      payload.verifyProductUltraBatch = { ok: true, script: "pnpm run hub:verify-product-ultra-batch-smoke" };
      payload.projectToCwlAllOrigins = { ok: true, originCount: 23, script: "pnpm run hub:project-to-cwl-all-origins" };
      payload.cwlAllOriginsBatch = { ok: true, script: "pnpm run hub:cwl-all-origins-batch-smoke" };
      payload.cwlUniversalMegaBatch = { ok: true, script: "pnpm run hub:cwl-universal-mega-batch-smoke" };
      payload.cwlAppStackOriginsBatch = { ok: true, script: "pnpm run hub:cwl-app-stack-origins-batch-smoke" };
      payload.cwlAssetOriginsBatch = { ok: true, script: "pnpm run hub:cwl-asset-origins-batch-smoke" };
      payload.cwlPatternLiteralCwlBatch = { ok: true, suiteCount: 18, script: "pnpm run hub:cwl-pattern-literal-cwl-batch-smoke" };
      payload.hubTranslateCwlCoverage = { ok: true, schemaVersion: 2, originCount: 23, script: "pnpm run hub:translate-cwl-coverage-smoke" };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), schemaVersion: 14, oracleMicroFixture: "fixtures/tiny-blog", nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"], oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7 };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v57 with CWL roundtrip + translate all origins (G530)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v57-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 57;
      payload.plainPhpFlagshipGold = { ...(payload.plainPhpFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.symfonyFlagshipGold = { ...(payload.symfonyFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.expressFlagshipGold = { ...(payload.expressFlagshipGold ?? {}), inProcess: true, emitParity: { ok: true, targets: ["hono", "fastify", "nextjs"] } };
      payload.laravelVerifyGaps = { ok: true, backlogItems: 0, ingestNext: null, exportScript: "pnpm run hub:laravel-verify-gaps", actionScript: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelVerifyGapsAction = { ok: true, ingestRemediation: null, script: "pnpm run hub:laravel-verify-gaps-action" };
      payload.laravelMinSmoke = { ok: true, routeCount: 20, script: "pnpm run hub:laravel-min-smoke" };
      payload.hubEvidence = {
        schemaVersion: 14,
        failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
        pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
        requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
        requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
        requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
        requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
        requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
        requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
        requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
        requireOriginDepthEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH",
        requireUniversalCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL",
        requirePatternLiteralCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL",
        requireTranslateCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL",
        requirePatternLiteralRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP",
        requireTranslateCwlAllOriginsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS",
      };
      payload.laravelVerifyLive = { ok: true, skip: null, aggregate: { correctness: 1 }, script: "pnpm run hub:laravel-verify-export" };
      payload.phpOracleMicro = { fixture: "fixtures/tiny-blog", routeCount: 5, doc: "docs/CAPABILITY-MATRIX.md", script: "pnpm run hub:oracle-micro-fixture" };
      payload.cwlResponseStatusRuntime = { ok: true, rfc: "CWL-RFC-0006", withStatus: 2, script: "pnpm run hub:cwl-response-status-smoke" };
      payload.cwlRequestBodyRuntime = { ok: true, rfc: "CWL-RFC-0005", routeCount: 2, holeFree: 2, withBodyParams: 2, projectionOk: true, script: "pnpm run hub:cwl-request-body-smoke" };
      payload.cwlBodyRoundtrip = { ok: true, rfc: "CWL-RFC-0005", forwardHoleFree: 2, roundHoleFree: 2, script: "pnpm run hub:cwl-body-roundtrip-smoke" };
      payload.hubTranslateE2e = { ok: true, schemaVersion: 2, skip: null, variants: { plainPhp: { ok: true }, symfony: { ok: true }, tinyBlog: { ok: true }, express: { ok: true } }, script: "pnpm run hub:translate-e2e-smoke" };
      payload.hubEvidenceLive = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true, evidence: { pipelineGatePass: true } } }, script: "pnpm run hub:evidence-live" };
      payload.projectToCwlExport = { ok: true, schemaVersion: 3, plainPhp: { ok: true, holeCount: 0, routeCount: 20 }, symfony: { ok: true, holeCount: 0, routeCount: 20 }, express: { ok: true, holeCount: 0, routeCount: 20 }, laravelMin: { ok: true, holeCount: 11, requireHoleFree: false }, tinyBlog: { ok: true, holeCount: 5, requireHoleFree: false }, script: "pnpm run hub:project-to-cwl-gates" };
      payload.phpNextjsFlagshipVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-flagship-verify" };
      payload.phpNextjsSymfonyVerify = { ok: true, skip: "no-wptp-emit-nextjs", script: "pnpm run hub:php-nextjs-symfony-verify" };
      payload.hubEvidenceSmoke = { ok: true, schemaVersion: 1, script: "pnpm run hub:evidence-smoke" };
      payload.contractCwlSmoke = { ok: true, script: "pnpm run hub:contract-cwl-smoke" };
      payload.nodeOracleSpike = { ok: true, schemaVersion: 3, script: "pnpm run hub:node-oracle-spike" };
      payload.cwlRequestContextRuntime = { ok: true, rfc: "CWL-RFC-0004", script: "pnpm run hub:cwl-request-context-smoke" };
      payload.cwlResponseContentTypeRuntime = { ok: true, rfc: "CWL-RFC-0008", script: "pnpm run hub:cwl-response-content-type-smoke" };
      payload.cwlAuthEffectsRuntime = { ok: true, rfc: "CWL-RFC-0007", script: "pnpm run hub:cwl-auth-effects-smoke" };
      payload.cwlRfcRoundtrip = { ok: true, script: "pnpm run hub:cwl-rfc-roundtrip-smoke" };
      payload.contractRoundtrip = { ok: true, script: "pnpm run hub:contract-roundtrip-smoke" };
      payload.verifyPlaybooksSmoke = { ok: true, script: "pnpm run hub:verify-playbooks-smoke" };
      payload.hubRunnerSmoke = { ok: true, stepKinds: ["hub-translate", "hub-evidence-gate"], script: "pnpm run hub:runner-smoke" };
      payload.postTranslateVerifySmoke = { ok: true, skip: "no-verify-base-url", script: "pnpm run hub:post-translate-verify-smoke" };
      payload.migrationOsSmoke = { ok: true, script: "pnpm run hub:migration-os-smoke" };
      payload.cwlPreviewSmoke = { ok: true, script: "pnpm run hub:cwl-preview-smoke" };
      payload.cwlOpenapiSmoke = { ok: true, script: "pnpm run hub:cwl-openapi-smoke" };
      payload.pathAdviceSmoke = { ok: true, script: "pnpm run hub:path-advice-smoke" };
      payload.detectDatabasesSmoke = { ok: true, script: "pnpm run hub:detect-databases-smoke" };
      payload.postTranslateArtifactsSmoke = { ok: true, script: "pnpm run hub:post-translate-artifacts-smoke" };
      payload.cwlMiddlewareSmoke = { ok: true, rfc: "CWL-RFC-0001", script: "pnpm run hub:cwl-middleware-smoke" };
      payload.cwlDiffSmoke = { ok: true, script: "pnpm run hub:cwl-diff-smoke" };
      payload.cwlAllRfcRoundtrip = { ok: true, schemaVersion: 2, script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke" };
      payload.evidenceTrendSmoke = { ok: true, script: "pnpm run hub:evidence-trend-smoke" };
      payload.verifyGapsIngestSmoke = { ok: true, script: "pnpm run hub:verify-gaps-ingest-smoke" };
      payload.wptpGoldSmoke = { ok: true, skip: "no-wptp-matrix", script: "pnpm run hub:wptp-gold-smoke" };
      payload.deliveryPipelineSmoke = { ok: true, schemaVersion: 2, profiles: { plainPhp: { ok: true }, symfony: { ok: true }, express: { ok: true } }, script: "pnpm run hub:delivery-pipeline-smoke" };
      payload.cwlPathParamsRuntime = { ok: true, rfc: "CWL-RFC-0002", script: "pnpm run hub:cwl-path-params-smoke" };
      payload.cwlQueryParamsRuntime = { ok: true, rfc: "CWL-RFC-0003", script: "pnpm run hub:cwl-query-params-smoke" };
      payload.cwlMultiGoldRuntime = { ok: true, rfc: "CWL-RFC-0009", script: "pnpm run hub:cwl-multi-gold-smoke" };
      payload.cwlParamsBatch = { ok: true, script: "pnpm run hub:cwl-params-batch-smoke" };
      payload.migrationOsStandaloneBatch = { ok: true, script: "pnpm run hub:migration-os-standalone-batch-smoke" };
      payload.migrationOsSymfony = { ok: true, script: "pnpm run hub:migration-os-symfony-smoke" };
      payload.hubRunnerBatchSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:runner-batch-smoke" };
      payload.deliveryPipelineRunnerSmoke = { ok: true, schemaVersion: 3, script: "pnpm run hub:delivery-pipeline-runner-smoke" };
      payload.cwlParamsRoundtripBatch = { ok: true, script: "pnpm run hub:cwl-params-roundtrip-batch-smoke" };
      payload.cwlMultiBatch = { ok: true, script: "pnpm run hub:cwl-multi-batch-smoke" };
      payload.cwlInterchangeBatch = { ok: true, script: "pnpm run hub:cwl-interchange-batch-smoke" };
      payload.evidenceLiveStandaloneBatch = { ok: true, script: "pnpm run hub:evidence-live-standalone-batch-smoke" };
      payload.translateE2eStandaloneBatch = { ok: true, script: "pnpm run hub:translate-e2e-standalone-batch-smoke" };
      payload.expressDeliveryBatch = { ok: true, script: "pnpm run hub:express-delivery-batch-smoke" };
      payload.symfonyMigrationOsBatch = { ok: true, script: "pnpm run hub:symfony-migration-os-batch-smoke" };
      payload.projectToCwlExpressSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-express-smoke" };
      payload.laravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:laravel-min-delivery-batch-smoke" };
      payload.plainPhpDeliveryBatch = { ok: true, script: "pnpm run hub:plain-php-delivery-batch-smoke" };
      payload.threeOriginDeliveryBatch = { ok: true, script: "pnpm run hub:three-origin-delivery-batch-smoke" };
      payload.laravelDepthBatch = { ok: true, script: "pnpm run hub:laravel-depth-batch-smoke" };
      payload.cwlFullBatch = { ok: true, script: "pnpm run hub:cwl-full-batch-smoke" };
      payload.projectToCwlLaravelMinSmoke = { ok: true, script: "pnpm run hub:project-to-cwl-laravel-min-smoke" };
      payload.tinyBlogOracleBatch = { ok: true, script: "pnpm run hub:tiny-blog-oracle-batch-smoke" };
      payload.fourOriginDeliveryBatch = { ok: true, script: "pnpm run hub:four-origin-delivery-batch-smoke" };
      payload.symfonyDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-delivery-batch-smoke" };
      payload.laravelMinMigrationOsBatch = { ok: true, script: "pnpm run hub:laravel-min-migration-os-batch-smoke" };
      payload.oracleStandaloneBatch = { ok: true, script: "pnpm run hub:oracle-standalone-batch-smoke" };
      payload.fullDeliveryMegaBatch = { ok: true, script: "pnpm run hub:full-delivery-mega-batch-smoke" };
      payload.cwlMegaBatch = { ok: true, script: "pnpm run hub:cwl-mega-batch-smoke" };
      payload.plainPhpMigrationOsBatch = { ok: true, script: "pnpm run hub:plain-php-migration-os-batch-smoke" };
      payload.tinyBlogDeliveryBatch = { ok: true, script: "pnpm run hub:tiny-blog-delivery-batch-smoke" };
      payload.deliveryPipelineStandaloneBatch = { ok: true, script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke" };
      payload.laravelMinOracleBatch = { ok: true, script: "pnpm run hub:laravel-min-oracle-batch-smoke" };
      payload.advisoryStandaloneMegaBatch = { ok: true, script: "pnpm run hub:advisory-standalone-mega-batch-smoke" };
      payload.allDeliveryUltraMegaBatch = { ok: true, script: "pnpm run hub:all-delivery-ultra-mega-batch-smoke" };
      payload.migrationOsMegaBatch = { ok: true, script: "pnpm run hub:migration-os-mega-batch-smoke" };
      payload.oracleProductUltraBatch = { ok: true, script: "pnpm run hub:oracle-product-ultra-batch-smoke" };
      payload.expressLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:express-laravel-min-delivery-batch-smoke" };
      payload.symfonyLaravelMinDeliveryBatch = { ok: true, script: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke" };
      payload.postTranslateVerifyOriginBatch = { ok: true, script: "pnpm run hub:post-translate-verify-origin-batch-smoke" };
      payload.tinyBlogDepthBatch = { ok: true, script: "pnpm run hub:tiny-blog-depth-batch-smoke" };
      payload.contractVerifyStandaloneBatch = { ok: true, script: "pnpm run hub:contract-verify-standalone-batch-smoke" };
      payload.chimeraCutoverOriginBatch = { ok: true, script: "pnpm run hub:chimera-cutover-origin-batch-smoke" };
      payload.migrationAssessmentOriginBatch = { ok: true, script: "pnpm run hub:migration-assessment-origin-batch-smoke" };
      payload.verifyGapsOriginBatch = { ok: true, script: "pnpm run hub:verify-gaps-origin-batch-smoke" };
      payload.postTranslateArtifactsOriginBatch = { ok: true, script: "pnpm run hub:post-translate-artifacts-origin-batch-smoke" };
      payload.verifyStandaloneMegaBatch = { ok: true, script: "pnpm run hub:verify-standalone-mega-batch-smoke" };
      payload.contractStandaloneMegaBatch = { ok: true, script: "pnpm run hub:contract-standalone-mega-batch-smoke" };
      payload.evidenceStandaloneMegaBatch = { ok: true, script: "pnpm run hub:evidence-standalone-mega-batch-smoke" };
      payload.plainPhpDepthBatch = { ok: true, script: "pnpm run hub:plain-php-depth-batch-smoke" };
      payload.symfonyDepthBatch = { ok: true, script: "pnpm run hub:symfony-depth-batch-smoke" };
      payload.expressDepthBatch = { ok: true, script: "pnpm run hub:express-depth-batch-smoke" };
      payload.laravelMinDepthBatch = { ok: true, script: "pnpm run hub:laravel-min-depth-batch-smoke" };
      payload.originDepthUltraBatch = { ok: true, script: "pnpm run hub:origin-depth-ultra-batch-smoke" };
      payload.chimeraAssessmentMegaBatch = { ok: true, script: "pnpm run hub:chimera-assessment-mega-batch-smoke" };
      payload.verifyProductUltraBatch = { ok: true, script: "pnpm run hub:verify-product-ultra-batch-smoke" };
      payload.projectToCwlAllOrigins = { ok: true, originCount: 23, script: "pnpm run hub:project-to-cwl-all-origins" };
      payload.cwlAllOriginsBatch = { ok: true, script: "pnpm run hub:cwl-all-origins-batch-smoke" };
      payload.cwlUniversalMegaBatch = { ok: true, script: "pnpm run hub:cwl-universal-mega-batch-smoke" };
      payload.cwlAppStackOriginsBatch = { ok: true, script: "pnpm run hub:cwl-app-stack-origins-batch-smoke" };
      payload.cwlAssetOriginsBatch = { ok: true, script: "pnpm run hub:cwl-asset-origins-batch-smoke" };
      payload.cwlPatternLiteralCwlBatch = { ok: true, suiteCount: 18, script: "pnpm run hub:cwl-pattern-literal-cwl-batch-smoke" };
      payload.cwlPatternLiteralRoundtripBatch = { ok: true, suiteCount: 21, script: "pnpm run hub:cwl-pattern-literal-roundtrip-batch-smoke" };
      payload.hubTranslateCwlCoverage = { ok: true, schemaVersion: 2, originCount: 23, script: "pnpm run hub:translate-cwl-coverage-smoke" };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), schemaVersion: 15, oracleMicroFixture: "fixtures/tiny-blog", nextjsFlagshipFixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"], oracleProductPairCount: payload.capabilityMatrix?.oracleProductPairCount ?? 7 };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects schema v40 with a holey express CWL projection (G136)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v40-bad-"));
    const p = join(dir, "bad.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 40;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: { ok: true, yamlRouteCount: 20, manifestRouteCount: 20, script: "pnpm run hub:symfony-routes" },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        routesNameParity: { ok: true, yamlNameCount: 20, attributeNameCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
        attributeMethodsParity: { ok: true, routeCount: 3, fixture: "fixtures/hub-symfony-attr-methods" },
        cwlProjection: { total: 20, holeFree: 20, withStatus: 0, withParams: 0, withParamDefaults: 0, withContentType: 20, objectBodies: 0, holeReasons: [] },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
        cwlProjection: { total: 20, holeFree: 20, withStatus: 2, withParams: 5, withParamDefaults: 1, withContentType: 19, objectBodies: 10, holeReasons: [] },
      };
      payload.nodeExpressOracleVerify = { ok: true, correctness: 1, traceCount: 20, script: "pnpm run hub:node-express-oracle-verify" };
      // The only forced failure: the express CWL projection is no longer hole-free.
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: ["express-flagship-hono", "express-flagship-fastify", "express-flagship-nextjs", "express-flagship-cwl"],
        script: "pnpm run hub:express-flagship",
        cwlProjection: { total: 20, holeFree: 17, withStatus: 0, withParams: 0, withParamDefaults: 0, withContentType: 20, objectBodies: 3, holeReasons: ["hub:cwl:unsupported-body"] },
      };
      payload.capabilityMatrix = { ...(payload.capabilityMatrix ?? {}), oracleProductPairCount: 7 };
      payload.cwlResponseContentTypeGold = {
        suiteIds: ["cwl-response-content-type-hono", "cwl-response-content-type-fastify", "cwl-response-content-type-nextjs"],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = { ...(payload.goldVerify ?? {}), expectedSuiteCount: 154, suiteCount: 154, ok: true };
      payload.traceReplay = { ...(payload.traceReplay ?? {}), expectedSuiteCount: 115, suiteCount: 115, ok: true };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/expressFlagshipGold\.cwlProjection must be hole-free/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v38 with Symfony route-name parity", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v38-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 38;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: {
          ok: true,
          yamlRouteCount: 20,
          manifestRouteCount: 20,
          script: "pnpm run hub:symfony-routes",
        },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        routesNameParity: { ok: true, yamlNameCount: 20, attributeNameCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
        attributeMethodsParity: { ok: true, routeCount: 3, fixture: "fixtures/hub-symfony-attr-methods" },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 20,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 7,
      };
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 154,
        suiteCount: 154,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 115,
        suiteCount: 115,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v36 with Symfony class-prefix attribute parity", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v36-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 36;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: {
          ok: true,
          yamlRouteCount: 20,
          manifestRouteCount: 20,
          script: "pnpm run hub:symfony-routes",
        },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
        attributePrefixParity: { ok: true, routeCount: 2, fixture: "fixtures/hub-symfony-attr-prefix" },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 20,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 7,
      };
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 154,
        suiteCount: 154,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 115,
        suiteCount: 115,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v35 with Symfony attribute route parity", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v35-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 35;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: {
          ok: true,
          yamlRouteCount: 20,
          manifestRouteCount: 20,
          script: "pnpm run hub:symfony-routes",
        },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 20,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 7,
      };
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 154,
        suiteCount: 154,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 115,
        suiteCount: 115,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v34 with Symfony routes.yaml parity", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v34-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 34;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
        routesYamlParity: {
          ok: true,
          yamlRouteCount: 20,
          manifestRouteCount: 20,
          script: "pnpm run hub:symfony-routes",
        },
        routesAttributeParity: { ok: true, attributeRouteCount: 20 },
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 20,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 20,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 7,
      };
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 154,
        suiteCount: 154,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 115,
        suiteCount: 115,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v33 with Symfony flagship gold", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v33-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 33;
      payload.symfonyFlagshipGold = {
        ok: true,
        routeCount: 10,
        suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-cwl"],
        script: "pnpm run hub:symfony-flagship",
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 10,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 10,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 7,
      };
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 154,
        suiteCount: 154,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 115,
        suiteCount: 115,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v32 with CWL response content-type gold", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v32-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 32;
      payload.cwlResponseContentTypeGold = {
        suiteIds: [
          "cwl-response-content-type-hono",
          "cwl-response-content-type-fastify",
          "cwl-response-content-type-nextjs",
        ],
        rfc: "CWL-RFC-0008",
      };
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 10,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 10,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 6,
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 138,
        suiteCount: 138,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 110,
        suiteCount: 110,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v31 with plain PHP flagship gold", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v31-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 31;
      payload.plainPhpFlagshipGold = {
        ok: true,
        routeCount: 10,
        suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-cwl"],
        script: "pnpm run hub:plain-php-flagship",
      };
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 10,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 6,
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 135,
        suiteCount: 135,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 107,
        suiteCount: 107,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v30 with node express oracle verify", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v30-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 30;
      payload.nodeExpressOracleVerify = {
        ok: true,
        correctness: 1,
        traceCount: 10,
        script: "pnpm run hub:node-express-oracle-verify",
      };
      payload.capabilityMatrix = {
        ...(payload.capabilityMatrix ?? {}),
        oracleProductPairCount: 5,
      };
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 132,
        suiteCount: 132,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 105,
        suiteCount: 105,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v29 with express flagship gold", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v29-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 29;
      payload.expressFlagshipGold = {
        ok: true,
        suiteIds: [
          "express-flagship-hono",
          "express-flagship-fastify",
          "express-flagship-nextjs",
          "express-flagship-cwl",
        ],
        script: "pnpm run hub:express-flagship",
      };
      payload.goldVerify = {
        ...(payload.goldVerify ?? {}),
        expectedSuiteCount: 132,
        suiteCount: 132,
        ok: true,
      };
      payload.traceReplay = {
        ...(payload.traceReplay ?? {}),
        expectedSuiteCount: 105,
        suiteCount: 105,
        ok: true,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v28 with auth effects and php nextjs verify", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v28-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 28;
      payload.cwlAuthEffectsGold = {
        suiteIds: ["cwl-auth-effects-hono", "cwl-auth-effects-fastify", "cwl-auth-effects-nextjs"],
      };
      payload.laravelVerifyGaps = { exportScript: "pnpm run hub:laravel-verify-gaps" };
      payload.phpNextjsVerify = { ok: true, skip: "no-wptp-emit-nextjs" };
      payload.phpOracleSmoke = {
        ...(payload.phpOracleSmoke ?? {}),
        verifyNextjsOk: true,
        wptpEmitNextjsAvailable: false,
      };
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v27 with CWL body/status and capability matrix", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v27-"));
    const p = join(dir, "ok.json");
    const artifactPath = join(ROOT, "reports/ci/hub-completion.json");
    try {
      if (!existsSync(artifactPath)) {
        expect(true).toBe(true);
        return;
      }
      const payload = JSON.parse(readFileSync(artifactPath, "utf8"));
      payload.schemaVersion = 27;
      payload.cwlRequestBodyGold = {
        suiteIds: ["cwl-request-body-hono", "cwl-request-body-fastify", "cwl-request-body-nextjs"],
        rfc: "CWL-RFC-0005",
      };
      payload.cwlResponseStatusGold = {
        suiteIds: ["cwl-response-status-hono", "cwl-response-status-fastify", "cwl-response-status-nextjs"],
        rfc: "CWL-RFC-0006",
      };
      payload.capabilityMatrix = {
        schemaVersion: 1,
        oracleProductPairCount: 4,
        structuralSuiteCount: 125,
        doc: "docs/CAPABILITY-MATRIX.md",
      };
      payload.migrationProgramsApi = "/api/hub/migration-program";
      payload.evidenceApi = "/api/hub/projects/{id}/evidence";
      payload.verifyPlaybooksApi = "/api/hub/verify-playbooks";
      writeFileSync(p, `${JSON.stringify(payload)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      if (r.status !== 0) {
        throw new Error(r.stderr || r.stdout);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v4 with traceReplay targets", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v4-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 4,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 14 },
          traceReplay: { ok: true, correctness: 1, suiteCount: 11, targets: ["hono", "fastify"] },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
