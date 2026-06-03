import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const PARSER = resolve(ROOT, "scripts/hub-ingest/cwl-parser.mjs");
const FIXTURE = resolve(ROOT, "fixtures/hub-gold-cwl");

/** GCE runs authoring batches via dedicated vitest files (see gce-hub-authoring-batch-vitest.sh). */
const gceSlimHubCwl =
  process.env.CHRYSALIS_GCE_SLIM_HUB_CWL === "1" || process.env.CHRYSALIS_GCE_ALL_TESTS === "1";
const batchTest = gceSlimHubCwl ? test.skip : test;

test("cwl parser: layout imports and page params (RFC-0011 / G1145)", async () => {
  const { parseCwlModuleResolved } = await import(resolve(ROOT, "scripts/hub-ingest/cwl-module-graph.mjs"));
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-layout");
  const src = await readFile(resolve(FIX, "routes.cwl"), "utf8");
  const mod = parseCwlModuleResolved(src, "routes.cwl", { baseDir: FIX });
  expect(mod.imports).toContain("layouts/shell.cwl");
  expect(mod.routes.length).toBeGreaterThanOrEqual(3);
  const doc = mod.routes.find((r) => r.path === "/docs/:slug" && r.surfaceKind === "page");
  expect(doc?.handlerPathParams).toEqual(["slug"]);
});

test("cwl emit round-trip preserves @page surface (G1146)", async () => {
  const { runCwlFullstackRoundtripSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-roundtrip-smoke.mjs")
  );
  const report = await runCwlFullstackRoundtripSmoke();
  expect(report.ok).toBe(true);
});

test("sveltekit route lift discovers file routes (G1144)", async () => {
  const { runSvelteKitSmoke } = await import(resolve(ROOT, "scripts/hub-ingest/hub-sveltekit-smoke.mjs"));
  const report = await runSvelteKitSmoke();
  expect(report.ok).toBe(true);
  expect(report.discovered?.blogPath).toBe("/blog/:slug");
});

test("sveltekit exports CWL projection with catalogued holes (G1148)", async () => {
  const { runSveltekitCwlExportSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-sveltekit-cwl-export-smoke.mjs"),
  );
  const report = await runSveltekitCwlExportSmoke();
  expect(report.ok).toBe(true);
  expect(report.emit?.holeCount).toBe(0);
});

test("sveltekit lift is hole-free on gold fixture (G1153)", async () => {
  const { runSvelteKitSmoke } = await import(resolve(ROOT, "scripts/hub-ingest/hub-sveltekit-smoke.mjs"));
  const report = await runSvelteKitSmoke();
  expect(report.ok).toBe(true);
  expect(report.holeCount).toBe(0);
});

test("hub gold verify: svelte to cwl structural (G1154)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "svelte-literal-cwl"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("runtime-cwl full-stack parity smoke (G1151)", async () => {
  const { runCwlRuntimeParitySmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-runtime-parity-smoke.mjs"),
  );
  const report = await runCwlRuntimeParitySmoke();
  expect(report.ok).toBe(true);
});

batchTest("cwl authoring batch smoke (G1155)", async () => {
  const { runCwlAuthoringBatchSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchSmoke();
  expect(report.ok).toBe(true);
});

test("cwl diagnose on svelte export routes (G1156)", async () => {
  const { runSveltekitCwlExportSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-sveltekit-cwl-export-smoke.mjs"),
  );
  await runSveltekitCwlExportSmoke();
  const { diagnoseCwlFile } = await import(resolve(ROOT, "scripts/hub-ingest/cwl-diagnose.mjs"));
  const report = await diagnoseCwlFile(
    resolve(ROOT, "fixtures/hub-gold-svelte-kit/generated/cwl/routes.cwl"),
  );
  expect(report.ok).toBe(true);
  expect(report.routeCount).toBeGreaterThanOrEqual(3);
});

test("cwl full-stack flagship pilot smoke (G1157)", async () => {
  const { runCwlFullstackFlagshipSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-flagship-smoke.mjs"),
  );
  const report = await runCwlFullstackFlagshipSmoke();
  expect(report.ok).toBe(true);
  expect(report.holeCount).toBe(0);
}, 180_000);

test("sveltekit deep lift smoke (G1158 / G1159 load)", async () => {
  const { runSveltekitDeepSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-sveltekit-deep-smoke.mjs"),
  );
  const report = await runSveltekitDeepSmoke();
  expect(report.ok).toBe(true);
  expect(report.hasPost).toBe(true);
  expect(report.hasLoadHole).toBe(false);
  expect(report.loadRouteLifted).toBe(true);
});

batchTest("authoring batch v2 smoke (G1175)", async () => {
  const { runCwlAuthoringBatchV2Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v2-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV2Smoke();
  expect(report.ok).toBe(true);
}, 120_000);

batchTest("authoring batch v5 smoke (G1204)", async () => {
  const { runCwlAuthoringBatchV5Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v5-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV5Smoke();
  expect(report.ok).toBe(true);
  expect(report.htmlRoundtrip?.ok).toBe(true);
}, 300_000);

batchTest("authoring batch v20 graduation smoke (G1354)", async () => {
  const { runCwlAuthoringBatchV20Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v20-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV20Smoke();
  expect(report.ok).toBe(true);
  expect(report.gate20?.ok).toBe(true);
}, 600_000);

batchTest("authoring batch v21 production search smoke (G1363)", async () => {
  const { runCwlAuthoringBatchV21Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v21-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV21Smoke();
  expect(report.ok).toBe(true);
  expect(report.gate21?.ok).toBe(true);
}, 600_000);

batchTest("authoring batch v30 production graduation smoke (G1453)", async () => {
  const { runCwlAuthoringBatchV30Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v30-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV30Smoke({ graduationOnly: true });
  expect(report.ok).toBe(true);
  expect(report.gate30?.ok).toBe(true);
  expect(report.graduationOnly).toBe(true);
}, 180_000);

batchTest("authoring batch v40 post-30 graduation smoke (G1553)", async () => {
  const { runCwlAuthoringBatchV40Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v40-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV40Smoke({ skipPriorChain: true });
  expect(report.ok).toBe(true);
  expect(report.gate40?.ok).toBe(true);
  expect(report.gate40Mode).toBe("post30-composite");
}, 120_000);

batchTest("authoring batch v50 post-40 graduation smoke (G1653)", async () => {
  const { runCwlAuthoringBatchV50Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v50-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV50Smoke({ skipPriorChain: true });
  expect(report.ok).toBe(true);
  expect(report.gate50?.ok).toBe(true);
  expect(report.gate50Mode).toBe("post40-composite");
}, 120_000);

batchTest("authoring batch v60 verify-gaps graduation smoke (G1753)", async () => {
  const { runCwlAuthoringBatchV60Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v60-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV60Smoke({ skipPriorChain: true });
  expect(report.ok).toBe(true);
  expect(report.gate60?.ok).toBe(true);
  expect(report.gate60Mode).toBe("post50-composite");
}, 180_000);

batchTest("authoring batch v61 templates gate smoke (G1763)", async () => {
  const { runCwlAuthoringBatchV61Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v61-smoke.mjs"),
  );
  const { runCwlAuthoringTemplatesGate } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs"),
  );
  const gate = await runCwlAuthoringTemplatesGate();
  expect(gate.ok).toBe(true);
  expect(gate.shellOk).toBe(true);
  expect(gate.layoutImportOk).toBe(true);
  const report = await runCwlAuthoringBatchV61Smoke({ skipPriorChain: true });
  expect(report.ok).toBe(true);
  expect(report.gate61?.ok).toBe(true);
  expect(report.gate61Mode).toBe("post60-composite");
}, 180_000);

batchTest("authoring batch v62 preview dev loop smoke (G1773)", async () => {
  const { runCwlAuthoringBatchV62Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v62-smoke.mjs"),
  );
  const { runCwlPreviewDevLoopGate } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs"),
  );
  const gate = await runCwlPreviewDevLoopGate();
  expect(gate.ok).toBe(true);
  expect(gate.probeOk).toBe(true);
  expect(gate.previewJsonOk).toBe(true);
  expect(gate.diagnoseOk).toBe(true);
  const report = await runCwlAuthoringBatchV62Smoke({ skipPriorChain: true });
  expect(report.ok).toBe(true);
  expect(report.gate62?.ok).toBe(true);
  expect(report.gate62Mode).toBe("post61-composite");
}, 180_000);

batchTest("authoring batch v63 runtime-cwl parity smoke (G1783)", async () => {
  const { runCwlAuthoringBatchV63Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v63-smoke.mjs"),
  );
  const { runRuntimeCwlParityGate } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs"),
  );
  const gate = await runRuntimeCwlParityGate();
  expect(gate.ok).toBe(true);
  expect(gate.goldParityOk).toBe(true);
  expect(gate.honoParityOk).toBe(true);
  expect(gate.productionOk).toBe(true);
  const report = await runCwlAuthoringBatchV63Smoke({ skipPriorChain: true });
  expect(report.ok).toBe(true);
  expect(report.gate63?.ok).toBe(true);
  expect(report.gate63Mode).toBe("post62-composite");
}, 180_000);

test("cwl fullstack HTTP verify smoke (G1660)", async () => {
  const { runCwlFullstackVerifyHttpSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-verify-http-smoke.mjs"),
  );
  const report = await runCwlFullstackVerifyHttpSmoke();
  expect(report.ok).toBe(true);
  expect(report.hono?.ok).toBe(true);
  expect(report.fastify?.ok).toBe(true);
}, 180_000);

test("cwl html roundtrip smoke (G1202)", async () => {
  const { runCwlHtmlRoundtripSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-html-roundtrip-smoke.mjs"),
  );
  const report = await runCwlHtmlRoundtripSmoke();
  expect(report.ok).toBe(true);
});

batchTest("authoring batch v4 smoke (G1196)", async () => {
  const { runCwlAuthoringBatchV4Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v4-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV4Smoke();
  expect(report.ok).toBe(true);
  expect(report.htmlInterpolation?.ok).toBe(true);
}, 240_000);

test("cwl html interpolation smoke (G1189)", async () => {
  const { runCwlHtmlInterpolationSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-html-interpolation-smoke.mjs"),
  );
  const report = await runCwlHtmlInterpolationSmoke();
  expect(report.ok).toBe(true);
});

batchTest("authoring batch v3 smoke (G1186)", async () => {
  const { runCwlAuthoringBatchV3Smoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-authoring-batch-v3-smoke.mjs"),
  );
  const report = await runCwlAuthoringBatchV3Smoke();
  expect(report.ok).toBe(true);
  expect(report.svelteDeep?.shopLifted).toBe(true);
}, 180_000);

test("cwl parser: page load statement (RFC-0013 / G1159)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const src = `@page GET "/blog/:slug"
page blog_show {
  effects: none;
  param slug;
  load { slug: slug, source: "page-server" };
  return html "<h1>Blog</h1>";
}
`;
  const mod = parseCwlModule(src, "routes.cwl");
  const route = mod.routes[0];
  expect(route.loadBody?.kind).toBe("object");
  expect(route.body.kind).toBe("html");
});

test("nextjs app origin smoke (G1167)", async () => {
  const { runNextjsAppSmoke } = await import(resolve(ROOT, "scripts/hub-ingest/hub-nextjs-app-smoke.mjs"));
  const report = await runNextjsAppSmoke();
  expect(report.ok).toBe(true);
});

test("cwl runtime production gates (G1168)", async () => {
  const { runCwlRuntimeProductionSmoke } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-cwl-runtime-production-smoke.mjs"),
  );
  const report = await runCwlRuntimeProductionSmoke();
  expect(report.ok).toBe(true);
}, 60_000);

test("cwl parser: full-stack page surface (RFC-0010 / G1143)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-fullstack/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  expect(mod.routes.length).toBe(2);
  const home = mod.routes.find((r) => r.path === "/");
  expect(home?.surfaceKind).toBe("page");
  expect(home?.body.kind).toBe("html");
  expect(home?.responseContentType).toBe("text/html; charset=utf-8");
  const health = mod.routes.find((r) => r.path === "/api/health");
  expect(health?.surfaceKind).toBe("api");
});

test("cwl parser: routes and literals", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(resolve(FIXTURE, "routes.cwl"), "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  expect(mod.routes.length).toBe(3);
  const meta = mod.routes.find((r) => r.path === "/meta");
  expect(meta?.body.kind).toBe("object");
  expect(meta?.body.entries?.length).toBeGreaterThan(0);
});

test("cwl parser: path params and param return (RFC-0002 / G79)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-path-params/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  expect(mod.routes.length).toBe(2);
  const item = mod.routes.find((r) => r.path === "/items/:id");
  expect(item?.pathParams).toEqual(["id"]);
  expect(item?.handlerPathParams).toEqual(["id"]);
  const nested = mod.routes.find((r) => r.path.includes(":itemId"));
  expect(nested?.pathParams).toEqual(["userId", "itemId"]);
});

test("cwl parser: query params (RFC-0003 / G80)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-query-params/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  const search = mod.routes.find((r) => r.path === "/search");
  expect(search?.handlerQueryParams).toEqual(["q"]);
});

test("cwl parser: body bindings (RFC-0005 / G99)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-request-body/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  const create = mod.routes.find((r) => r.path === "/items");
  expect(create?.handlerBodyParams).toEqual(["title", "qty"]);
  expect(mod.moduleUses).toContain("express.json");
});

test("cwl parser: response content-type (RFC-0008 / G117)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-response-content-type/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  const json = mod.routes.find((r) => r.path === "/json");
  expect(json?.responseContentType).toBe("application/json");
  const plain = mod.routes.find((r) => r.path === "/plain");
  expect(plain?.responseContentType).toBe("text/plain; charset=utf-8");
  const create = mod.routes.find((r) => r.path === "/items");
  expect(create?.responseContentType).toBe("application/json");
  expect(create?.responseStatus).toBe(201);
});

test("cwl parser: response status (RFC-0006 / G100)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-response-status/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  const create = mod.routes.find((r) => r.path === "/items");
  expect(create?.responseStatus).toBe(201);
});

test("cwl parser: header and cookie bindings (RFC-0004 / G84)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-request-context/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  const auth = mod.routes.find((r) => r.path === "/auth");
  expect(auth?.handlerHeaders).toEqual(["Authorization"]);
  expect(auth?.handlerCookies).toEqual(["session_id"]);
});

test("cwl parser: auth use and effects (RFC-0007 / G106)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const FIX = resolve(ROOT, "fixtures/hub-gold-cwl-auth-effects/routes.cwl");
  const src = await readFile(FIX, "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  expect(mod.moduleAuthUses).toEqual(["chrysalis.auth.session"]);
  const me = mod.routes.find((r) => r.path === "/me");
  expect(me?.effects).toContain("session.read");
});

test("cwl parser: module use json/urlencoded (RFC-0001 / G74)", async () => {
  const { parseCwlModule } = await import(PARSER);
  const src = `module api;
use json;
use urlencoded;
@route GET "/ok"
handler ok {
  effects: none;
  return true;
}
`;
  const mod = parseCwlModule(src, "api.cwl");
  expect(mod.moduleUses).toEqual(["express.json", "express.urlencoded"]);
});

test("cwl parser: multi-file import graph (RFC-0009 / G155)", async () => {
  const { resolveCwlModuleFromPath } = await import(
    resolve(ROOT, "scripts/hub-ingest/cwl-module-graph.mjs")
  );
  const entry = resolve(ROOT, "fixtures/hub-gold-cwl-multi/routes.cwl");
  const mod = resolveCwlModuleFromPath(entry);
  expect(mod.routes.length).toBe(3);
  expect(mod.routes.find((r) => r.path === "/health")?.body.kind).toBe("literal");
});

test("lift-to-webir cwl is hole-free on gold fixture", () => {
  const r = spawnSync(process.execPath, [LIFT, FIXTURE, "--language", "cwl"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.holeCount).toBe(0);
  expect(report.astRouteCount).toBe(3);
});

test("hub gold verify includes cwl suite", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-hono"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("hub store: cwl to hono is gold", async () => {
  const hub = await import(fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url)));
  const route = hub.resolveHubRoute("cwl", "hono");
  expect(route.grade).toBe("gold");
});

test("hub gold verify: cwl round-trip structural (G34)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-roundtrip"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
  const text = r.stdout.trim();
  const report = JSON.parse(text.slice(text.indexOf("{")));
  expect(report.ok).toBe(true);
  expect(report.results?.[0]?.roundTrip?.routeCount).toBe(3);
}, 130_000);

test("hub store: javascript to cwl is gold (G34)", async () => {
  const hub = await import(fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url)));
  expect(hub.resolveHubRoute("javascript", "cwl").grade).toBe("gold");
  expect(hub.resolveHubRoute("typescript", "cwl").grade).toBe("gold");
  expect(hub.resolveHubRoute("python", "cwl").grade).toBe("gold");
});

test("hub gold verify: python literal to cwl (G34 batch)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "python-literal-cwl"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("hub gold verify: js middleware fixture hole-free (G34 batch)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "js-middleware-hono"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("hub gold verify: python structured to cwl and fastify (G36)", () => {
  for (const suite of ["python-structured-cwl", "python-structured-fastify"]) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status).toBe(0);
  }
}, 180_000);

test("hub gold verify: js structured to cwl (G36)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "js-structured-cwl"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("hub gold verify: middleware fastify and cwl fastify (G37)", () => {
  for (const suite of ["js-middleware-fastify", "cwl-gold-fastify"]) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status).toBe(0);
  }
}, 180_000);

test("hub gold verify: middleware and structured cwl (G38/G51/G53)", () => {
  for (const suite of [
    "ts-structured-hono",
    "ts-structured-cwl",
    "js-middleware-cwl",
    "python-middleware-cwl",
    "java-literal-cwl",
    "go-literal-cwl",
    "csharp-literal-cwl",
    "ruby-literal-cwl",
    "kotlin-literal-cwl",
    "scala-literal-cwl",
    "swift-literal-cwl",
    "rust-literal-cwl",
  ]) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status).toBe(0);
  }
}, 200_000);

test("hub gold verify: cwl path params hono and fastify (G79)", () => {
  for (const suite of ["cwl-path-params-hono", "cwl-path-params-fastify"]) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status).toBe(0);
  }
}, 180_000);

test("hub gold verify: cwl query params hono (G80)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "cwl-query-params-hono"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("hub gold verify: cwl request context hono (G84)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "cwl-request-context-hono"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);
