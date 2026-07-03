#!/usr/bin/env node
/** Install hub native trace-replay probe dependencies (Java vendor JARs). */
import { installOracleJavaVendor } from "./ensure-oracle-java-vendor.mjs";

async function main() {
  const r = await installOracleJavaVendor();
  if (!r.ok) {
    console.error(r.error ?? "oracle-java vendor install failed");
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, kind: "chrysalis.hub.install-native-probes" }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
