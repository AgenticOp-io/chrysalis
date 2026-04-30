# Security policy

## Supported versions

Security-sensitive fixes are applied on the **latest `main`** branch and, when appropriate, backported to the most recent **semver tag** at maintainers' discretion. Use tagged releases for reproducible deployments.

## Reporting a vulnerability

Please report security issues **privately** rather than through public GitHub issues.

1. Open a **GitHub Security Advisory** for this repository (*Security* tab → *Report a vulnerability*), **or**  
2. Contact the repository owners with enough detail to reproduce the issue (affected component, steps, impact) without posting exploit code in public venues.

## Scope notes

- **Oracle redaction** and **SQL tape** handling are in scope: mistakes there can leak sensitive data into trace corpora. Changes to `packages/oracle` / `packages/oracle-php` redaction defaults require lockstep review per `AGENTS.md`.
- **Generated application code** is the operator's responsibility to review before production; Chrysalis provides verification tooling, not a blanket security certification of emitted handlers.

## Disclosure

We aim to acknowledge receipt within a few business days and coordinate a fix and release timeline. Please allow time for patch development and CI validation before public disclosure.
