/**
 * Cross-call effect widening for PHP `lib/` sources: each top-level function is
 * lowered to a WebIR subtree in an isolated module; we fixpoint-merge callees'
 * effect sets, then route handlers union overlay effects at `data.call` sites.
 */

import { access, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import type { PhpAst } from "@chrysalis/parser-bridge";
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
  for (const stmt of ast.statements) {
    if (stmt.kind !== "FunctionDecl") continue;
    const rootId = convertPhpStatementsToBlock(builder, ast.file, stmt.body);
    bodies.set(stmt.name, rootId);
  }
  return bodies;
}

/**
 * Parse all `.php` files under `root/lib` (recursively), build per-function
 * WebIR bodies, and compute a fixpoint map of function name to merged effect
 * set (including nested calls between library functions).
 */
export async function buildLibraryCallEffectMap(root: string): Promise<ReadonlyMap<string, EffectSet>> {
  const libDir = join(root, "lib");
  try {
    await access(libDir, fsConstants.R_OK);
  } catch {
    return new Map();
  }

  const phpFiles = await collectPhpFilesRecursive(libDir);
  if (phpFiles.length === 0) return new Map();

  const builder = new ModuleBuilder({ sourceApp: `${root}:lib` });
  const bodies = new Map<string, NodeId>();

  for (const filePath of phpFiles) {
    const ast = await parseFile(filePath);
    const fromFile = collectFunctionBodies(ast, builder);
    for (const [name, id] of fromFile) {
      bodies.set(name, id);
    }
  }

  if (bodies.size === 0) return new Map();

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
