import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles, effectTagsSorted } from "@chrysalis/webir";
import { buildCallEffectMap, ingestDirectory } from "../src/index.js";

const GAP_FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-gap-probe");
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
