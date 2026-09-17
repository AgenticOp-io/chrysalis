#!/usr/bin/env node
/**
 * Make the CWL pillar resolvable from a fresh checkout.
 *
 * Convert consumes `@chrysalis/cwl` and `@chrysalis/webir` as `file:` pins into a
 * sibling `chrysalis-cwl` tree, and a dozen `tsconfig.json` project references point
 * at `packages/webir`. Neither exists in a bare clone, so CI dies at
 * `pnpm install --frozen-lockfile` with ENOENT and every `tsc -b` fails on a missing
 * referenced project. This clones the sibling at a pinned ref and links the
 * CWL-owned packages into `packages/`.
 *
 * Consume only (D6442): the pins, the package contents, and the language stay CWL's.
 * Nothing here is written into the sibling tree.
 *
 * Idempotent. A sibling that already exists is never re-cloned or modified, so local
 * and GCE trees (where the sibling is a working checkout, not a tag) are untouched.
 *
 * Two stages, because the ordering is not free: `pnpm install --frozen-lockfile` needs
 * the sibling on disk, but the lockfile has no importer for a linked `packages/webir`,
 * so linking first fails as an outdated lockfile.
 *
 *   node scripts/ci-link-cwl-sibling.mjs --stage=sibling   # before install
 *   node scripts/ci-link-cwl-sibling.mjs --stage=links     # after install
 *   node scripts/ci-link-cwl-sibling.mjs                   # both (local repair)
 *
 * Env:
 *   CHRYSALIS_CWL_PATH      explicit sibling path (default `../chrysalis-cwl`)
 *   CHRYSALIS_CWL_REF       override the pinned ref from fixtures/ci/cwl-sibling.json
 *   CHRYSALIS_CWL_NO_CLONE  set to 1 to fail instead of cloning a missing sibling
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CWL_SIBLING_LINK_KIND = "chrysalis.ci.cwl-sibling-link";
export const CWL_SIBLING_LINK_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} root */
function readManifest(root) {
  const path = join(root, "fixtures/ci/cwl-sibling.json");
  if (!existsSync(path)) throw new Error(`missing manifest: ${path}`);
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (!manifest.repo || !manifest.ref || !Array.isArray(manifest.packages)) {
    throw new Error(`malformed manifest: ${path}`);
  }
  return manifest;
}

/**
 * Directory links are junctions on Windows (no privilege needed) and symlinks
 * elsewhere. A file symlink pointing at a junction is not traversable on Windows,
 * which is why the link type is explicit rather than inferred.
 * @param {string} linkPath
 * @param {string} targetPath
 */
function linkDirectory(linkPath, targetPath) {
  if (process.platform === "win32") {
    const r = spawnSync("cmd", ["/c", "mklink", "/J", linkPath, targetPath], {
      encoding: "utf8",
    });
    if (r.status !== 0) {
      throw new Error((r.stdout || r.stderr || `mklink /J exit ${r.status}`).trim());
    }
    return;
  }
  symlinkSync(targetPath, linkPath, "junction");
}

/**
 * @param {{ root?: string, stage?: "sibling" | "links" | "all" }} [opts]
 */
export function linkCwlSibling(opts = {}) {
  const stage = opts.stage ?? "all";
  const root = opts.root ? resolve(opts.root) : ROOT;
  const manifest = readManifest(root);
  const ref = process.env.CHRYSALIS_CWL_REF || manifest.ref;
  const sibling = process.env.CHRYSALIS_CWL_PATH
    ? resolve(process.env.CHRYSALIS_CWL_PATH)
    : resolve(root, "..", manifest.siblingDir ?? "chrysalis-cwl");

  /** @type {Array<{ id: string, ok: boolean, action: string, detail?: string }>} */
  const steps = [];

  if (existsSync(sibling)) {
    steps.push({ id: "sibling", ok: true, action: "present", detail: sibling });
  } else if (process.env.CHRYSALIS_CWL_NO_CLONE === "1") {
    steps.push({ id: "sibling", ok: false, action: "absent", detail: sibling });
  } else {
    const clone = spawnSync(
      "git",
      ["clone", "--depth", "1", "--branch", ref, manifest.repo, sibling],
      { encoding: "utf8" },
    );
    steps.push({
      id: "sibling",
      ok: clone.status === 0,
      action: "cloned",
      detail:
        clone.status === 0
          ? `${manifest.repo}@${ref} -> ${sibling}`
          : (clone.stderr || clone.stdout || `git clone exit ${clone.status}`).trim().slice(0, 400),
    });
  }

  if (steps.some((s) => !s.ok) || stage === "sibling") {
    return finish(root, sibling, ref, stage, steps);
  }

  // CWL package tsconfigs reference `../../../chrysalis-convert/packages/*` by name, so
  // a checkout directory called anything else (CI clones the repo as `chrysalis`) leaves
  // those project references dangling. An alias beside the sibling satisfies them without
  // editing a file CWL owns.
  const alias = resolve(root, "..", "chrysalis-convert");
  if (alias === root || existsSync(alias)) {
    steps.push({ id: "convert-alias", ok: true, action: "present", detail: alias });
  } else {
    try {
      linkDirectory(alias, root);
      steps.push({ id: "convert-alias", ok: true, action: "linked", detail: `${alias} -> ${root}` });
    } catch (e) {
      steps.push({
        id: "convert-alias",
        ok: false,
        action: "error",
        detail: String(e instanceof Error ? e.message : e).slice(0, 300),
      });
    }
  }

  mkdirSync(join(root, "packages"), { recursive: true });
  for (const name of manifest.packages) {
    const target = join(sibling, "packages", name);
    const link = join(root, "packages", name);
    if (!existsSync(target)) {
      steps.push({ id: `package:${name}`, ok: false, action: "missing-source", detail: target });
      continue;
    }
    if (existsSync(link)) {
      // An existing junction, symlink, or real directory is left alone: a developer
      // tree may point somewhere deliberate.
      const kind = lstatSync(link).isSymbolicLink() ? "link" : "directory";
      steps.push({ id: `package:${name}`, ok: true, action: `kept-${kind}`, detail: link });
      continue;
    }
    try {
      linkDirectory(link, target);
      steps.push({ id: `package:${name}`, ok: true, action: "linked", detail: `${link} -> ${target}` });
    } catch (e) {
      steps.push({
        id: `package:${name}`,
        ok: false,
        action: "error",
        detail: String(e instanceof Error ? e.message : e).slice(0, 300),
      });
    }
  }

  linkWorkspaceDeps(root, steps);

  return finish(root, sibling, ref, stage, steps);
}

/**
 * A package linked in after `pnpm install` has no `node_modules/@chrysalis/*` of its
 * own, and on Windows pnpm can leave a *file* symlink aimed at a junction, which neither
 * Node nor tsc will traverse. `link-cwl-junction-workspace-deps.mjs` (the postinstall)
 * already owns that repair; it just no-ops on a fresh checkout because the junctions do
 * not exist yet. Re-run it now that they do.
 *
 * @param {string} root
 * @param {Array<{ id: string, ok: boolean, action: string, detail?: string }>} steps
 */
function linkWorkspaceDeps(root, steps) {
  const script = join(root, "scripts/link-cwl-junction-workspace-deps.mjs");
  if (!existsSync(script)) {
    steps.push({ id: "workspace-deps", ok: false, action: "missing-script", detail: script });
    return;
  }
  const r = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  steps.push({
    id: "workspace-deps",
    ok: r.status === 0,
    action: r.status === 0 ? "linked" : "error",
    detail:
      r.status === 0
        ? "link-cwl-junction-workspace-deps.mjs"
        : (r.stderr || r.stdout || `exit ${r.status}`).trim().slice(0, 400),
  });
}

function finish(root, sibling, ref, stage, steps) {
  return {
    kind: CWL_SIBLING_LINK_KIND,
    schemaVersion: CWL_SIBLING_LINK_SCHEMA_VERSION,
    ok: steps.every((s) => s.ok),
    stage,
    convertRoot: root.replace(/\\/g, "/"),
    sibling: sibling.replace(/\\/g, "/"),
    ref,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

const isDirect =
  process.argv[1] != null && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirect) {
  const flag = process.argv.slice(2).find((a) => a.startsWith("--stage="));
  const stage = flag ? flag.slice("--stage=".length) : "all";
  if (!["sibling", "links", "all"].includes(stage)) {
    console.error(`unknown --stage=${stage} (expected sibling | links | all)`);
    process.exit(2);
  }
  const report = linkCwlSibling({ stage: /** @type {"sibling"|"links"|"all"} */ (stage) });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
