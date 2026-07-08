#!/usr/bin/env node
/**
 * Deploy https://agenticop.io from AgenticOp-io/agenticops-web — NOT chrysalis/agenticop-site/.
 * Production layout, colors, and pages live in the site repo; this repo only mirrors whitepaper markdown.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const candidates = [
  process.env.AGENTICOPS_WEB_DIR,
  join(root, "..", "agenticops-web"),
  join(process.env.USERPROFILE ?? process.env.HOME ?? "", "Downloads", "agenticops-web"),
].filter(Boolean);

const siteDir = candidates.map((p) => resolve(String(p))).find((p) => existsSync(join(p, "firebase.json")));

if (!siteDir) {
  console.error("deploy-agenticop-site: clone the canonical site repo first:");
  console.error("  git clone https://github.com/AgenticOp-io/agenticops-web.git ../agenticops-web");
  console.error("Or set AGENTICOPS_WEB_DIR to that checkout.");
  console.error("");
  console.error("Do NOT firebase deploy chrysalis/agenticop-site/ — it is not the production site.");
  process.exit(1);
}

const project = process.env.AGENTICOP_FIREBASE_PROJECT ?? "agenticop-io";
const args = ["deploy", "--only", "hosting:agenticops", "--project", project];

console.log(`deploy-agenticop-site: ${siteDir}`);
console.log(`  firebase ${args.join(" ")}`);

const result = spawnSync("firebase", args, { cwd: siteDir, stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
