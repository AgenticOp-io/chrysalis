## Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] Read [`DESIGN.md`](./DESIGN.md) and [`AGENTS.md`](./AGENTS.md); change does not violate non-negotiables.
- [ ] Linked to a **roadmap** slice, **issue**, or **Decision Log** entry where applicable.
- [ ] **Tests:** ran `pnpm test` (or the smallest relevant package tests) for substantive changes.
- [ ] **Build:** after changing an **exported** package API, ran `pnpm --filter <pkg> build` or `pnpm -r build` if CLI/subprocess tests apply.
- [ ] **Changelog:** added an **Unreleased** note in [`CHANGELOG.md`](./CHANGELOG.md) when the change is user-visible.
- [ ] **Oracle-php redaction:** if touching [`packages/oracle/src/redaction.ts`](./packages/oracle/src/redaction.ts) or [`packages/oracle-php/src/Redactor.php`](./packages/oracle-php/src/Redactor.php), ran `pnpm run test:oracle-php-redactor` with PHP on `PATH`.

## Notes

<!-- Optional: risk, rollout, screenshots of CLI output, etc. -->
