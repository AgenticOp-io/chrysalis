import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { convertSiteProjectUi, SITE_CONVERT_REPORT_KIND, defaultSiteConvertCwlPaths } from "../src/site-convert.js";

const fixtureRoot = join(import.meta.dirname, "../../../fixtures/ui-markup-svelte");

describe("convertSiteProjectUi (D6366, G9420)", () => {
  test("lifts markup on the svelte fixture with liftOnly", () => {
    const result = convertSiteProjectUi({ projectDir: fixtureRoot, liftOnly: true, writeReport: false });
    expect(result.kind).toBe(SITE_CONVERT_REPORT_KIND);
    expect(result.ok).toBe(true);
    expect(result.uiMarkup.ok).toBe(true);
    if (result.uiMarkup.ok && "bundles" in result.uiMarkup) {
      expect(result.uiMarkup.bundles.length).toBeGreaterThan(0);
    }
  });

  test("defaultSiteConvertCwlPaths returns migration.cwl when present", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-convert-"));
    try {
      const cwl = join(dir, ".chrysalis", "migration.cwl");
      mkdirSync(join(dir, ".chrysalis"), { recursive: true });
      writeFileSync(cwl, `@page GET "/"\n{\n  return html "<p>x</p>";\n}\n`, "utf8");
      const paths = defaultSiteConvertCwlPaths(dir);
      expect(paths).toContain(cwl);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("patches CWL when markup lift succeeds in a temp project copy", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-convert-"));
    try {
      cpSync(fixtureRoot, dir, { recursive: true });
      const cwlPath = join(dir, "routes.cwl");
      writeFileSync(
        cwlPath,
        `@page GET "/login"\n{\n  return html "<div>stub</div>";\n}\n`,
        "utf8",
      );

      const convert = convertSiteProjectUi({
        projectDir: dir,
        cwlPaths: [cwlPath],
        writeReport: true,
      });
      expect(convert.ok).toBe(true);
      expect(convert.reportPath).toBe(join(dir, ".chrysalis", "site-convert.json"));
      expect(existsSync(convert.reportPath!)).toBe(true);
      const report = JSON.parse(readFileSync(convert.reportPath!, "utf8")) as { kind: string; ok: boolean };
      expect(report.kind).toBe(SITE_CONVERT_REPORT_KIND);
      expect(report.ok).toBe(true);
      const patch = convert.cwlPatches[0];
      expect(patch?.path).toBe(cwlPath);
      if (patch && patch.routesPatched > 0) {
        const text = readFileSync(cwlPath, "utf8");
        expect(text).not.toContain("stub");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
