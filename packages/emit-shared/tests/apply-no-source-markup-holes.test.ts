import { describe, expect, test } from "vitest";
import {
  applyNoSourceMarkupHolesToCwlSource,
  buildNoSourceMarkupHoleHtml,
  MARKUP_NO_SOURCE_HOLE_REASON,
} from "../src/apply-no-source-markup-holes.js";

describe("applyNoSourceMarkupHolesToCwlSource (G9480)", () => {
  test("buildNoSourceMarkupHoleHtml declares the hole reason", () => {
    const html = buildNoSourceMarkupHoleHtml("/modules/hardware/add");
    expect(html).toContain(`data-cwl-hole="${MARKUP_NO_SOURCE_HOLE_REASON}"`);
    expect(html).toContain('data-cwl-route="/modules/hardware/add"');
    expect(html).toContain("missing +page.svelte");
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
    expect(result.text).toContain('data-cwl-route="/modules/hardware/add"');
    expect(result.text).toContain("missing +page.svelte");
    expect(result.text).not.toContain("data-cwl-path=");
    expect(result.text).not.toContain("no source page for");
  });
});
