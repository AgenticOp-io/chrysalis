/**
 * Shared helpers for hub WebIR → native language emitters.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";

/**
 * @param {string} projectDir
 * @param {string} origin
 * @param {object} report
 */
export async function writeHubEmitReport(projectDir, origin, report) {
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

/**
 * @param {string} projectDir
 * @param {string} origin
 * @param {string} outputLang
 * @param {string} pathKey
 * @param {(routes: import('./hub-webir-routes.mjs').listHubWebRoutes extends (...args: any) => infer R ? R : never, origin: string) => { files: Record<string, string>, holeCount: number }} render
 */
export async function emitNativeFromHub(projectDir, origin, outputLang, pathKey, render) {
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { files, holeCount } = render(routes, origin);
  const outDir = join(projectDir, "generated", outputLang);
  await mkdir(outDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: outputLang,
    path: pathKey,
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await writeHubEmitReport(projectDir, origin, report);
  return report;
}
