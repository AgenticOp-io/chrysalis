import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const emitPkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesRoot = resolve(emitPkgRoot, "..");

interface VendorSpec {
  readonly dir: string;
  readonly deps: Record<string, string>;
}

const VENDOR_SPECS: readonly VendorSpec[] = [
  { dir: "webir", deps: {} },
  { dir: "oracle", deps: {} },
  { dir: "insight", deps: { "@chrysalis/webir": "file:../webir", "@chrysalis/oracle": "file:../oracle" } },
  { dir: "verify", deps: { "@chrysalis/webir": "file:../webir", "@chrysalis/oracle": "file:../oracle" } },
  {
    dir: "rewrite",
    deps: {
      "@chrysalis/webir": "file:../webir",
      "@chrysalis/insight": "file:../insight",
      "@chrysalis/verify": "file:../verify",
      "@chrysalis/oracle": "file:../oracle",
    },
  },
  {
    dir: "runtime-cwl",
    deps: { "@chrysalis/rewrite": "file:../rewrite", "@chrysalis/webir": "file:../webir" },
  },
];

function readSourcePackageJson(pkgDir: string): {
  name: string;
  version: string;
  type?: string;
  main?: string;
  types?: string;
  exports?: unknown;
  bin?: unknown;
} {
  return JSON.parse(readFileSync(join(packagesRoot, pkgDir, "package.json"), "utf8")) as {
    name: string;
    version: string;
    type?: string;
    main?: string;
    types?: string;
    exports?: unknown;
    bin?: unknown;
  };
}

export async function vendorRuntimeStack(outAbs: string): Promise<void> {
  const vendorRoot = join(outAbs, "vendor", "@chrysalis");
  await mkdir(vendorRoot, { recursive: true });
  for (const spec of VENDOR_SPECS) {
    const srcRoot = join(packagesRoot, spec.dir);
    const dist = join(srcRoot, "dist");
    if (!existsSync(dist)) {
      throw new Error(
        `missing ${spec.dir}/dist — run pnpm --filter @chrysalis/${spec.dir} build before runtime-cwl emit`,
      );
    }
    const dest = join(vendorRoot, spec.dir);
    await mkdir(dest, { recursive: true });
    await cp(dist, join(dest, "dist"), { recursive: true });
    const src = readSourcePackageJson(spec.dir);
    const pkg = {
      name: src.name,
      version: src.version,
      private: true,
      type: src.type ?? "module",
      main: src.main,
      types: src.types,
      ...(src.exports != null ? { exports: src.exports } : {}),
      ...(src.bin != null ? { bin: src.bin } : {}),
      dependencies: spec.deps,
    };
    await writeFile(join(dest, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }
}

export function runtimeCwlDependencyForEmit(outAbs: string, bundleRuntime: boolean): string {
  if (bundleRuntime) {
    return "file:./vendor/@chrysalis/runtime-cwl";
  }
  const runtimePkgRoot = resolve(emitPkgRoot, "..", "runtime-cwl");
  const rel = relative(resolve(outAbs), runtimePkgRoot).replace(/\\/g, "/");
  return `file:${rel.startsWith(".") ? rel : `./${rel}`}`;
}

export async function readRuntimeCwlVersion(): Promise<string> {
  const raw = await readFile(join(packagesRoot, "runtime-cwl", "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { version: string };
  return pkg.version;
}
