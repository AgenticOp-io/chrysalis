# wordpress-probe

Minimal **Phase 10 WordPress vertical** ingest slice (**G6212–G6216**). Public + admin routes call common **`wp_*`** APIs; ingest records them as **`data.call`** (unsupported semantics — not lowered to effects yet).

| Route | File | wp APIs |
| --- | --- | --- |
| `GET /` | `pages/public_home.php` | `add_action`, `apply_filters`, `get_bloginfo`, `wp_head`, `wp_footer` |
| `GET /wp-admin` | `pages/admin_home.php` | `is_admin`, `wp_die`, `current_user_can`, `wp_create_nonce` |

- **Observe manifest:** `chrysalis.observe.json` (**G6213**)
- **Ingest tests:** `packages/ingest/tests/wordpress-probe.test.ts`
- **Gates:** `runWordPressVerticalPhase10DepthGate`
- **Smokes:** `pnpm run hub:wordpress-probe-ingest-smoke`, `pnpm run hub:strategic-plan-phase10-depth-smoke`

**Non-goal:** full plugin/theme oracle — dedicated WP capture fixture follows (**G6217+**).
