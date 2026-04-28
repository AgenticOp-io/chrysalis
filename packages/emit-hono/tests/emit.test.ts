import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { domainTypesByTable, emitTypes, runArchaeology } from "@chrysalis/archaeology";
import { ModuleBuilder, T, dataDialect, phpLocator, webRequest } from "@chrysalis/webir";
import { emit } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const FIXTURE_SCHEMA = resolve(__dirname, "../../../fixtures/tiny-blog/schema.sql");
const FIXTURE_N1 = resolve(__dirname, "../../../fixtures/tiny-n1");
const FLAGSHIP_LARAVEL_MIN = resolve(__dirname, "../../../flagship/laravel-min");
const FLAGSHIP_LARAVEL_FULL_TEMPLATES = resolve(
  __dirname,
  "../../../flagship/laravel-full/chrysalis-templates",
);

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

describe("emit-hono: flagship laravel-min (Milestone 4 slice)", () => {
  test("emits twenty handlers and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
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

describe("emit-hono: flagship laravel-full chrysalis-templates", () => {
  test("emits fifty-two handlers and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-lf-"));
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

describe("emit-hono: string-dispatch switch (tiny-n1 /action)", () => {
  test("action handler emits switch on POST op", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE_N1);
      await emit({ module: mod, outDir: out });
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
