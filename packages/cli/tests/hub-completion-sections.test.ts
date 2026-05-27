import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const SECTIONS = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-completion-sections.mjs", import.meta.url),
);

describe("hub completion sections (G71)", () => {
  test("lists extended asset and php oracle lane metadata", async () => {
    const m = await import(SECTIONS);
    const s = m.buildHubCompletionSections();
    expect(s.assetExtendedNextjsGold.suiteIds).toContain("css-literal-nextjs");
    expect(s.assetExtendedFrameworkGold.suiteIds).toContain("cpp-literal-fastify");
    expect(s.phpOracleLane.pairs).toContain("php:hono");
    expect(s.structuralSuiteCount).toBe(108);
  });
});
