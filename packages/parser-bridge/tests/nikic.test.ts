import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseSourceWithGlayzzle } from "../src/providers/glayzzle.js";
import { parseSource } from "../src/index.js";

const bridgeRoot = fileURLToPath(new URL("../", import.meta.url));
const vendorAutoload = join(bridgeRoot, "vendor", "autoload.php");
function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const nikicAvailable = existsSync(vendorAutoload) && phpOnPath();

function stripPos<T>(v: T): T {
  return JSON.parse(
    JSON.stringify(v, (_k, x) => {
      if (x && typeof x === "object" && "pos" in (x as object)) {
        const o = { ...(x as object) } as Record<string, unknown>;
        delete o.pos;
        return o;
      }
      return x;
    }),
  ) as T;
}

const run = nikicAvailable ? test : test.skip;

describe("parser-bridge nikic provider", () => {
  run("matches glayzzle on throw / new probe shapes (positions stripped)", async () => {
    const src = `<?php
throw new Exception("probe");
$x = new \\Acme\\Thing(1);
$klass = "Exception";
$y = new $klass("dyn");
$f = "strlen";
$n = $f("abc");
$maybe = null ?? "fallback";
`;
    const gz = parseSourceWithGlayzzle(src, "<t.php>");
    const nk = await parseSource(src, "<t.php>", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on tiny-blog login.php (positions stripped)", async () => {
    const loginPath = resolve(bridgeRoot, "../../fixtures/tiny-blog/pages/login.php");
    const src = readFileSync(loginPath, "utf8");
    const gz = parseSourceWithGlayzzle(src, "login.php");
    const nk = await parseSource(src, "login.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe smoke.php (positions stripped)", async () => {
    const pagePath = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/smoke.php");
    const src = readFileSync(pagePath, "utf8");
    const gz = parseSourceWithGlayzzle(src, "smoke.php");
    const nk = await parseSource(src, "smoke.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe lib/db.php (positions stripped)", async () => {
    const libPath = resolve(bridgeRoot, "../../fixtures/mysqli-probe/lib/db.php");
    const src = readFileSync(libPath, "utf8");
    const gz = parseSourceWithGlayzzle(src, "db.php");
    const nk = await parseSource(src, "db.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });
});
