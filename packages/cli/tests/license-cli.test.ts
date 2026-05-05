import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { signLicenseEnvelope } from "@chrysalis/license";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

function envWithoutLicenseVars(): NodeJS.ProcessEnv {
  const e = { ...process.env };
  delete e.CHRYSALIS_LICENSE;
  delete e.CHRYSALIS_LICENSE_PATH;
  delete e.CHRYSALIS_LICENSE_PUBLIC_KEY;
  delete e.CHRYSALIS_LICENSE_PUBLIC_KEY_PATH;
  delete e.CHRYSALIS_REQUIRE_LICENSE;
  delete e.CHRYSALIS_LICENSE_MIN_TIER;
  return e;
}

describe("chrysalis license gate", () => {
  test("CHRYSALIS_REQUIRE_LICENSE=1 rejects corpus without envelope", () => {
    const emptyCorpus = mkdtempSync(join(tmpdir(), "chrysalis-corpus-"));
    const r = spawnSync(process.execPath, [BIN, "corpus", emptyCorpus], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...envWithoutLicenseVars(),
        CHRYSALIS_REQUIRE_LICENSE: "1",
      },
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/CHRYSALIS_LICENSE/);
  });

  test("CHRYSALIS_REQUIRE_LICENSE=1 allows corpus with valid envelope", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicPem = publicKey.export({ type: "spki", format: "pem" }) as string;
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const envelope = signLicenseEnvelope(
      { sub: "test", tier: "dev", exp: 2_000_000_000 },
      privatePem,
    );
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-lic-"));
    const pubPath = join(dir, "pub.pem");
    const emptyCorpus = mkdtempSync(join(tmpdir(), "chrysalis-corpus-"));
    writeFileSync(pubPath, publicPem, "utf8");
    try {
      const r = spawnSync(process.execPath, [BIN, "corpus", emptyCorpus], {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...envWithoutLicenseVars(),
          CHRYSALIS_REQUIRE_LICENSE: "1",
          CHRYSALIS_LICENSE: JSON.stringify(envelope),
          CHRYSALIS_LICENSE_PUBLIC_KEY_PATH: pubPath,
        },
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("traces: 0");
    } finally {
      unlinkSync(pubPath);
    }
  });

  test("CHRYSALIS_LICENSE_MIN_TIER=enterprise rejects dev tier", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicPem = publicKey.export({ type: "spki", format: "pem" }) as string;
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const envelope = signLicenseEnvelope(
      { sub: "test", tier: "dev", exp: 2_000_000_000 },
      privatePem,
    );
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-lic-"));
    const pubPath = join(dir, "pub.pem");
    const emptyCorpus = mkdtempSync(join(tmpdir(), "chrysalis-corpus-"));
    writeFileSync(pubPath, publicPem, "utf8");
    try {
      const r = spawnSync(process.execPath, [BIN, "corpus", emptyCorpus], {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...envWithoutLicenseVars(),
          CHRYSALIS_REQUIRE_LICENSE: "1",
          CHRYSALIS_LICENSE_MIN_TIER: "enterprise",
          CHRYSALIS_LICENSE: JSON.stringify(envelope),
          CHRYSALIS_LICENSE_PUBLIC_KEY_PATH: pubPath,
        },
      });
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/tier|enterprise/i);
    } finally {
      unlinkSync(pubPath);
    }
  });

  test("chrysalis license check prints ok for valid envelope", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicPem = publicKey.export({ type: "spki", format: "pem" }) as string;
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const envelope = signLicenseEnvelope(
      { sub: "ci", tier: "dev", exp: 2_000_000_000 },
      privatePem,
    );
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-lic-"));
    const pubPath = join(dir, "pub.pem");
    writeFileSync(pubPath, publicPem, "utf8");
    try {
      const r = spawnSync(process.execPath, [BIN, "license", "check"], {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...envWithoutLicenseVars(),
          CHRYSALIS_LICENSE: JSON.stringify(envelope),
          CHRYSALIS_LICENSE_PUBLIC_KEY_PATH: pubPath,
        },
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("license ok.");
    } finally {
      unlinkSync(pubPath);
    }
  });

  test("CHRYSALIS_REQUIRE_LICENSE=1 allows init without envelope (bootstrap)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-init-lic-"));
    try {
      const r = spawnSync(process.execPath, [BIN, "init", dir], {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...envWithoutLicenseVars(),
          CHRYSALIS_REQUIRE_LICENSE: "1",
        },
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/initialized project/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
