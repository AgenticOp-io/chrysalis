/**
 * Cross-call effect widening: lower PHP function bodies to isolated WebIR,
 * fixpoint-merge callees' effects, then route handlers union overlay effects at
 * `data.call` sites.
 *
 * Sources: `lib/**.php` (always) and top-level `FunctionDecl` in each manifest
 * route file (names already defined under `lib/` win).
 */

import { access, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join, resolve } from "node:path";
import type { PhpAst, PhpNode } from "@chrysalis/parser-bridge";
import { parseFile } from "@chrysalis/parser-bridge";
import {
  ModuleBuilder,
  effectTagsSorted,
  effectsReachableFrom,
  effectsReachableWithCallOverlay,
  type EffectSet,
  type NodeId,
} from "@chrysalis/webir";
import { convertPhpStatementsToBlock } from "./convert.js";

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

/**
 * Parse `root/lib/**.php` plus top-level functions in each `routeSpecs` file,
 * then fixpoint-merge nested `data.call` effects.
 */
export async function buildCallEffectMap(
  root: string,
  routeSpecs: ReadonlyArray<RouteFileRef> | undefined,
): Promise<ReadonlyMap<string, EffectSet>> {
  const builder = new ModuleBuilder({ sourceApp: `${root}:call-effects` });
  const bodies = new Map<string, NodeId>();

  const libDir = join(root, "lib");
  try {
    await access(libDir, fsConstants.R_OK);
    const phpFiles = await collectPhpFilesRecursive(libDir);
    for (const filePath of phpFiles) {
      const ast = await parseFile(filePath);
      const fromFile = collectFunctionBodies(ast, builder);
      for (const [name, id] of fromFile) {
        bodies.set(name, id);
      }
    }
  } catch {
    /* no readable lib */
  }

  if (routeSpecs) {
    for (const spec of routeSpecs) {
      const ast = await parseFile(resolve(root, spec.file));
      const fromFile = collectFunctionBodies(ast, builder);
      for (const [name, id] of fromFile) {
        if (!bodies.has(name)) {
          bodies.set(name, id);
        }
      }
    }
  }

  if (bodies.size === 0) {
    return new Map();
  }

  return runCallEffectFixpoint(builder, bodies);
}
