import { describe, expect, test } from "vitest";
import {
  applyNoSourceMarkupHolesToCwlSource,
  buildNoSourceFormShellHtml,
  buildNoSourceMarkupHoleHtml,
  MARKUP_NO_SOURCE_HOLE_REASON,
} from "../src/apply-no-source-markup-holes.js";

describe("applyNoSourceMarkupHolesToCwlSource (G9480 / G9790)", () => {
  test("buildNoSourceMarkupHoleHtml declares the hole reason", () => {
    const html = buildNoSourceMarkupHoleHtml("/modules/hardware/add");
    expect(html).toContain(`data-cwl-hole="${MARKUP_NO_SOURCE_HOLE_REASON}"`);
    expect(html).toContain('data-cwl-route="/modules/hardware/add"');
    expect(html).toContain("missing +page.svelte");
  });

  test("buildNoSourceFormShellHtml is empty chrome without invented fields", () => {
    const html = buildNoSourceFormShellHtml("/modules/hardware/add");
    expect(html).toContain('data-cwl-form-shell="no-source-add"');
    expect(html).toContain('data-cwl-route="/modules/hardware/add"');
    expect(html).toContain("data-cwl-form-shell-empty");
    expect(html).toContain("<form");
    expect(html).not.toContain("data-cwl-hole=");
    expect(html).not.toContain("<input");
  });

  test("rewrites synthetic demo shells to explicit holes", () => {
    const source = `@page GET "/modules/hardware/add"
page hardware_add {
  effects: none;
  load { source: "wisp-m32-add", path: "/modules/hardware/add" };
  return html "<div class=\\"wisp-module-demo\\">fake form</div>";
}
`;
    const result = applyNoSourceMarkupHolesToCwlSource({ cwlSource: source });
    expect(result.routesRewritten).toBe(1);
    expect(result.text).toContain(MARKUP_NO_SOURCE_HOLE_REASON);
    expect(result.text).toContain('source: "markup-no-source"');
    expect(result.text).not.toContain("wisp-module-demo");
  });

  test("upgrades no-source holes to form shells (G9790)", () => {
    const source = `@page GET "/modules/hardware/add"
page hardware_add {
  effects: none;
  load { source: "markup-no-source", path: "/modules/hardware/add" };
  return html "<div class=\\"cwl-markup-hole\\" data-cwl-hole=\\"legacy:markup-no-source-route\\" data-cwl-hole-detail=\\"missing +page.svelte for /modules/hardware/add\\" data-cwl-route=\\"/modules/hardware/add\\"></div>";
}
`;
    const result = applyNoSourceMarkupHolesToCwlSource({
      cwlSource: source,
      formShell: true,
    });
    expect(result.routesRewritten).toBe(1);
    expect(result.text).toContain("data-cwl-form-shell");
    expect(result.text).toContain("no-source-add");
    expect(result.text).toContain('source: "markup-form-shell"');
    expect(result.text).not.toContain(MARKUP_NO_SOURCE_HOLE_REASON);
  });

  test("skips paths with known source markup", () => {
    const source = `@page GET "/modules/inventory/add"
page inv_add {
  effects: none;
  load { source: "wisp-m32-add" };
  return html "<div class=\\"wisp-module-demo\\">x</div>";
}
`;
    const result = applyNoSourceMarkupHolesToCwlSource({
      cwlSource: source,
      knownSourcePaths: new Set(["/modules/inventory/add"]),
    });
    expect(result.routesRewritten).toBe(0);
    expect(result.text).toContain("wisp-module-demo");
  });

  test("normalizes stale hole HTML to mid-token-safe attrs", () => {
    const source = `@page GET "/modules/hardware/add"
page hardware_add {
  effects: none;
  load { source: "markup-no-source", path: "/modules/hardware/add" };
  return html "<div class=\\"cwl-markup-hole\\" data-cwl-hole=\\"legacy:markup-no-source-route\\" data-cwl-hole-detail=\\"no source page for /modules/hardware/add\\" data-cwl-path=\\"/modules/hardware/add\\"></div>";
}
`;
    const result = applyNoSourceMarkupHolesToCwlSource({ cwlSource: source });
    expect(result.routesRewritten).toBe(1);
    expect(result.text).toContain("data-cwl-route");
    expect(result.text).toContain("/modules/hardware/add");
    expect(result.text).toContain("missing +page.svelte");
    expect(result.text).not.toContain("data-cwl-path=");
    expect(result.text).not.toContain("no source page for");
  });
});
