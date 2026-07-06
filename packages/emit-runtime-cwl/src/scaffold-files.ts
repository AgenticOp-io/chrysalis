export const TSCONFIG_JSON = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noUncheckedIndexedAccess: false,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*"],
  },
  null,
  2,
);

export function packageJson(appName: string, runtimeCwlDependency: string): string {
  return JSON.stringify(
    {
      name: appName,
      version: "0.0.0",
      private: true,
      type: "module",
      engines: { node: ">=22.5.0" },
      scripts: {
        dev: "tsx src/index.ts",
        build: "tsc --noEmit",
        start: "node --experimental-strip-types src/index.ts",
      },
      dependencies: {
        "@chrysalis/runtime-cwl": runtimeCwlDependency,
      },
      devDependencies: {
        "@types/node": "^22.10.0",
        tsx: "^4.7.0",
        typescript: "^5.6.0",
      },
    },
    null,
    2,
  );
}

export const INDEX_TS = `import { createCwlRuntime, loadModuleFromWebirJsonFile, startCwlServer } from "@chrysalis/runtime-cwl";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const runtime = createCwlRuntime({ module: loadModuleFromWebirJsonFile(join(root, "webir.json")) });
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 8787);
const server = await startCwlServer({ runtime, host, port });
// eslint-disable-next-line no-console
console.log(\`chrysalis runtime-cwl listening on http://\${host}:\${server.port} (\${runtime.routes.length} routes)\`);
`;

export function cwlPreviewJson(opts: {
  routeCount: number;
  holeCount: number;
  appName: string;
}): string {
  return JSON.stringify(
    {
      kind: "chrysalis.hub.cwl-preview",
      schemaVersion: 1,
      ok: true,
      routeCount: opts.routeCount,
      holeCount: opts.holeCount,
      moduleName: opts.appName,
      runtime: "@chrysalis/runtime-cwl",
      emitTarget: "runtime-cwl",
      probe: { skipped: "emit-runtime-cwl-scaffold" },
    },
    null,
    2,
  );
}

export function emitManifestJson(opts: {
  appName: string;
  routeCount: number;
  holeCount: number;
  handlerCount: number;
  files: ReadonlyArray<string>;
}): string {
  return JSON.stringify(
    {
      kind: "chrysalis.emit.runtime-cwl",
      schemaVersion: 1,
      target: "runtime-cwl",
      appName: opts.appName,
      routeCount: opts.routeCount,
      holeCount: opts.holeCount,
      handlerCount: opts.handlerCount,
      runtime: "@chrysalis/runtime-cwl",
      files: opts.files,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}
