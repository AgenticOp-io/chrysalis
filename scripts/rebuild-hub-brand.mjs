#!/usr/bin/env node
/** Sync AgenticOp marks into Translation Hub static assets. */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(here, "hub-brand", "assets");
mkdirSync(outDir, { recursive: true });

for (const name of ["logo-horizontal.svg", "logo-mark.svg"]) {
  copyFileSync(join(root, "branding", "agenticop", name), join(outDir, name));
}
console.log("synced branding/agenticop/*.svg -> scripts/hub-brand/assets/");
