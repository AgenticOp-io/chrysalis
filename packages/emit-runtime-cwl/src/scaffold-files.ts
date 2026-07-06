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
        "docker:build": "docker build -t chrysalis-cwl-app .",
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

export const DOCKERIGNORE = `node_modules
npm-debug.log
.git
`;

export const DOCKERFILE = `# Chrysalis CWL runtime-cwl app (self-contained vendor stack).
FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json ./
COPY vendor ./vendor
COPY src ./src
COPY routes.cwl tsconfig.json ./

RUN npm install --omit=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
`;

export function deployReadme(opts: { appName: string; routeCount: number; runtimeVersion: string }): string {
  return `# ${opts.appName} — CWL runtime-cwl deploy

Emitted by \`chrysalis emit --target=runtime-cwl\`. Routes: **${opts.routeCount}**. Runtime: **@chrysalis/runtime-cwl@${opts.runtimeVersion}**.

## Local (Node)

\`\`\`bash
npm install
npm start
\`\`\`

Listens on \`http://127.0.0.1:8787\` by default. Set \`HOST\` and \`PORT\`.

## Docker

\`\`\`bash
npm run docker:build
docker run --rm -p 8787:8787 -e PORT=8787 chrysalis-cwl-app
\`\`\`

The image bundles a vendored \`@chrysalis/runtime-cwl\` stack under \`vendor/\` — no Chrysalis monorepo required at runtime.

## Honest limits

- **Preview / greenfield / demo** — WebIR simulator via \`@chrysalis/runtime-cwl\`.
- **Production PHP migration cutover** — prefer \`--target=hono\` or \`fastify\` + \`chrysalis verify\` replay; chimera dual-stack optional.
- Unsupported IR returns **501** — never invented bodies.

See [Chrysalis DEPLOYMENT.md](https://github.com/AgenticOp-io/chrysalis/blob/main/docs/DEPLOYMENT.md#deploying-cwl-runtime-cwl-target).
`;
}

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
