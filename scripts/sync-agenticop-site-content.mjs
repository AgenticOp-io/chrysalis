#!/usr/bin/env node
/**
 * Copies docs/WHITEPAPER.md → agenticop-site/whitepaper.md so Firebase Hosting
 * serves the same bytes as the repo canonical doc. Run before deploy and after
 * editing WHITEPAPER.md; CI asserts the files stay identical.
 */
import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = join(root, "docs", "WHITEPAPER.md");
const dst = join(root, "agenticop-site", "whitepaper.md");
copyFileSync(src, dst);
console.log("synced docs/WHITEPAPER.md -> agenticop-site/whitepaper.md");
