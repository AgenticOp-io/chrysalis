/** @deprecated Shim — import from `scripts/lib/cwl-static-export.mjs`. */
export * from "./lib/cwl-static-export.mjs";
import { runWispCwlStaticExport } from "./lib/cwl-static-export.mjs";

async function main() {
  const r = await runWispCwlStaticExport();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-static-export") || process.argv[1]?.includes("cwl-static-export")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
