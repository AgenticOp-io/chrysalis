import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { domainTypesByTable, emitTypes, runArchaeology } from "@chrysalis/archaeology";
import { EMIT_RESUME_STATE_BASENAME } from "@chrysalis/emit-shared";
import { ModuleBuilder, T, dataDialect, phpLocator, webRequest } from "@chrysalis/webir";
import { emit } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const FIXTURE_SCHEMA = resolve(__dirname, "../../../fixtures/tiny-blog/schema.sql");
const FIXTURE_N1 = resolve(__dirname, "../../../fixtures/tiny-n1");
const FIXTURE_THROW_NEW = resolve(__dirname, "../../../fixtures/throw-new-probe");
const FLAGSHIP_LARAVEL_MIN = resolve(__dirname, "../../../flagship/laravel-min");
const FLAGSHIP_LARAVEL_FULL_TEMPLATES = resolve(
  __dirname,
  "../../../flagship/laravel-full/chrysalis-templates",
);

/** Temp-dir `npm install` probes: on by default in GitHub Actions (`CI=true`); opt in locally with `CHRYSALIS_E2E_EMIT=1`. */
const RUN_EMIT_NPM_E2E = process.env.CI === "true" || process.env.CHRYSALIS_E2E_EMIT === "1";

function writeDomainAndEmit(mod: Awaited<ReturnType<typeof ingestDirectory>>, outDir: string) {
  const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
  mkdirSync(resolve(outDir, "src"), { recursive: true });
  writeFileSync(resolve(outDir, "src/domain.ts"), emitTypes(schemaReport));
  return emit({
    module: mod,
    outDir,
    schemaReport,
    domainTypesByTable: domainTypesByTable(schemaReport),
    provenanceRoot: FIXTURE,
  });
}

describe("emit-fastify: emitSharedRuntimeImports", () => {
  test("emits chrysalis-runtime-imports.ts and handlers import through it", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-shared-rt-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { emitSharedRuntimeImports: true },
      });
      const shared = readFileSync(resolve(out, "src/chrysalis-runtime-imports.ts"), "utf8");
      expect(shared).toContain('from "./runtime.js"');
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("shared runtime module re-exports via facade when runtimeFacadeModule set", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-shared-rt-facade-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { emitSharedRuntimeImports: true, runtimeFacadeModule: true },
      });
      const shared = readFileSync(resolve(out, "src/chrysalis-runtime-imports.ts"), "utf8");
      expect(shared).toContain('from "./chrysalis-runtime-facade.js"');
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("rejects emitSharedRuntimeImports with handlerImportBarrel", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-shared-barrel-bad-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await expect(
        emit({
          module: mod,
          outDir: out,
          schemaReport,
          domainTypesByTable: domainTypesByTable(schemaReport),
          provenanceRoot: FIXTURE,
          emitStrategy: { emitSharedRuntimeImports: true, handlerImportBarrel: true },
        }),
      ).rejects.toThrow(/emitSharedRuntimeImports cannot be combined with handlerImportBarrel/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: emitDedupeIdenticalHandlerBodies", () => {
  test("writes chrysalis-deduped module and thin handlers when two bodies match", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-dedupe-"));
    try {
      const b = new ModuleBuilder({ sourceApp: "emit-dedupe-body" });
      const d = dataDialect.builders(b);
      const r = webRequest.builders(b);
      const oa = phpLocator("pages/a.php", 1, 0);
      const ob = phpLocator("pages/b.php", 1, 0);
      const holeA = d.hole({ reason: "probe", input: T.unknown, output: T.string, origin: oa });
      const holeB = d.hole({ reason: "probe", input: T.unknown, output: T.string, origin: ob });
      const h1 = r.handler({
        attrs: { name: "handler_a", input: T.record({}), output: T.string },
        body: holeA,
        effects: [],
        origin: oa,
      });
      const h2 = r.handler({
        attrs: { name: "handler_b", input: T.record({}), output: T.string },
        body: holeB,
        effects: [],
        origin: ob,
      });
      b.addRoot(r.route({ attrs: { method: "GET", path: "/a", pathParams: [] }, handler: h1, origin: oa }));
      b.addRoot(r.route({ attrs: { method: "GET", path: "/b", pathParams: [] }, handler: h2, origin: ob }));
      const mod = b.finish();
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitDedupeIdenticalHandlerBodies: true },
      });
      const dedupeDir = resolve(out, "src/chrysalis-deduped");
      expect(existsSync(dedupeDir)).toBe(true);
      expect(readdirSync(dedupeDir).length).toBe(1);
      const serverTs = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(serverTs).toContain("handler_a");
      const aSrc = readFileSync(resolve(out, "src/handlers/handler_a.ts"), "utf8");
      const bSrc = readFileSync(resolve(out, "src/handlers/handler_b.ts"), "utf8");
      const idA = aSrc.match(/chrysalisBodyDedupe_[0-9a-f]+/)?.[0];
      const idB = bSrc.match(/chrysalisBodyDedupe_[0-9a-f]+/)?.[0];
      expect(idA).toBeDefined();
      expect(idA).toBe(idB);
      expect(existsSync(resolve(dedupeDir, `${idA}.ts`))).toBe(true);
      expect(aSrc).toContain(`return ${idA}(req, reply);`);
      expect(bSrc).toContain(`return ${idA}(req, reply);`);
      expect(aSrc).not.toContain("__hole(");
      expect(bSrc).not.toContain("__hole(");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: runtimeFacadeModule", () => {
  test("emits chrysalis-runtime-facade.ts and handlers import through it", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-facade-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { runtimeFacadeModule: true },
      });
      const facade = readFileSync(resolve(out, "src/chrysalis-runtime-facade.ts"), "utf8");
      expect(facade).toContain('export * from "./runtime.js"');
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-facade.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: emitHandlerFingerprints", () => {
  test("writes chrysalis.emit-handler-fingerprints.json", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-fp-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { emitHandlerFingerprints: true },
      });
      const raw = readFileSync(resolve(out, "chrysalis.emit-handler-fingerprints.json"), "utf8");
      const j = JSON.parse(raw) as { kind: string; handlers: Record<string, string> };
      expect(j.kind).toBe("chrysalis.emit.handlerFingerprints");
      expect(Object.keys(j.handlers).length).toBe(5);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emitHandlerFingerprints works with emitSharedRuntimeImports", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-fp-sri-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { emitHandlerFingerprints: true, emitSharedRuntimeImports: true },
      });
      const raw = readFileSync(resolve(out, "chrysalis.emit-handler-fingerprints.json"), "utf8");
      const j = JSON.parse(raw) as { kind: string; handlers: Record<string, string> };
      expect(j.kind).toBe("chrysalis.emit.handlerFingerprints");
      expect(Object.keys(j.handlers).length).toBe(5);
      expect(existsSync(resolve(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: tiny-blog output", () => {
  test("emits Fastify server and schema; login uses req/reply", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const res = await writeDomainAndEmit(mod, out);

      expect(res.handlerCount).toBe(5);
      expect(res.holes.length).toBe(0);

      const server = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(server).toContain("Fastify");
      expect(server).toContain("export async function fetch(");
      expect(server).toContain("app.inject");
      expect(server).toContain("chrysalisDeterminismOnRequest");
      expect(server).toContain("@fastify/formbody");

      const ctx = readFileSync(resolve(out, "src/ctx.ts"), "utf8");
      expect(ctx).toContain("chrysalisNow");
      expect(ctx).toContain("chrysalisRandom");
      const session = readFileSync(resolve(out, "src/session.ts"), "utf8");
      expect(session).toContain("CHRYSALIS_SESSION_SQLITE_PATH");
      expect(session).toContain("CHRYSALIS_SESSION_REDIS_URL");
      expect(session).toContain('await import("redis")');
      expect(session).toContain("CREATE TABLE IF NOT EXISTS chrysalis_sessions");

      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("FastifyRequest");
      expect(login).toContain("queryOne<User>(");
      expect(login).toContain("getSession(req)");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("lazy route registration uses dynamic import in buildApp", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-lazy-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { routeRegistration: "lazy" },
      });
      const server = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(server).toContain('await import("./handlers/');
      expect(server).not.toContain('from "./handlers/login.js"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("lazy route registration works with emitSharedRuntimeImports", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-lazy-sri-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { routeRegistration: "lazy", emitSharedRuntimeImports: true },
      });
      const server = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(server).toContain('await import("./handlers/');
      expect(existsSync(resolve(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emitRoutePathConstants works with emitSharedRuntimeImports", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-rpc-sri-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { emitRoutePathConstants: true, emitSharedRuntimeImports: true },
      });
      const server = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(server).toContain("ChrysalisRoutePaths");
      expect(existsSync(resolve(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: dynamic new bridge", () => {
  test("emits phpDynamicNew helper usage for dynamic constructor paths", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-dyn-f-"));
    try {
      const mod = await ingestDirectory(FIXTURE_THROW_NEW);
      const res = await emit({ module: mod, outDir: out, provenanceRoot: FIXTURE_THROW_NEW });
      expect(res.handlerCount).toBe(5);
      const dynSrc = readFileSync(resolve(out, "src/handlers/dynnew.ts"), "utf8");
      expect(dynSrc).toContain("phpDynamicNew(");
      expect(dynSrc).toContain('from "../runtime.js"');
      const dynFqnSrc = readFileSync(resolve(out, "src/handlers/dynfqn.ts"), "utf8");
      expect(dynFqnSrc).toContain("phpDynamicNew(");
      const runtimeSrc = readFileSync(resolve(out, "src/runtime.ts"), "utf8");
      expect(runtimeSrc).toContain("export function phpDynamicNew(");
      expect(runtimeSrc).toContain('return __hole("new:dynamic"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test.skipIf(!RUN_EMIT_NPM_E2E)(
    "dynnew GET responds in-process via server fetch after npm install",
    async () => {
      const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-dyn-fetch-f-"));
      try {
        const mod = await ingestDirectory(FIXTURE_THROW_NEW);
        await emit({ module: mod, outDir: out, provenanceRoot: FIXTURE_THROW_NEW });
        execSync("npm install", { cwd: out, stdio: "pipe" });
        writeFileSync(
          resolve(out, "_chrysalis_dyn_probe.ts"),
          `import { registerPhpFqnCtor } from "./src/runtime.js";
import { fetch } from "./src/server.js";

class PhpException extends Error {
  constructor(message?: string) {
    super(message ?? "");
    this.name = "Exception";
  }
}
registerPhpFqnCtor("Exception", (...args) => new PhpException(args[0] != null ? String(args[0]) : ""));

const res = await fetch("http://127.0.0.1/dynnew");
console.log(String(res.status));
`,
        );
        const statusLine = execSync("npx tsx _chrysalis_dyn_probe.ts", {
          cwd: out,
          encoding: "utf8",
        }).trim();
        expect(statusLine).toBe("200");
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
    120_000,
  );
});

describe("emit-fastify: flagship laravel-min (Milestone 4 slice)", () => {
  test("emits twenty handlers and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-flag-"));
    try {
      const mod = await ingestDirectory(FLAGSHIP_LARAVEL_MIN);
      const res = await emit({ module: mod, outDir: out, provenanceRoot: FLAGSHIP_LARAVEL_MIN });
      expect(res.handlerCount).toBe(20);
      expect(res.holes.length).toBe(0);
      expect(existsSync(resolve(out, "src/handlers/home_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/hello_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/health_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/jump_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/api_health_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/robots_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/humans_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/security_txt_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/sitemap_xml_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/pilot_css_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/manifest_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/login_form_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/login_post.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/logout_post.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/items_list.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/items_count.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/echo_post.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/session_visit_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/session_me_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gate_probe_show.ts"))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: flagship laravel-full chrysalis-templates", () => {
  test("emits fifty-two handlers and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-lf-"));
    try {
      const mod = await ingestDirectory(FLAGSHIP_LARAVEL_FULL_TEMPLATES);
      const res = await emit({ module: mod, outDir: out, provenanceRoot: FLAGSHIP_LARAVEL_FULL_TEMPLATES });
      expect(res.handlerCount).toBe(52);
      expect(res.holes.length).toBe(0);
      expect(existsSync(resolve(out, "src/handlers/ping_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/health_txt_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/api_health_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/jump_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/session_visit_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/hello_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/framework_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/first_item_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/last_item_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/items_list_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lib_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/sum_ids_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/min_id_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/max_id_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/avg_id_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/id_span_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/sum_squares_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/even_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/odd_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gt_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lt_three_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gte_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lte_three_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/ne_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/between_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/eq_one_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/eq_three_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/eq_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/ne_one_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/ne_three_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lt_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gt_one_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gte_one_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lte_one_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/between_one_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gt_three_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lt_one_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/gte_three_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/lte_two_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/eq_zero_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/ne_zero_count_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/items_snapshot_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/items_group_parity_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/items_cte_rollup_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/recursive_stress_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/chrysalis_auth_sanctum_oauth_probe_show.ts"))).toBe(
        true,
      );
      expect(existsSync(resolve(out, "src/handlers/chrysalis_socialite_fortify_probe_show.ts"))).toBe(
        true,
      );
      expect(existsSync(resolve(out, "src/handlers/session_me_show.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/session_login_post.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/session_logout_post.ts"))).toBe(true);
      expect(existsSync(resolve(out, "src/handlers/echo_post.ts"))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: emitResume", () => {
  test("emitResume with emitSharedRuntimeImports restores skipped handler", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-resume-sri-"));
    const emitStrategy = { emitSharedRuntimeImports: true as const };
    try {
      const mkMod = () => {
        const b = new ModuleBuilder({ sourceApp: "emit-f-resume-sri" });
        const d = dataDialect.builders(b);
        const r = webRequest.builders(b);
        const oa = phpLocator("pages/a.php", 1, 0);
        const holeA = d.hole({ reason: "ra", input: T.unknown, output: T.string, origin: oa });
        const hA = r.handler({
          attrs: { name: "ha", input: T.record({}), output: T.string },
          body: holeA,
          effects: [],
          origin: oa,
        });
        b.addRoot(r.route({ attrs: { method: "GET", path: "/a", pathParams: [] }, handler: hA, origin: oa }));
        const ob = phpLocator("pages/b.php", 1, 0);
        const holeB = d.hole({ reason: "rb", input: T.unknown, output: T.string, origin: ob });
        const hB = r.handler({
          attrs: { name: "hb", input: T.record({}), output: T.string },
          body: holeB,
          effects: [],
          origin: ob,
        });
        b.addRoot(r.route({ attrs: { method: "GET", path: "/b", pathParams: [] }, handler: hB, origin: ob }));
        return b.finish();
      };
      const mod = mkMod();
      await emit({ module: mod, outDir: out, emitStrategy });
      const sharedPath = resolve(out, "src/chrysalis-runtime-imports.ts");
      expect(existsSync(sharedPath)).toBe(true);
      const haPath = resolve(out, "src/handlers/ha.ts");
      const hbPath = resolve(out, "src/handlers/hb.ts");
      expect(readFileSync(haPath, "utf8")).toContain("../chrysalis-runtime-imports.js");
      const haBefore = readFileSync(haPath, "utf8");
      const hbBefore = readFileSync(hbPath, "utf8");
      const sharedBefore = readFileSync(sharedPath, "utf8");
      rmSync(hbPath);
      writeFileSync(
        resolve(out, EMIT_RESUME_STATE_BASENAME),
        JSON.stringify({ version: 1, completedHandlers: ["src/handlers/ha.ts"] }),
        "utf8",
      );
      await emit({ module: mod, outDir: out, emitResume: true, emitStrategy });
      expect(readFileSync(haPath, "utf8")).toBe(haBefore);
      expect(readFileSync(hbPath, "utf8")).toBe(hbBefore);
      expect(readFileSync(sharedPath, "utf8")).toBe(sharedBefore);
      expect(existsSync(resolve(out, EMIT_RESUME_STATE_BASENAME))).toBe(false);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: string-dispatch (tiny-n1)", () => {
  test("action handler emits switch", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-fn1-"));
    try {
      const mod = await ingestDirectory(FIXTURE_N1);
      await emit({ module: mod, outDir: out, provenanceRoot: FIXTURE_N1 });
      const src = readFileSync(resolve(out, "src/handlers/action.ts"), "utf8");
      expect(src).toContain("switch (");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
