#!/usr/bin/env node
/**
 * Sync Translation Hub branding assets from AgenticOp-io/agenticops-web.
 * Requires GitHub CLI auth (gh auth status).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "hub-brand", "assets");

function runGh(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", args, { shell: false });
    const out = [];
    const err = [];
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(Buffer.concat(err).toString("utf8") || `gh failed (${code})`));
      else resolve(Buffer.concat(out).toString("utf8").trim());
    });
    child.on("error", reject);
  });
}

async function downloadAsset(repoPath, outName) {
  const url = await runGh(["api", `repos/AgenticOp-io/agenticops-web/contents/${repoPath}`, "--jq", ".download_url"]);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to fetch ${repoPath}: ${response.status}`);
  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(join(outDir, outName), buf);
}

await mkdir(outDir, { recursive: true });
await downloadAsset("logo.svg", "logo.svg");
await downloadAsset("agenticops.css", "agenticops.css");
console.log("synced agenticops-web branding -> scripts/hub-brand/assets/");
