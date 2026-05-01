import { describe, expect, it } from "vitest";
import { buildChrysalisRoutePathsModuleSource, normalizeEmitRoutePath } from "../src/chrysalis-route-paths.js";

describe("chrysalis route paths module", () => {
  it("normalizes :param segments", () => {
    expect(normalizeEmitRoutePath("/u/:id")).toBe("/u/:id");
  });

  it("emits ChrysalisRoutePaths object", () => {
    const src = buildChrysalisRoutePathsModuleSource([
      { handlerName: "get_x", path: "/x" },
      { handlerName: "post_y", path: "/y/:id" },
    ]);
    expect(src).toContain("export const ChrysalisRoutePaths");
    expect(src).toContain('"get_x"');
    expect(src).toContain('"/x"');
    expect(src).toContain('"post_y"');
  });
});
