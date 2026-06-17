# parser-parity-probe

Small PHP snippets for **Lane A** (glayzzle vs **nikic** strip-pos parity in CI when PHP + vendor are present).
Not a full app; routes exist so the fixture can grow into ingest coverage later.

- **Pages:** `coalesce_chain.php`, `nested_array.php`, `coalesce_assign.php` (`??=`), `string_interpolation.php` (`"{$name}"`), `nullsafe_property.php` (`?->`), `arrow_fn.php` (`fn` arrow functions), `match_expr.php` (`match`), `named_args.php` (named call arguments), `attributes.php` (`#[…]` attributes), `first_class_callable.php`, `enum_decl.php`, `readonly_class.php` (readonly properties + static factory), `invokable_controller.php` (class with `__invoke` + static helper + unused instance method — locks the G132 `__invoke` hoist across both providers, G133).
- **Parity tests:** `packages/parser-bridge/tests/nikic.test.ts` (AST parity) + `packages/ingest/tests/invoke-nikic-parity.test.ts` (ingest WebIR parity on the Symfony flagship).
