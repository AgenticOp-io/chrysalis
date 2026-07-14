import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { buildAngularDiGraph, HOLE_ANGULAR_DI_EDGE, HOLE_ANGULAR_DI_SERVICE } from "@chrysalis/ingest";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-markup-angular");

describe("buildAngularDiGraph", () => {
  test("walks LoginComponent → AuthService → SessionStore", () => {
    const graph = buildAngularDiGraph({
      entryFile: join(FIXTURE, "src/app/login/login.component.ts"),
    });
    expect(graph.entryClass).toBe("LoginComponent");
    expect(graph.nodes).toEqual(
      expect.arrayContaining(["LoginComponent", "AuthService", "SessionStore"]),
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { from: "LoginComponent", to: "AuthService", kind: "inject" },
        { from: "AuthService", to: "SessionStore", kind: "inject" },
      ]),
    );
    expect(graph.holes.some((h) => h.reason === HOLE_ANGULAR_DI_EDGE)).toBe(true);
    expect(graph.holes.some((h) => h.reason === HOLE_ANGULAR_DI_SERVICE)).toBe(true);
  });
});
