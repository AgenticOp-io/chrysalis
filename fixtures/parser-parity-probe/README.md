# parser-parity-probe

Small PHP snippets for **Lane A** (glayzzle vs **nikic** strip-pos parity in CI when PHP + vendor are present).
Not a full app; routes exist so the fixture can grow into ingest coverage later.

- **Pages:** `coalesce_chain.php`, `nested_array.php`, `coalesce_assign.php` (`??=`), `string_interpolation.php` (`"{$name}"`).
- **Parity tests:** `packages/parser-bridge/tests/nikic.test.ts`
