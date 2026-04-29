import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_REDACTION, loadObserveConfig } from "../src/index.js";

describe("loadObserveConfig", () => {
  it("falls back to DEFAULT_REDACTION when no chrysalis.observe.json is present", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    const cfg = loadObserveConfig(dir);
    expect(cfg.rules.length).toBe(DEFAULT_REDACTION.rules.length);
  });

  it("treats empty observe file rules as full defaults after merge", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(join(dir, "chrysalis.observe.json"), JSON.stringify({ redaction: { rules: [] } }));
    const cfg = loadObserveConfig(dir);
    expect(cfg.rules.length).toBe(DEFAULT_REDACTION.rules.length);
  });

  it("treats observe file without redaction key as full defaults after merge", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(join(dir, "chrysalis.observe.json"), JSON.stringify({}));
    const cfg = loadObserveConfig(dir);
    expect(cfg.rules.length).toBe(DEFAULT_REDACTION.rules.length);
  });

  it("merges a well-formed chrysalis.observe.json onto defaults", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(
      join(dir, "chrysalis.observe.json"),
      JSON.stringify({
        redaction: {
          rules: [
            { path: "request.post.password", kind: "mask" },
            { path: "request.headers.cookie", kind: "hash" },
          ],
        },
      }),
    );
    const cfg = loadObserveConfig(dir);
    expect(cfg.rules.length).toBe(DEFAULT_REDACTION.rules.length);
    const cookie = cfg.rules.find((r) => r.path === "request.headers.cookie");
    const password = cfg.rules.find((r) => r.path === "request.post.password");
    expect(cookie?.kind).toBe("hash");
    expect(password?.kind).toBe("mask");
    expect(cfg.rules.some((r) => r.path === "sql.row.password")).toBe(true);
  });

  it("lets file rules override kinds and append novel paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(
      join(dir, "chrysalis.observe.json"),
      JSON.stringify({
        redaction: {
          rules: [
            { path: "request.headers.cookie", kind: "mask" },
            { path: "request.headers.x-chrysalis-test", kind: "hash" },
          ],
        },
      }),
    );
    const cfg = loadObserveConfig(dir);
    expect(cfg.rules.find((r) => r.path === "request.headers.cookie")?.kind).toBe("mask");
    expect(cfg.rules.find((r) => r.path === "request.headers.x-chrysalis-test")?.kind).toBe("hash");
    expect(cfg.rules.length).toBe(DEFAULT_REDACTION.rules.length + 1);
  });

  it("ignores rules with unknown kinds rather than throwing", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(
      join(dir, "chrysalis.observe.json"),
      JSON.stringify({
        redaction: {
          rules: [
            { path: "a", kind: "nuke" },
            { path: "b", kind: "mask" },
          ],
        },
      }),
    );
    const cfg = loadObserveConfig(dir);
    expect(cfg.rules.length).toBe(DEFAULT_REDACTION.rules.length + 1);
    expect(cfg.rules.find((r) => r.path === "b")?.kind).toBe("mask");
    expect(cfg.rules.some((r) => r.path === "a")).toBe(false);
  });

  it("throws on invalid JSON with config path in the message", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(join(dir, "chrysalis.observe.json"), "{ not json");
    expect(() => loadObserveConfig(dir)).toThrow(/Failed to parse chrysalis\.observe\.json/);
  });

  it("throws when redaction.rules is not an array", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(
      join(dir, "chrysalis.observe.json"),
      JSON.stringify({ redaction: { rules: { path: "x" } } }),
    );
    expect(() => loadObserveConfig(dir)).toThrow(/redaction\.rules must be an array/);
  });

  it("throws when a supported-kind rule has a non-empty path requirement violated", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-observe-cfg-"));
    writeFileSync(
      join(dir, "chrysalis.observe.json"),
      JSON.stringify({ redaction: { rules: [{ path: "", kind: "mask" }] } }),
    );
    expect(() => loadObserveConfig(dir)).toThrow(/rules\[0\]/);
  });
});
