import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { liftUiMarkup, phpBladeMarkupAdapter } from "@chrysalis/ingest";
import { verifyUiRouteMarkupParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-markup-blade");

describe("liftUiMarkup (php-blade fixture)", () => {
  const result = liftUiMarkup({
    buildRoot: FIXTURE,
    adapter: phpBladeMarkupAdapter,
    mode: "structural-shell",
  });

  test("lifts blade view bundles", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("php-blade");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/login", "/portal/login"]);
  });

  test("stamps overlay shells and records alpine/livewire honesty holes", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    expect(login?.html).toContain('data-cwl-shell-key="showHint"');
    expect(login?.html).toContain('data-cwl-shell-key="showUpgradeModal"');
    expect(login?.holes?.some((h) => h.reason === "legacy:markup-lift-blade-alpine")).toBe(true);
    expect(login?.holes?.some((h) => h.reason === "legacy:markup-lift-blade-livewire")).toBe(true);
  });

  test("passes markup parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(verifyUiRouteMarkupParity(result.map, result.bundles).ok).toBe(true);
  });
});
