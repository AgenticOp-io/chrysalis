import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCwlRuntime, loadModuleFromCwlFile } from "../src/index.js";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD_CWL = resolve(ROOT, "fixtures/hub-gold-cwl/routes.cwl");

describe("@chrysalis/runtime-cwl", () => {
  it("serves CWL gold routes via fetch", () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({ module });
    expect(runtime.routes.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /health returns literal true", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/health" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("true");
  });

  it("GET /meta returns JSON object", async () => {
    const module = loadModuleFromCwlFile(GOLD_CWL, ROOT);
    const runtime = createCwlRuntime({ module });
    const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/meta" });
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.ok).toBe(true);
    expect(body.version).toBe(1);
  });
});
