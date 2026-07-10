import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  SITE_SCALE_MATRIX_KIND,
  verifySiteScaleMatrix,
} from "../src/site-scale-matrix.js";

const fixtureRoot = join(import.meta.dirname, "../../../fixtures/site-scale-matrix");

describe("verifySiteScaleMatrix (G9440)", () => {
  test("passes the composite fixture on all four layers", () => {
    const report = verifySiteScaleMatrix({ projectDir: fixtureRoot });
    expect(report.kind).toBe(SITE_SCALE_MATRIX_KIND);
    expect(report.ok).toBe(true);
    expect(report.layersChecked).toBe(4);
    expect(report.layersFailed).toBe(0);
    expect(report.layersSkipped).toBe(0);
    const byLayer = Object.fromEntries(report.layers.map((l) => [l.layer, l]));
    expect(byLayer["ui-css"]?.ok).toBe(true);
    expect(byLayer["ui-markup"]?.ok).toBe(true);
    expect(byLayer["api-traces"]?.ok).toBe(true);
    expect(byLayer["load-bind"]?.ok).toBe(true);
  });

  test("fails load-bind when page has apiPath but no bind evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-scale-"));
    try {
      cpSync(fixtureRoot, dir, { recursive: true });
      writeFileSync(
        join(dir, "routes.cwl"),
        `# unbound\nmodule m;\n@page GET "/admin/billing"\npage p {\n  load { apiPath: "/api/admin" };\n  return html "<div data-wisp-api=\\"/api/admin\\">x</div>";\n}\n`,
        "utf8",
      );
      const report = verifySiteScaleMatrix({ projectDir: dir });
      expect(report.ok).toBe(false);
      const load = report.layers.find((l) => l.layer === "load-bind");
      expect(load?.ok).toBe(false);
      expect(load?.detail.pagesUnbound).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips missing layers honestly on empty project", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-scale-empty-"));
    try {
      mkdirSync(dir, { recursive: true });
      const report = verifySiteScaleMatrix({ projectDir: dir });
      expect(report.ok).toBe(false);
      expect(report.layersChecked).toBe(0);
      expect(report.layersSkipped).toBe(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips api-traces when corpus has no /api GET successes (backend-only)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-scale-page-traces-"));
    try {
      mkdirSync(join(dir, "traces"), { recursive: true });
      writeFileSync(
        join(dir, "traces", "page.json"),
        JSON.stringify({
          id: "t1",
          events: [
            { type: "http.request", method: "GET", path: "/posts" },
            { type: "http.response", status: 200 },
          ],
        }),
        "utf8",
      );
      const report = verifySiteScaleMatrix({ projectDir: dir });
      const api = report.layers.find((l) => l.layer === "api-traces");
      expect(api?.ok).toBe(true);
      expect(api?.skip).toBe("no-api-gets");
      expect(api?.detail.reason).toBe("traces-present-but-no-api-gets");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails ui-css when map entry file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-scale-css-"));
    try {
      cpSync(fixtureRoot, dir, { recursive: true });
      rmSync(join(dir, ".chrysalis", "ui-assets", "original-css", "login.css"));
      const report = verifySiteScaleMatrix({ projectDir: dir });
      expect(report.ok).toBe(false);
      const css = report.layers.find((l) => l.layer === "ui-css");
      expect(css?.ok).toBe(false);
      expect((css?.detail.missing as string[]).length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
