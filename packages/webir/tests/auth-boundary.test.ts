import { describe, expect, test } from "vitest";
import { authTaggedHoleReason, isAuthBoundaryCallee } from "../src/auth-boundary.js";

describe("auth-boundary helpers (6A)", () => {
  test("isAuthBoundaryCallee recognizes Gate facade and auth helper", () => {
    expect(isAuthBoundaryCallee("auth")).toBe(true);
    expect(isAuthBoundaryCallee("\\Illuminate\\Support\\Facades\\Gate::allows")).toBe(true);
    expect(isAuthBoundaryCallee("csrf_token")).toBe(true);
    expect(isAuthBoundaryCallee("query_one")).toBe(false);
  });

  test("authTaggedHoleReason prefixes when a token matches", () => {
    expect(authTaggedHoleReason("parse_url:component")).toBe("parse_url:component");
    expect(authTaggedHoleReason("auth:already")).toBe("auth:already");
    expect(
      authTaggedHoleReason("cannot lower Illuminate\\Support\\Facades\\Gate::allows"),
    ).toBe("auth:cannot lower Illuminate\\Support\\Facades\\Gate::allows");
  });
});
