import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { liftUiMarkup, nextAppMarkupAdapter } from "@chrysalis/ingest";
import { verifyUiRouteMarkupParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-markup-next");

describe("liftUiMarkup (next-app fixture)", () => {
  const result = liftUiMarkup({
    buildRoot: FIXTURE,
    adapter: nextAppMarkupAdapter,
    mode: "structural-shell",
  });

  test("lifts per-route next app page bundles", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("next-app");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual([
      "/dashboard",
      "/login",
      "/portal/login",
    ]);
  });

  test("preserves per-route isolation and overlay shells", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.html).toContain("login-card");
    expect(login?.html).toContain('data-cwl-shell-key="showUpgradeModal"');
    expect(login?.html).not.toContain("portal-shell");
    expect(portal?.html).toContain("Next Portal Sign in");
  });

  test("passes markup parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(verifyUiRouteMarkupParity(result.map, result.bundles).ok).toBe(true);
  });
});
