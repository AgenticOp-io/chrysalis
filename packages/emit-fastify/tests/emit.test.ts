import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { domainTypesByTable, emitTypes, runArchaeology } from "@chrysalis/archaeology";
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
  });
}

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
});

describe("emit-fastify: dynamic new bridge", () => {
  test("emits phpDynamicNew helper usage for dynamic constructor paths", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-dyn-f-"));
    try {
      const mod = await ingestDirectory(FIXTURE_THROW_NEW);
      const res = await emit({ module: mod, outDir: out });
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
        await emit({ module: mod, outDir: out });
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
      const res = await emit({ module: mod, outDir: out });
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
      const res = await emit({ module: mod, outDir: out });
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

describe("emit-fastify: string-dispatch (tiny-n1)", () => {
  test("action handler emits switch", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-fn1-"));
    try {
      const mod = await ingestDirectory(FIXTURE_N1);
      await emit({ module: mod, outDir: out });
      const src = readFileSync(resolve(out, "src/handlers/action.ts"), "utf8");
      expect(src).toContain("switch (");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
