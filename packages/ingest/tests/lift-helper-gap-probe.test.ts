import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ModuleBuilder,
  T,
  countHoles,
  dataDialect,
  dedupeStructuralSubgraphsInModule,
  effectTagsSorted,
  phpLocator,
  webRequest,
} from "@chrysalis/webir";
import { buildCallEffectMap, ingestDirectory } from "../src/index.js";

const GAP_FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-gap-probe");
const DEDUPE_CONTROL = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/lift-helper-dedupe-control",
);
const TINY_BLOG = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/tiny-blog");

describe("ingest: lift-helper-gap-probe (IR helper lifting B1)", () => {
  it("ingests two routes with no holes", async () => {
    const mod = await ingestDirectory(GAP_FIXTURE);
    expect(mod.roots.length).toBe(2);
    expect(countHoles(mod)).toBe(0);
  });

  it("lib helpers alpha and beta share effect signatures but D283 dedupe does not shrink the module", async () => {
    const effects = await buildCallEffectMap(GAP_FIXTURE, undefined);
    const alphaFx = effectTagsSorted(effects.get("chrysalis_scale_alpha") ?? []);
    const betaFx = effectTagsSorted(effects.get("chrysalis_scale_beta") ?? []);
    expect(alphaFx).toEqual(betaFx);

    const baseline = await ingestDirectory(GAP_FIXTURE);
    const deduped = await ingestDirectory(GAP_FIXTURE, { dedupeStructuralSubgraphs: true });
    const dedupedIgnoreOrigin = await ingestDirectory(GAP_FIXTURE, {
      dedupeStructuralSubgraphs: true,
      dedupeStructuralSubgraphsIgnoreOrigin: true,
    });

    expect(deduped.roots.length).toBe(baseline.roots.length);
    expect(countHoles(deduped)).toBe(0);
    expect(deduped.nodes.size).toBe(baseline.nodes.size);
    expect(dedupedIgnoreOrigin.nodes.size).toBe(baseline.nodes.size);
  });

  it("control: D283 shrinks a fixture with duplicated structural IR (tiny-blog)", async () => {
    const baseline = await ingestDirectory(TINY_BLOG);
    const deduped = await ingestDirectory(TINY_BLOG, { dedupeStructuralSubgraphs: true });
    expect(deduped.nodes.size).toBeLessThan(baseline.nodes.size);
  });
});

describe("ingest: lift-helper-dedupe-control (IR helper lifting B1 control)", () => {
  it("ingests the smoke route with no holes", async () => {
    const mod = await ingestDirectory(DEDUPE_CONTROL);
    expect(mod.roots.length).toBe(1);
    expect(countHoles(mod)).toBe(0);
  });

  it("PHP ingest does not dedupe identical bodies across distinct route paths", async () => {
    const routes = [0, 1].map((i) => ({
      method: "GET" as const,
      path: `/r${i}`,
      file: `pages/r${i}.php`,
      pathParams: [] as [],
    }));
    const tmp = mkdtempSync(join(tmpdir(), "lift-dedupe-control-"));
    try {
      mkdirSync(join(tmp, "pages"), { recursive: true });
      const body = "<?php\nheader('Content-Type: text/plain');\necho 'ok';\n";
      for (const r of routes) {
        writeFileSync(join(tmp, r.file), body, "utf8");
      }
      writeFileSync(
        join(tmp, "chrysalis.routes.json"),
        JSON.stringify({ app: "lift-helper-dedupe-control-temp", routes }, null, 2),
        "utf8",
      );
      const baseline = await ingestDirectory(tmp);
      const deduped = await ingestDirectory(tmp, {
        dedupeStructuralSubgraphs: true,
        dedupeStructuralSubgraphsIgnoreOrigin: true,
      });
      expect(baseline.roots.length).toBe(2);
      expect(deduped.nodes.size).toBe(baseline.nodes.size);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("WebIR control: dedupeStructuralSubgraphsInModule shrinks duplicate handler tails", () => {
    const b = new ModuleBuilder({ sourceApp: "lift-helper-dedupe-control", chrysalisVersion: "1.0.0" });
    const w = webRequest.builders(b);
    const d = dataDialect.builders(b);
    const o = phpLocator("pages/shared.php", 2, 0);
    const mkRoute = (path: string, name: string) => {
      const lit = d.literal({ value: 42, type: T.int, origin: o });
      const resp = w.response({
        attrs: { status: 200, kind: "html" },
        value: lit,
        origin: o,
      });
      const h = w.handler({
        attrs: { name, input: T.record({}), output: T.void },
        body: resp,
        effects: [],
        origin: o,
      });
      const route = w.route({
        attrs: { method: "GET", path, pathParams: [] },
        handler: h,
        origin: o,
      });
      b.addRoot(route);
    };
    mkRoute("/a", "ha");
    mkRoute("/b", "hb");
    const before = b.finish();
    const after = dedupeStructuralSubgraphsInModule(before);
    expect(after.roots.length).toBe(2);
    expect(after.nodes.size).toBeLessThan(before.nodes.size);
  });
});
