import { describe, expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { createCwlRuntime, loadModuleFromWebirJsonFile } from "@chrysalis/runtime-cwl";
import { emit } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");

async function renderCwlFromModule(mod: Awaited<ReturnType<typeof ingestDirectory>>) {
  const hubRoutes = resolve(__dirname, "../../../scripts/hub-ingest/hub-webir-routes.mjs");
  const { listCwlRoutes, renderCwlRoutes } = await import(pathToFileURL(hubRoutes).href);
  const routes = listCwlRoutes(mod);
  return renderCwlRoutes(routes, {
    header: "# Chrysalis Web Language — runtime-cwl emit",
    moduleName: "tiny-blog",
  });
}

describe("@chrysalis/emit-runtime-cwl", () => {
  test("emits routes.cwl, webir.json, and bootable server scaffold", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-rt-cwl-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const { text, holeCount } = await renderCwlFromModule(mod);
      const res = await emit({
        module: mod,
        outDir: out,
        cwlSource: text,
        holeCount,
        provenanceRoot: FIXTURE,
      });
      expect(res.routeCount).toBeGreaterThan(0);
      expect(existsSync(resolve(out, "routes.cwl"))).toBe(true);
      expect(existsSync(resolve(out, "src/webir.json"))).toBe(true);
      expect(existsSync(resolve(out, "src/index.ts"))).toBe(true);
      expect(existsSync(resolve(out, "package.json"))).toBe(true);
      const preview = JSON.parse(readFileSync(resolve(out, "cwl-preview.json"), "utf8"));
      expect(preview.runtime).toBe("@chrysalis/runtime-cwl");
      expect(preview.emitTarget).toBe("runtime-cwl");
      const webirMod = loadModuleFromWebirJsonFile(resolve(out, "src/webir.json"));
      const runtime = createCwlRuntime({ module: webirMod });
      expect(runtime.routes.length).toBeGreaterThan(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
