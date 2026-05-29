#!/usr/bin/env node
/**
 * Re-sync Chrysalis templates into flagship/chrysalis-laravel-work (G109 drift fix).
 */
import { copyFileSync, cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const laravelRoot = resolve(repo, "flagship/chrysalis-laravel-work");
const tmpl = join(repo, "flagship/laravel-full/chrysalis-templates");

if (!existsSync(tmpl)) {
  console.error("[sync-flagship-laravel-templates] missing templates");
  process.exit(1);
}
if (!existsSync(laravelRoot)) {
  console.error("[sync-flagship-laravel-templates] run pnpm run scaffold:laravel-full first");
  process.exit(1);
}

cpSync(join(tmpl, "chrysalis"), join(laravelRoot, "chrysalis"), { recursive: true });
copyFileSync(join(tmpl, "chrysalis.routes.json"), join(laravelRoot, "chrysalis.routes.json"));
const observeTmpl = join(tmpl, "chrysalis.observe.json");
if (existsSync(observeTmpl)) {
  copyFileSync(observeTmpl, join(laravelRoot, "chrysalis.observe.json"));
}
copyFileSync(join(tmpl, "routes", "chrysalis.stub.php"), join(laravelRoot, "routes", "chrysalis.php"));

const routes = JSON.parse(readFileSync(join(laravelRoot, "chrysalis.routes.json"), "utf8"));
console.log(
  JSON.stringify({
    ok: true,
    routeCount: routes.routes?.length ?? 0,
    hasPdoRoute: (routes.routes ?? []).some((r) => r.path === "/chrysalis-pdo-count"),
    laravelRoot,
  }),
);
