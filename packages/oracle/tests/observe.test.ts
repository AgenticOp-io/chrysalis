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

  it("parses a well-formed chrysalis.observe.json", () => {
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
    expect(cfg.rules).toHaveLength(2);
    expect(cfg.rules[0]?.kind).toBe("mask");
    expect(cfg.rules[1]?.kind).toBe("hash");
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
    expect(cfg.rules).toHaveLength(1);
    expect(cfg.rules[0]?.path).toBe("b");
  });
});
