import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadModuleFromCwlFile } from "@chrysalis/runtime-cwl";
import { createCwlWorkerFetchHandler, createCwlWorkerRuntime } from "../src/index.js";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD_CWL = resolve(ROOT, "fixtures/hub-gold-cwl/routes.cwl");

describe("@chrysalis/runtime-cwl-worker", () => {
  it("createCwlWorkerRuntime serves gold routes", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const worker = createCwlWorkerRuntime({ module });
    expect(worker.routeCount).toBeGreaterThanOrEqual(3);
    const res = await worker.fetch({ method: "GET", url: "http://127.0.0.1/health" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("true");
    await worker.stop();
  });

  it("createCwlWorkerFetchHandler returns a fetch delegate", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const fetch = createCwlWorkerFetchHandler({ module });
    const res = await fetch({ method: "GET", url: "http://127.0.0.1/meta" });
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.ok).toBe(true);
  });
});
