#!/usr/bin/env node
/** WISP package UI lift smoke (G9410, D6366). */
import { existsSync } from "node:fs";
import { applyWispPackageUiLift } from "../wisp-cwl-package-ui-lift.mjs";

export async function runWispPackageUiLiftSmoke() {
  const wispRoot =
    process.env.CHRYSALIS_WISP_ROOT ??
    process.env.WISP_MODULE_DIR ??
    "C:/Users/david/Downloads/WISPTools/Module_Manager";

  if (!existsSync(wispRoot)) {
    return {
      ok: true,
      skip: "wisp-root-missing",
      wispRoot,
      kind: "chrysalis.hub.wisp-package-ui-lift-smoke",
      schemaVersion: 1,
    };
  }

  const routes = `${wispRoot}/generated/cwl/routes.cwl`;
  if (!existsSync(routes)) {
    return {
      ok: true,
      skip: "wisp-routes-missing",
      wispRoot,
      kind: "chrysalis.hub.wisp-package-ui-lift-smoke",
      schemaVersion: 1,
    };
  }

  const lift = await applyWispPackageUiLift({ wispRoot });
  return {
    ok: lift.ok === true,
    kind: "chrysalis.hub.wisp-package-ui-lift-smoke",
    schemaVersion: 1,
    lift,
  };
}

function main() {
  runWispPackageUiLiftSmoke().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
  });
}

if (process.argv[1]?.includes("hub-wisp-package-ui-lift-smoke")) main();
