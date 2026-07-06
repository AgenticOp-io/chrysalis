import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Module } from "@chrysalis/webir";
import { moduleToGoldenSnapshot } from "@chrysalis/webir";
import {
  INDEX_TS,
  cwlPreviewJson,
  emitManifestJson,
  packageJson,
  TSCONFIG_JSON,
} from "./scaffold-files.js";

export interface EmitInput {
  readonly module: Module;
  readonly outDir: string;
  readonly cwlSource: string;
  readonly holeCount?: number;
  /** npm dependency specifier for @chrysalis/runtime-cwl (default: file: relative to outDir). */
  readonly runtimeCwlDependency?: string;
  readonly provenanceRoot?: string;
}

export interface EmittedFile {
  readonly path: string;
  readonly contentsLength: number;
}

export interface EmitResult {
  readonly files: ReadonlyArray<EmittedFile>;
  readonly holes: ReadonlyArray<{ name: string; reason: string }>;
  readonly handlerCount: number;
  readonly routeCount: number;
  readonly holeCount: number;
}

function defaultRuntimeCwlDependency(outDir: string): string {
  const emitPkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const runtimePkgRoot = resolve(emitPkgRoot, "..", "runtime-cwl");
  const rel = relative(resolve(outDir), runtimePkgRoot).replace(/\\/g, "/");
  return `file:${rel.startsWith(".") ? rel : `./${rel}`}`;
}

async function writeFileWithMkdir(path: string, contents: string): Promise<number> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return Buffer.byteLength(contents, "utf8");
}

function countRoutes(module: Module): number {
  let n = 0;
  for (const rootId of module.roots) {
    const node = module.nodes.get(rootId);
    if (node?.dialect === "web.request" && node.op === "route") n += 1;
  }
  return n;
}

export async function emit(input: EmitInput): Promise<EmitResult> {
  const { module, outDir, cwlSource } = input;
  const outAbs = resolve(outDir);
  const appName = module.meta.sourceApp || "chrysalis-cwl-runtime";
  const routeCount = countRoutes(module);
  const holeCount = input.holeCount ?? 0;
  const runtimeDep = input.runtimeCwlDependency ?? defaultRuntimeCwlDependency(outAbs);
  const webirJson = moduleToGoldenSnapshot(module);
  const files: EmittedFile[] = [];

  const writes: Array<{ rel: string; contents: string }> = [
    { rel: "routes.cwl", contents: cwlSource.endsWith("\n") ? cwlSource : `${cwlSource}\n` },
    { rel: "src/webir.json", contents: `${webirJson}\n` },
    { rel: "src/index.ts", contents: INDEX_TS },
    { rel: "package.json", contents: packageJson(appName, runtimeDep) },
    { rel: "tsconfig.json", contents: TSCONFIG_JSON },
    {
      rel: "cwl-preview.json",
      contents: `${cwlPreviewJson({ routeCount, holeCount, appName })}\n`,
    },
    {
      rel: "chrysalis.emit.runtime-cwl.json",
      contents: `${emitManifestJson({
        appName,
        routeCount,
        holeCount,
        handlerCount: routeCount,
        files: [],
      })}\n`,
    },
  ];

  for (const { rel, contents } of writes) {
    const path = join(outAbs, rel);
    const len = await writeFileWithMkdir(path, contents);
    files.push({ path: rel, contentsLength: len });
  }

  const manifestPath = join(outAbs, "chrysalis.emit.runtime-cwl.json");
  await writeFile(
    manifestPath,
    `${emitManifestJson({
      appName,
      routeCount,
      holeCount,
      handlerCount: routeCount,
      files: files.map((f) => f.path),
    })}\n`,
    "utf8",
  );

  return {
    files,
    holes: holeCount > 0 ? [{ name: "cwl-projection", reason: `${holeCount} hole(s) in routes.cwl` }] : [],
    handlerCount: routeCount,
    routeCount,
    holeCount,
  };
}
