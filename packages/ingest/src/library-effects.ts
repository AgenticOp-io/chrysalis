/**
 * Cross-call effect widening: lower PHP function bodies to isolated WebIR,
 * fixpoint-merge callees' effects, then route handlers union overlay effects at
 * `data.call` sites.
 *
 * Sources: `lib/**.php` (always), `vendor/**.php` (best-effort, optional), and
 * top-level `FunctionDecl` in each manifest route file. Name precedence:
 * `lib` wins over `vendor`, and both win over route-local helpers. Route lowering
 * matches fully-qualified PHP callees to those short names via the unqualified
 * tail in `effectsReachableWithCallOverlay` (see `@chrysalis/webir` builder).
 */

import { access, readdir, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { PhpAst, PhpNode } from "@chrysalis/parser-bridge";
import { parseFile, type Provider } from "@chrysalis/parser-bridge";
import {
  ModuleBuilder,
  effectTagsSorted,
  effectsReachableFrom,
  effectsReachableWithCallOverlay,
  type EffectSet,
  type NodeId,
} from "@chrysalis/webir";
import { convertPhpStatementsToBlock } from "./convert.js";
import { applyHelperLiftAliases, buildHelperLiftAliasMap } from "./lift-shared-helpers.js";

async function collectPhpFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectPhpFilesRecursive(p)));
    } else if (ent.isFile() && ent.name.endsWith(".php")) {
      out.push(p);
    }
  }
  return out;
}

async function collectComposerJsonFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectComposerJsonFilesRecursive(p)));
    } else if (ent.isFile() && ent.name === "composer.json") {
      out.push(p);
    }
  }
  return out;
}

async function collectPhpFilesFromDirs(dirs: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  for (const dir of dirs) {
    try {
      await access(dir, fsConstants.R_OK);
      out.push(...(await collectPhpFilesRecursive(dir)));
    } catch {
      /* ignore unreadable/missing dir */
    }
  }
  return out;
}

type ComposerJsonLike = {
  readonly autoload?: {
    readonly files?: readonly string[];
    readonly "psr-4"?: Readonly<Record<string, string | readonly string[]>>;
  };
};

async function collectComposerAutoloadFiles(vendorDir: string): Promise<string[]> {
  const out = new Set<string>();
  const composerJsonFiles = await collectComposerJsonFilesRecursive(vendorDir);
  for (const composerJsonPath of composerJsonFiles) {
    let parsed: ComposerJsonLike;
    try {
      parsed = JSON.parse(await readFile(composerJsonPath, "utf8")) as ComposerJsonLike;
    } catch {
      continue;
    }
    const pkgRoot = dirname(composerJsonPath);
    const files = parsed.autoload?.files ?? [];
    for (const rel of files) {
      if (typeof rel !== "string" || rel.trim() === "") continue;
      out.add(resolve(pkgRoot, rel));
    }
    const psr4 = parsed.autoload?.["psr-4"];
    if (!psr4) continue;
    const dirs: string[] = [];
    for (const maybeDirs of Object.values(psr4)) {
      if (typeof maybeDirs === "string") {
        dirs.push(resolve(pkgRoot, maybeDirs));
      } else if (Array.isArray(maybeDirs)) {
        for (const d of maybeDirs) {
          if (typeof d === "string" && d.trim() !== "") {
            dirs.push(resolve(pkgRoot, d));
          }
        }
      }
    }
    const phpFiles = await collectPhpFilesFromDirs(dirs);
    for (const f of phpFiles) out.add(f);
  }
  return [...out];
}

function effectSetKey(e: EffectSet): string {
  return effectTagsSorted(e).join("\0");
}

function collectFunctionBodies(ast: PhpAst, builder: ModuleBuilder): Map<string, NodeId> {
  const bodies = new Map<string, NodeId>();
  const walk = (stmts: readonly PhpNode[]) => {
    for (const stmt of stmts) {
      if (stmt.kind !== "FunctionDecl") continue;
      const rootId = convertPhpStatementsToBlock(builder, ast.file, stmt.body);
      bodies.set(stmt.name, rootId);
      walk(stmt.body);
    }
  };
  walk(ast.statements);
  return bodies;
}

function runCallEffectFixpoint(
  builder: ModuleBuilder,
  bodies: Map<string, NodeId>,
): ReadonlyMap<string, EffectSet> {
  const getNode = (id: NodeId) => builder.get(id);
  const sig = new Map<string, EffectSet>();
  for (const [name, rootId] of bodies) {
    sig.set(name, effectsReachableFrom(getNode, rootId));
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, rootId] of bodies) {
      const next = effectsReachableWithCallOverlay(getNode, rootId, sig);
      const prev = sig.get(name);
      if (!prev || effectSetKey(next) !== effectSetKey(prev)) {
        sig.set(name, next);
        changed = true;
      }
    }
  }

  return sig;
}

/**
 * `lib/` only (backward-compatible entry).
 */
export async function buildLibraryCallEffectMap(root: string): Promise<ReadonlyMap<string, EffectSet>> {
  return buildCallEffectMap(root, undefined);
}

export interface RouteFileRef {
  readonly file: string;
}

export interface CallEffectMapOptions {
  readonly parserProvider?: Provider;
  /**
   * When true, lib/vendor/route-local helpers with structurally identical lowered bodies
   * share one WebIR body root before the call-effect fixpoint (**IR helper lifting B2**).
   */
  readonly liftSharedHelpers?: boolean;
  /** Passed to structural key when {@link liftSharedHelpers} is true. Default: ignore origin. */
  readonly liftSharedHelpersIgnoreOrigin?: boolean;
}

function mergeBodies(
  target: Map<string, NodeId>,
  incoming: ReadonlyMap<string, NodeId>,
  opts?: { readonly overwrite?: boolean },
): void {
  const overwrite = opts?.overwrite ?? false;
  for (const [name, id] of incoming) {
    if (overwrite || !target.has(name)) {
      target.set(name, id);
    }
  }
}

/**
 * Parse `root/lib/**.php`, optional `root/vendor/**.php`, plus top-level
 * functions in each `routeSpecs` file, then fixpoint-merge nested
 * `data.call` effects.
 */
export async function buildCallEffectMap(
  root: string,
  routeSpecs: ReadonlyArray<RouteFileRef> | undefined,
  opts?: CallEffectMapOptions,
): Promise<ReadonlyMap<string, EffectSet>> {
  const builder = new ModuleBuilder({ sourceApp: `${root}:call-effects` });
  const bodies = new Map<string, NodeId>();

  const libDir = join(root, "lib");
  try {
    await access(libDir, fsConstants.R_OK);
    const phpFiles = await collectPhpFilesRecursive(libDir);
    for (const filePath of phpFiles) {
      const ast = await parseFile(filePath, {
        ...(opts?.parserProvider ? { provider: opts.parserProvider } : {}),
      });
      const fromFile = collectFunctionBodies(ast, builder);
      mergeBodies(bodies, fromFile, { overwrite: true });
    }
  } catch {
    /* no readable lib */
  }

  const vendorDir = join(root, "vendor");
  try {
    await access(vendorDir, fsConstants.R_OK);
    // Prefer Composer autoload metadata when available (autoload.files, psr-4).
    // Keep a recursive vendor scan fallback so coverage remains sound.
    const composerIndexed = await collectComposerAutoloadFiles(vendorDir);
    const recursivePhp = await collectPhpFilesRecursive(vendorDir);
    const candidateFiles = new Set<string>([...composerIndexed, ...recursivePhp]);
    for (const filePath of candidateFiles) {
      const ast = await parseFile(filePath, {
        ...(opts?.parserProvider ? { provider: opts.parserProvider } : {}),
      });
      const fromFile = collectFunctionBodies(ast, builder);
      // Local library helpers keep precedence over vendor helpers.
      mergeBodies(bodies, fromFile);
    }
  } catch {
    /* no readable vendor */
  }

  if (routeSpecs) {
    for (const spec of routeSpecs) {
      const ast = await parseFile(resolve(root, spec.file), {
        ...(opts?.parserProvider ? { provider: opts.parserProvider } : {}),
      });
      const fromFile = collectFunctionBodies(ast, builder);
      mergeBodies(bodies, fromFile);
    }
  }

  if (bodies.size === 0) {
    return new Map();
  }

  if (opts?.liftSharedHelpers === true) {
    const getNode = (id: NodeId) => builder.get(id);
    const aliases = buildHelperLiftAliasMap(bodies, getNode, {
      ignoreOrigin: opts.liftSharedHelpersIgnoreOrigin !== false,
    });
    applyHelperLiftAliases(bodies, aliases);
  }

  return runCallEffectFixpoint(builder, bodies);
}
