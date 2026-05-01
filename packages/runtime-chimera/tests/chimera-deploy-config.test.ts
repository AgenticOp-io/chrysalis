import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CHIMERA_DEPLOY_CONFIG_KIND,
  CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION,
  parseChimeraDeployConfigJson,
} from "../src/chimera-deploy-config.js";

describe("parseChimeraDeployConfigJson", () => {
  it("accepts versioned v1 document", () => {
    const r = parseChimeraDeployConfigJson(
      JSON.stringify({
        kind: CHIMERA_DEPLOY_CONFIG_KIND,
        schemaVersion: CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION,
        mode: "shadow",
        legacy: "http://127.0.0.1:1",
        modern: "http://127.0.0.1:2",
        rules: [{ match: "GET /health", target: "modern" }],
      }),
      "inline",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe(CHIMERA_DEPLOY_CONFIG_KIND);
    expect(r.value.schemaVersion).toBe(1);
    expect(r.value.mode).toBe("shadow");
    expect(r.value.rules).toHaveLength(1);
  });

  it("accepts legacy file without kind", () => {
    const r = parseChimeraDeployConfigJson(
      JSON.stringify({
        mode: "legacy",
        legacy: "http://a",
        modern: "http://b",
      }),
      "legacy.json",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBeUndefined();
    expect(r.value.schemaVersion).toBeUndefined();
  });

  it("rejects unknown kind", () => {
    const r = parseChimeraDeployConfigJson(
      JSON.stringify({ kind: "other.config", schemaVersion: 1 }),
      "x.json",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("unknown kind");
  });

  it("rejects wrong schemaVersion when kind is set", () => {
    const r = parseChimeraDeployConfigJson(
      JSON.stringify({
        kind: CHIMERA_DEPLOY_CONFIG_KIND,
        schemaVersion: 99,
        legacy: "http://a",
        modern: "http://b",
      }),
      "x.json",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("schemaVersion");
  });

  it("rejects invalid rules entry", () => {
    const r = parseChimeraDeployConfigJson(
      JSON.stringify({
        kind: CHIMERA_DEPLOY_CONFIG_KIND,
        schemaVersion: 1,
        legacy: "http://a",
        modern: "http://b",
        rules: [{ match: "", target: "modern" }],
      }),
      "x.json",
    );
    expect(r.ok).toBe(false);
  });

  it("strips UTF-8 BOM", () => {
    const body = `{"kind":"${CHIMERA_DEPLOY_CONFIG_KIND}","schemaVersion":1,"legacy":"http://a","modern":"http://b"}`;
    const bom = "\uFEFF";
    const r = parseChimeraDeployConfigJson(bom + body, "bom.json");
    expect(r.ok).toBe(true);
  });

  it("parses committed fixture", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const p = resolve(here, "../../../fixtures/chimera-deploy-config-v1-smoke.json");
    const r = parseChimeraDeployConfigJson(readFileSync(p, "utf8"), p);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.rules?.length).toBe(2);
    expect(r.value.toolVersion).toBe("fixture");
  });
});
