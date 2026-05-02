import { describe, expect, it } from "vitest";
import {
  EMIT_HANDLER_FINGERPRINTS_KIND,
  buildEmitHandlerFingerprintsJson,
  sha256Utf8Hex,
} from "../src/emit-handler-fingerprints.js";

describe("emit handler fingerprints", () => {
  it("sha256Utf8Hex is stable", () => {
    expect(sha256Utf8Hex("a")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buildEmitHandlerFingerprintsJson sorts handler keys", () => {
    const text = buildEmitHandlerFingerprintsJson({
      handlers: [
        { name: "z", sourceSha256: "bb" },
        { name: "a", sourceSha256: "aa" },
      ],
      sourceApp: "app",
    });
    const j = JSON.parse(text) as {
      kind: string;
      schemaVersion: number;
      sourceApp: string;
      handlers: Record<string, string>;
    };
    expect(j.kind).toBe(EMIT_HANDLER_FINGERPRINTS_KIND);
    expect(j.schemaVersion).toBe(1);
    expect(j.sourceApp).toBe("app");
    expect(Object.keys(j.handlers)).toEqual(["a", "z"]);
  });
});
