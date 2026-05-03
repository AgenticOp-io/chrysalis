import { describe, expect, it } from "vitest";
import {
  DEFAULT_REDACTION,
  canonicalJSON,
  mergeObserveFileRulesWithDefaults,
  redactionRecords,
} from "../src/redaction.js";

describe("DEFAULT_REDACTION", () => {
  it("lists critical auth and session paths", () => {
    const paths = new Set(DEFAULT_REDACTION.rules.map((r) => r.path));
    expect(paths.has("request.headers.authorization")).toBe(true);
    expect(paths.has("request.post.password")).toBe(true);
    expect(paths.has("request.post._token")).toBe(true);
    expect(paths.has("request.query.access_token")).toBe(true);
    expect(paths.has("response.headers.set-cookie")).toBe(true);
    expect(paths.has("request.cookies.laravel_session")).toBe(true);
    expect(paths.has("sql.row.password")).toBe(true);
    expect(paths.has("sql.row.token")).toBe(true);
    expect(paths.has("sql.params[*:UPDATE users SET password].0")).toBe(true);
  });

  it("uses only drop | hash | mask (defaults; verbatim is observe-override only)", () => {
    for (const r of DEFAULT_REDACTION.rules) {
      expect(["drop", "hash", "mask"]).toContain(r.kind);
    }
  });

  it("keeps stable canonical config for trace header hashing", () => {
    const a = canonicalJSON({ rules: redactionRecords(DEFAULT_REDACTION) });
    const b = canonicalJSON({ rules: redactionRecords(DEFAULT_REDACTION) });
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(100);
  });
});

describe("mergeObserveFileRulesWithDefaults", () => {
  it("uses the last file rule when the same path appears twice", () => {
    const merged = mergeObserveFileRulesWithDefaults([
      { path: "request.headers.cookie", kind: "mask" },
      { path: "request.headers.cookie", kind: "hash" },
    ]);
    expect(merged.find((r) => r.path === "request.headers.cookie")?.kind).toBe("hash");
  });
});
