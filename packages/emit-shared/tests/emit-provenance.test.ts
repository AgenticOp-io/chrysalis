import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { formatEmitProvenanceDisplay } from "../src/emit-provenance.js";

describe("formatEmitProvenanceDisplay", () => {
  test("returns relative posix path when under provenanceRoot", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-prov-"));
    try {
      const root = join(base, "proj");
      mkdirSync(join(root, "pages"), { recursive: true });
      const file = join(root, "pages", "login.php");
      writeFileSync(file, "", "utf8");
      expect(formatEmitProvenanceDisplay(root, file)).toBe("pages/login.php");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("falls back when file is outside provenanceRoot", () => {
    const root = mkdtempSync(join(tmpdir(), "prov-root-"));
    const other = mkdtempSync(join(tmpdir(), "prov-out-"));
    try {
      const file = join(other, "out.php");
      writeFileSync(file, "", "utf8");
      const disp = formatEmitProvenanceDisplay(root, file);
      expect(disp.replace(/\\/g, "/")).toMatch(/out\.php$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(other, { recursive: true, force: true });
    }
  });

  test("unknown stays unknown", () => {
    expect(formatEmitProvenanceDisplay(join(tmpdir(), "r"), "unknown")).toBe("unknown");
  });
});
