import { describe, expect, test } from "vitest";
import {
  SOURCE_AUTHORITY_CONVERT_STEPS,
  evaluateSourceAuthorityStyles,
  findOverlayRedefinedOriginClasses,
} from "@chrysalis/ingest";

describe("ui-source-authority (D6443)", () => {
  test("exposes the true convert step sequence", () => {
    expect(SOURCE_AUTHORITY_CONVERT_STEPS[0]).toBe("read-all-source-files");
    expect(SOURCE_AUTHORITY_CONVERT_STEPS).toContain("forbid-overlay-redefine-of-origin-selectors");
  });

  test("flags overlay CSS that redefines origin class names", () => {
    const original = `.floating-controls{z-index:100}.control-btn{width:50px}`;
    const overlay = `.floating-controls{display:none}.wisp-only{color:red}`;
    expect(findOverlayRedefinedOriginClasses(original, overlay)).toEqual(["floating-controls"]);
    const report = evaluateSourceAuthorityStyles({ originalCss: original, overlayCss: overlay });
    expect(report.ok).toBe(false);
  });

  test("allows CWL-only island selectors absent from origin", () => {
    const original = `.fullscreen-map{position:fixed}.floating-controls{z-index:100}`;
    const overlay = `.map-honesty{color:#f0c674}.map-loading{display:block}`;
    const report = evaluateSourceAuthorityStyles({ originalCss: original, overlayCss: overlay });
    expect(report.ok).toBe(true);
  });
});
