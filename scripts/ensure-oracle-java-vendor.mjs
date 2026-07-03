#!/usr/bin/env node
/**
 * Ensures packages/oracle-java/vendor Spring/Jackson jars for hub Java trace replay.
 * Set CHRYSALIS_SKIP_ORACLE_JAVA_VENDOR=1 to skip.
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = join(scriptRoot, "packages/oracle-java/vendor");

export const ORACLE_JAVA_VENDOR_JARS = [
  {
    name: "spring-core-6.1.14.jar",
    url: "https://repo1.maven.org/maven2/org/springframework/spring-core/6.1.14/spring-core-6.1.14.jar",
  },
  {
    name: "spring-web-6.1.14.jar",
    url: "https://repo1.maven.org/maven2/org/springframework/spring-web/6.1.14/spring-web-6.1.14.jar",
  },
  {
    name: "jackson-core-2.17.2.jar",
    url: "https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-core/2.17.2/jackson-core-2.17.2.jar",
  },
  {
    name: "jackson-databind-2.17.2.jar",
    url: "https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-databind/2.17.2/jackson-databind-2.17.2.jar",
  },
  {
    name: "jackson-annotations-2.17.2.jar",
    url: "https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-annotations/2.17.2/jackson-annotations-2.17.2.jar",
  },
  {
    name: "micrometer-commons-1.13.6.jar",
    url: "https://repo1.maven.org/maven2/io/micrometer/micrometer-commons/1.13.6/micrometer-commons-1.13.6.jar",
  },
  {
    name: "micrometer-observation-1.13.6.jar",
    url: "https://repo1.maven.org/maven2/io/micrometer/micrometer-observation/1.13.6/micrometer-observation-1.13.6.jar",
  },
];

/**
 * @param {string} url
 * @param {string} dest
 */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    httpsGet(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(undefined)));
    }).on("error", reject);
  });
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
export async function installOracleJavaVendor() {
  mkdirSync(vendorDir, { recursive: true });
  for (const jar of ORACLE_JAVA_VENDOR_JARS) {
    const dest = join(vendorDir, jar.name);
    if (existsSync(dest)) continue;
    process.stderr.write(`oracle-java vendor: downloading ${jar.name}\n`);
    try {
      await download(jar.url, dest);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { ok: true };
}

async function main() {
  if (process.env.CHRYSALIS_SKIP_ORACLE_JAVA_VENDOR === "1") {
    process.exit(0);
  }
  const marker = join(vendorDir, ORACLE_JAVA_VENDOR_JARS[0].name);
  if (existsSync(marker)) {
    process.exit(0);
  }
  const r = await installOracleJavaVendor();
  process.exit(r.ok ? 0 : 1);
}

const isMain = process.argv[1]?.includes("ensure-oracle-java-vendor");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
