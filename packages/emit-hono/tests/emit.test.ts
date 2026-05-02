import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { domainTypesByTable, emitTypes, runArchaeology } from "@chrysalis/archaeology";
import { EMIT_RESUME_STATE_BASENAME, summarizeEmittedTypeScriptLayout } from "@chrysalis/emit-shared";
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

describe("emit-hono: tiny-blog output", () => {
  test("emits all expected files and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const res = await writeDomainAndEmit(mod, out);

      expect(res.handlerCount).toBe(5);
      expect(res.holes.length).toBe(0);

      expect(existsSync(resolve(out, "src/domain.ts"))).toBe(true);

      const serverSrc = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(serverSrc).toContain("chrysalisInProcessFetch");
      const sessionSrc = readFileSync(resolve(out, "src/session.ts"), "utf8");
      expect(sessionSrc).toContain("CHRYSALIS_SESSION_SQLITE_PATH");
      expect(sessionSrc).toContain("CHRYSALIS_SESSION_REDIS_URL");
      expect(sessionSrc).toContain('await import("redis")');
      expect(sessionSrc).toContain("CREATE TABLE IF NOT EXISTS chrysalis_sessions");

      const expectedFiles = [
        "package.json",
        "tsconfig.json",
        "src/db.ts",
        "src/ctx.ts",
        "src/schema.ts",
        "src/session.ts",
        "src/runtime.ts",
        "src/server.ts",
        "src/index.ts",
        "src/handlers/posts_list.ts",
        "src/handlers/posts_view.ts",
        "src/handlers/login.ts",
        "src/handlers/posts_create.ts",
        "src/handlers/comments_create.ts",
        "chrysalis.holes.json",
      ];
      const emitted = new Set(res.files.map((f) => f.path.replace(/\\/g, "/")));
      for (const f of expectedFiles) expect(emitted.has(f)).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("lazy route registration uses dynamic import per handler in server.ts", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-lazy-"));
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
      const lazyServer = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(lazyServer).toContain("await registerRoutes(app)");
      expect(lazyServer).toContain('await import("./handlers/');
      expect(lazyServer).not.toContain('from "./handlers/login.js"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("lazy route registration works with emitSharedRuntimeImports", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-lazy-sri-"));
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
      const lazyServer = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(lazyServer).toContain('await import("./handlers/');
      expect(existsSync(resolve(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("login handler contains session.write and queryOne", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await writeDomainAndEmit(mod, out);
      const src = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(src).toContain("queryOne<User>(");
      expect(src).toContain('import type { User } from "../domain.js"');
      expect(src).toContain(`getSession(c).set("user_id"`);
      expect(src).toContain("await passwordVerify(");
      // Must not fall back to a call hole for the wrapper function.
      expect(src).not.toContain("call:verify_password");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("posts_view handler carries @chrysalis-effects annotation", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await writeDomainAndEmit(mod, out);
      const src = readFileSync(resolve(out, "src/handlers/posts_view.ts"), "utf8");
      expect(src).toMatch(/@chrysalis-effects.*db\.read:posts/);
      expect(src).toMatch(/@chrysalis-effects.*db\.read:comments/);
      expect(src).toMatch(/@chrysalis-effects.*session\.read/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: dynamic new bridge", () => {
  test("emits phpDynamicNew helper usage for dynamic constructor paths", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-dyn-h-"));
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
    "dynnew GET responds via chrysalisInProcessFetch after npm install",
    async () => {
      const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-dyn-fetch-"));
      try {
        const mod = await ingestDirectory(FIXTURE_THROW_NEW);
        await emit({ module: mod, outDir: out, provenanceRoot: FIXTURE_THROW_NEW });
        execSync("npm install", { cwd: out, stdio: "pipe" });
        writeFileSync(
          resolve(out, "_chrysalis_dyn_probe.ts"),
          `import { registerPhpFqnCtor } from "./src/runtime.js";
import { chrysalisInProcessFetch } from "./src/server.js";

class PhpException extends Error {
  constructor(message?: string) {
    super(message ?? "");
    this.name = "Exception";
  }
}
registerPhpFqnCtor("Exception", (...args) => new PhpException(args[0] != null ? String(args[0]) : ""));

const res = await chrysalisInProcessFetch("http://127.0.0.1/dynnew");
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

describe("emit-hono: flagship laravel-min (Milestone 4 slice)", () => {
  test("emits twenty handlers and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
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

describe("emit-hono: flagship laravel-full chrysalis-templates", () => {
  test("emits fifty-two handlers and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-lf-"));
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

describe("emit-hono: Milestone 6A auth-boundary emit holes", () => {
  test("tags unresolved Gate facade call with auth: unresolved hole reason", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-auth-emit-"));
    try {
      const b = new ModuleBuilder({ sourceApp: "auth-hole-fixture" });
      const d = dataDialect.builders(b);
      const r = webRequest.builders(b);
      const origin = phpLocator("routes/gate.php", 1, 0);
      const arg = d.literal({ value: "edit", type: T.string, origin });
      const call = d.call({
        callee: "Illuminate\\Support\\Facades\\Gate::allows",
        args: [arg],
        type: T.unknown,
        origin,
      });
      const handler = r.handler({
        attrs: { name: "gate_probe", input: T.record({}), output: T.string },
        body: call,
        effects: [],
        origin,
      });
      const route = r.route({
        attrs: { method: "GET", path: "/gate-probe", pathParams: [] },
        handler,
        origin,
      });
      b.addRoot(route);
      const mod = b.finish();
      const res = await emit({ module: mod, outDir: out });
      expect(res.holes.length).toBeGreaterThan(0);
      expect(res.holes.some((h) => h.reason.startsWith("auth:"))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: handlerImportBarrel", () => {
  test("emits chrysalis-handler-imports.ts and handlers use barrel", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-barrel-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { handlerImportBarrel: true },
      });
      const barrel = readFileSync(resolve(out, "src/chrysalis-handler-imports.ts"), "utf8");
      expect(barrel).toContain('export type { Context } from "hono"');
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-handler-imports.js");
      expect(login).not.toContain('from "hono/cookie"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: emitHandlerFingerprints", () => {
  test("writes chrysalis.emit-handler-fingerprints.json with stable kind", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-fp-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitHandlerFingerprints: true },
      });
      const raw = readFileSync(resolve(out, "chrysalis.emit-handler-fingerprints.json"), "utf8");
      const j = JSON.parse(raw) as { kind: string; schemaVersion: number; handlers: Record<string, string> };
      expect(j.kind).toBe("chrysalis.emit.handlerFingerprints");
      expect(j.schemaVersion).toBe(1);
      expect(Object.keys(j.handlers).length).toBeGreaterThan(0);
      expect(Object.values(j.handlers).every((h) => /^[0-9a-f]{64}$/.test(h))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emitHandlerFingerprints works with emitSharedRuntimeImports", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-fp-sri-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitHandlerFingerprints: true, emitSharedRuntimeImports: true },
      });
      const raw = readFileSync(resolve(out, "chrysalis.emit-handler-fingerprints.json"), "utf8");
      const j = JSON.parse(raw) as { kind: string; handlers: Record<string, string> };
      expect(j.kind).toBe("chrysalis.emit.handlerFingerprints");
      expect(Object.keys(j.handlers).length).toBeGreaterThan(0);
      expect(existsSync(resolve(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: runtimeFacadeModule", () => {
  test("emits chrysalis-runtime-facade.ts and handlers import through it", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-facade-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { runtimeFacadeModule: true },
      });
      const facade = readFileSync(resolve(out, "src/chrysalis-runtime-facade.ts"), "utf8");
      expect(facade).toContain('export * from "./runtime.js"');
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-facade.js");
      expect(login).not.toContain('from "../runtime.js"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("barrel mode re-exports runtime via facade when both flags set", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-facade-barrel-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { handlerImportBarrel: true, runtimeFacadeModule: true },
      });
      const barrel = readFileSync(resolve(out, "src/chrysalis-handler-imports.ts"), "utf8");
      expect(barrel).toContain("./chrysalis-runtime-facade.js");
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-handler-imports.js");
      expect(login).not.toContain("chrysalis-runtime-facade");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: emitDedupeIdenticalHandlerBodies", () => {
  test("writes chrysalis-deduped module and thin handlers when two bodies match", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-dedupe-"));
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
        provenanceRoot: resolve(__dirname, "../../../fixtures/tiny-blog"),
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
      expect(aSrc).toContain(`return ${idA}(c);`);
      expect(bSrc).toContain(`return ${idA}(c);`);
      expect(aSrc).not.toContain("__hole(");
      expect(bSrc).not.toContain("__hole(");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: emitSharedRuntimeImports", () => {
  test("summarizeEmittedTypeScriptLayout counts one extra .ts when shared module is emitted", async () => {
    const baseOut = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-layout-base-"));
    const sriOut = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-layout-sri-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({ module: mod, outDir: baseOut, provenanceRoot: FIXTURE });
      await emit({
        module: mod,
        outDir: sriOut,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitSharedRuntimeImports: true },
      });
      const baseLayout = summarizeEmittedTypeScriptLayout(baseOut);
      const sriLayout = summarizeEmittedTypeScriptLayout(sriOut);
      expect(sriLayout.tsFileCount).toBe(baseLayout.tsFileCount + 1);
      expect(sriLayout.tsLineCount).toBeGreaterThan(baseLayout.tsLineCount);
    } finally {
      rmSync(baseOut, { recursive: true, force: true });
      rmSync(sriOut, { recursive: true, force: true });
    }
  });

  test("emits chrysalis-runtime-imports.ts and handlers import through it", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-shared-rt-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitSharedRuntimeImports: true },
      });
      const shared = readFileSync(resolve(out, "src/chrysalis-runtime-imports.ts"), "utf8");
      expect(shared).toContain('from "./runtime.js"');
      expect(shared).toContain("export {");
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
      expect(login).not.toContain('from "../runtime.js"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("shared runtime module re-exports via facade when runtimeFacadeModule set", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-shared-rt-facade-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitSharedRuntimeImports: true, runtimeFacadeModule: true },
      });
      const shared = readFileSync(resolve(out, "src/chrysalis-runtime-imports.ts"), "utf8");
      expect(shared).toContain('from "./chrysalis-runtime-facade.js"');
      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
      expect(login).not.toContain("../chrysalis-runtime-facade.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("rejects emitSharedRuntimeImports with handlerImportBarrel", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-shared-barrel-bad-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await expect(
        emit({
          module: mod,
          outDir: out,
          provenanceRoot: FIXTURE,
          emitStrategy: { emitSharedRuntimeImports: true, handlerImportBarrel: true },
        }),
      ).rejects.toThrow(/emitSharedRuntimeImports cannot be combined with handlerImportBarrel/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: emitRoutePathConstants", () => {
  test("emits chrysalis-route-paths.ts and server uses ChrysalisRoutePaths", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-rpc-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
        provenanceRoot: FIXTURE,
        emitStrategy: { emitRoutePathConstants: true },
      });
      const paths = readFileSync(resolve(out, "src/chrysalis-route-paths.ts"), "utf8");
      expect(paths).toContain("export const ChrysalisRoutePaths");
      expect(paths).toContain('"login"');
      const server = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(server).toContain("ChrysalisRoutePaths");
      expect(server).toContain("./chrysalis-route-paths.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emitRoutePathConstants works with emitSharedRuntimeImports", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-rpc-sri-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await emit({
        module: mod,
        outDir: out,
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

describe("emit-hono: emitResume", () => {
  test("skips completed handler writes then clears state on success", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-resume-"));
    try {
      const mkMod = () => {
        const b = new ModuleBuilder({ sourceApp: "emit-resume-t" });
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
      await emit({ module: mod, outDir: out });
      const haPath = resolve(out, "src/handlers/ha.ts");
      const hbPath = resolve(out, "src/handlers/hb.ts");
      const haBefore = readFileSync(haPath, "utf8");
      const hbBefore = readFileSync(hbPath, "utf8");
      rmSync(hbPath);
      writeFileSync(
        resolve(out, EMIT_RESUME_STATE_BASENAME),
        JSON.stringify({ version: 1, completedHandlers: ["src/handlers/ha.ts"] }),
        "utf8",
      );
      await emit({ module: mod, outDir: out, emitResume: true });
      expect(readFileSync(haPath, "utf8")).toBe(haBefore);
      expect(readFileSync(hbPath, "utf8")).toBe(hbBefore);
      expect(existsSync(resolve(out, EMIT_RESUME_STATE_BASENAME))).toBe(false);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emitResume with emitSharedRuntimeImports restores skipped handler and keeps shared module", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-resume-sri-"));
    const emitStrategy = { emitSharedRuntimeImports: true as const };
    try {
      const mkMod = () => {
        const b = new ModuleBuilder({ sourceApp: "emit-resume-sri" });
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

describe("emit-hono: string-dispatch switch (tiny-n1 /action)", () => {
  test("action handler emits switch on POST op", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE_N1);
      await emit({ module: mod, outDir: out, provenanceRoot: FIXTURE_N1 });
      const src = readFileSync(resolve(out, "src/handlers/action.ts"), "utf8");
      expect(src).toContain("switch (");
      expect(src).toMatch(/case ['"]create['"]/);
      expect(src).toMatch(/case ['"]update['"]/);
      expect(src).toMatch(/case ['"]delete['"]/);
      expect(src).toMatch(/case ['"]archive['"]/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
