/**
 * Write source tarballs for the current git HEAD using `git archive`.
 * Outputs under release/ (gitignored). Requires a clean-enough tree for your policy;
 * archive always reflects committed files only.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+/.test(String(version))) {
  console.error("make-release-artifacts: expected semver x.y.z in root package.json version");
  process.exit(1);
}

const outDir = join(ROOT, "release");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const prefix = `chrysalis-${version}/`;
const base = join(outDir, `chrysalis-${version}-source`);
const tgz = `${base}.tar.gz`;
const zip = `${base}.zip`;

function runGitArchive(format, output) {
  const r = spawnSync(
    "git",
    ["archive", `--format=${format}`, "--output", output, "--prefix", prefix, "HEAD"],
    { cwd: ROOT, stdio: "inherit" },
  );
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

runGitArchive("tar.gz", tgz);
runGitArchive("zip", zip);
console.log(`release: wrote ${tgz}`);
console.log(`release: wrote ${zip}`);
