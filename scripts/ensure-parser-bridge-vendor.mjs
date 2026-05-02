#!/usr/bin/env node
/**
 * Ensures packages/parser-bridge/vendor exists when Composer or PHP is available.
 * Lets `pnpm test` run nikic parity Vitest without a separate manual step.
 * See `scripts/parser-bridge-composer-install.mjs` for bootstrap when `composer` is not on PATH.
 * Set `CHRYSALIS_SKIP_PARSER_VENDOR=1` to skip.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installParserBridgeVendor } from "./parser-bridge-composer-install.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const vendorAutoload = join(root, "packages/parser-bridge/vendor/autoload.php");

if (process.env.CHRYSALIS_SKIP_PARSER_VENDOR === "1") {
  process.exit(0);
}

if (existsSync(vendorAutoload)) {
  process.exit(0);
}

const code = await installParserBridgeVendor({ allowSkipWithoutPhp: true });
process.exit(code);
