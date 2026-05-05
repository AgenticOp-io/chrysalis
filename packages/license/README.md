# `@chrysalis/license`

## Purpose

Optional **local** verification of **Ed25519-signed** license envelopes so commercial distributions can gate the CLI without changing WebIR, oracle, or verify semantics. **Publication:** ships **inside this workspace** only; there is **no** separate published npm **commercial** product line for this package yet (see **`docs/COMMERCIAL.md`**).

## Public API

- **`canonicalStringify(value)`** — deterministic JSON bytes for signing.
- **`verifyLicenseEnvelope(envelope, publicKeyPem | KeyObject, options?)`** — signature check + `exp` (Unix seconds); **no network**.
- **`assertMinLicenseTier(claims, minTier)`** — enforces **dev < pro < enterprise** for SKU differentiation.
- **`signLicenseEnvelope(claims, privateKeyPem)`** — maintainer/vendor signing (`scripts/sign-license.mjs`, not the CLI).
- **`loadLicenseEnvelopeFromEnv()`**, **`loadPublicKeyPemFromEnv()`** — read `CHRYSALIS_LICENSE*` / `CHRYSALIS_LICENSE_PUBLIC_KEY*`.
- **`licenseAllowsFeature(claims, featureId)`** — **`enterprise`** allows all; otherwise **`claims.features`** must list the id.

See **`docs/COMMERCIAL.md`** for how tiers map to offerings.

## Invariants

- Default OSS behavior: enforcement **off** unless `CHRYSALIS_REQUIRE_LICENSE=1`.
- Verification uses **only** operator-supplied envelope + public key; **no** license-server callback in this package.
- **`CHRYSALIS_LICENSE_MIN_TIER`** (optional) applies only when **`CHRYSALIS_REQUIRE_LICENSE=1`**.

## Non-goals

- Online activation, Stripe, or usage metering (integrate in your billing stack; emit signed **`claims`** there).
- Changing **MIT** for the public tree; dual-license builds are an **out-of-repo** packaging choice.
