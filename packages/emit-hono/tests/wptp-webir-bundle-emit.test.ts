import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emit } from "../src/index.js";
import { moduleFromGoldenSnapshot } from "@chrysalis/webir";

const bundlePath = join(
  import.meta.dirname,
  "../../../fixtures/wptp/minimal-route.webir.bundle.json",
);

const tempDirs: string[] = [];

afterEach(() => {
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("emit from WPTP-exported WebIR bundle", () => {
  it("emits a Hono project with one handler", async () => {
    const raw = JSON.parse(readFileSync(bundlePath, "utf8"));
    const mod = moduleFromGoldenSnapshot(raw.module);
    const outDir = mkdtempSync(join(tmpdir(), "wptp-hono-emit-"));
    tempDirs.push(outDir);
    const result = await emit({ module: mod, outDir });
    expect(result.handlerCount).toBe(1);
    expect(readFileSync(join(outDir, "src/handlers/health.ts"), "utf8")).toContain("ok");
  });
});
