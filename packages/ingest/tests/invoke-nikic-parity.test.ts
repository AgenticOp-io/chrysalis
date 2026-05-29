import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { ingestDirectory } from "../src/index.js";
import { walk } from "@chrysalis/webir";

const SYMFONY = resolve(__dirname, "../../../fixtures/hub-flagship-symfony");
const NIKIC_VENDOR = resolve(__dirname, "../../parser-bridge/vendor/autoload.php");

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const nikicRunnable = existsSync(NIKIC_VENDOR) && phpOnPath();

function summarize(mod: Awaited<ReturnType<typeof ingestDirectory>>) {
  let echoes = 0;
  let holes = 0;
  walk(mod, (n) => {
    if (n.dialect === "effect" && n.op === "echo") echoes += 1;
    if (n.dialect === "data" && n.op === "hole") holes += 1;
  });
  return { routes: mod.roots.length, echoes, holes };
}

describe("ingest: invokable controller body lift (G132/G133)", () => {
  (phpOnPath() ? test : test.skip)("glayzzle lifts Symfony __invoke bodies hole-free with echo effects", async () => {
    const mod = await ingestDirectory(SYMFONY);
    const s = summarize(mod);
    expect(s.routes).toBe(20);
    expect(s.holes).toBe(0);
    // __invoke bodies (json_encode echoes) are lifted, not empty shells.
    expect(s.echoes).toBeGreaterThan(0);
  });

  (nikicRunnable ? test : test.skip)("nikic matches glayzzle on the Symfony __invoke lift", async () => {
    const gz = summarize(await ingestDirectory(SYMFONY));
    const nk = summarize(await ingestDirectory(SYMFONY, { parserProvider: "nikic" }));
    expect(nk).toEqual(gz);
  });
});
