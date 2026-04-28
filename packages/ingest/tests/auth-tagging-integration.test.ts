import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/auth-tag-probe");

describe("ingest: auth-tagged holes (6A)", () => {
  test("static variable with auth-adjacent name yields data.hole with auth: prefix", async () => {
    const mod = await ingestDirectory(FIXTURE);

    const authHoles: string[] = [];
    walk(mod, (n) => {
      if (n.dialect === "data" && n.op === "hole") {
        const r = String((n.attrs as { reason?: string }).reason ?? "");
        if (r.startsWith("auth:")) authHoles.push(r);
      }
    });

    expect(authHoles.length).toBeGreaterThan(0);
    expect(
      authHoles.some((r) => r.includes("static variable declaration") && r.includes("$csrfToken")),
    ).toBe(true);
  });
});
