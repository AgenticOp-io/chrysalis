import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { angularMarkupAdapter, liftUiMarkup } from "@chrysalis/ingest";
import { verifyUiRouteMarkupParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-markup-angular");

describe("liftUiMarkup (angular fixture)", () => {
  const result = liftUiMarkup({ buildRoot: FIXTURE, adapter: angularMarkupAdapter });

  test("lifts per-route angular template bundles", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("angular");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/login", "/portal/login"]);
  });

  test("preserves per-route isolation", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.html).toContain("Angular Sign in");
    expect(login?.html).not.toContain("portal-shell");
    expect(portal?.html).toContain("Angular Portal Sign in");
  });

  test("passes markup parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(verifyUiRouteMarkupParity(result.map, result.bundles).ok).toBe(true);
  });
});
