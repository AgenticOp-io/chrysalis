/**
 * Load hub WebIR and list routes (shared by native emitters).
 */
import { readFile } from "node:fs/promises";
import { hubWebirPath, loadWebir } from "./shared.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";

/**
 * @param {string} projectDir
 * @param {string} origin
 */
export async function loadHubRoutes(projectDir, origin) {
  const webir = await loadWebir();
  const raw = JSON.parse(await readFile(hubWebirPath(projectDir, origin), "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  return { webir, mod, routes: listHubWebRoutes(mod) };
}
