#!/usr/bin/env node
/**
 * Builds agenticop-site/site.css from the inline <style> in agenticop-site/index.html
 * plus whitepaper-append.css. Keeps whitepaper.html aligned with the same tokens as
 * the landing page (restored from git history before a separate CSS split).
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const indexPath = join(root, "agenticop-site", "index.html");
const appendPath = join(root, "agenticop-site", "whitepaper-append.css");
const outPath = join(root, "agenticop-site", "site.css");

const html = readFileSync(indexPath, "utf8");
const m = html.match(/<style>\s*([\s\S]*?)\s*<\/style>/);
if (!m) {
  throw new Error(`rebuild-agenticop-site-css: no <style> block in ${indexPath}`);
}
const raw = m[1];
const dedented = raw
  .split("\n")
  .map((line) => line.replace(/^ {6}/, ""))
  .join("\n")
  .trim();
const append = readFileSync(appendPath, "utf8").trim();
writeFileSync(outPath, `${dedented}\n\n${append}\n`, "utf8");
console.log("wrote agenticop-site/site.css from index.html + whitepaper-append.css");

const brandH = join(root, "branding", "agenticop", "logo-horizontal.svg");
const brandM = join(root, "branding", "agenticop", "logo-mark.svg");
const outH = join(root, "agenticop-site", "assets", "logo-horizontal.svg");
const outM = join(root, "agenticop-site", "assets", "logo-mark.svg");
copyFileSync(brandH, outH);
copyFileSync(brandM, outM);
console.log("synced branding/agenticop/*.svg -> agenticop-site/assets/");
