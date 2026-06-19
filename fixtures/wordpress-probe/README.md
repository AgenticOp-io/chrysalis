# wordpress-probe

Minimal **Phase 10 WordPress vertical** ingest slice (**G6212–G6219**). Public + admin routes call common **`wp_*`** APIs; ingest records them as **`data.call`**.

| Route | File | wp APIs |
| --- | --- | --- |
| `GET /` | `pages/public_home.php` | `add_action`, `apply_filters`, `get_bloginfo`, `wp_head`, `wp_footer` |
| `GET /wp-admin` | `pages/admin_home.php` | `is_admin`, `wp_die`, `current_user_can`, `wp_create_nonce` |

- **Observe manifest:** `chrysalis.observe.json` (**G6213**)
- **Oracle capture:** `chrysalis.probe.json` + `chrysalis.oracle-corpus.json` (**G6217–G6218**)
- **Verify replay:** correctness **1** on hub probe corpus (**G6219**)
- **Ingest tests:** `packages/ingest/tests/wordpress-probe.test.ts`
- **Smokes:** `pnpm run hub:wordpress-probe-oracle-capture-smoke`

**Non-goal:** full plugin/theme oracle on real WordPress core — customer slice only with holes for unsupported `wp_*`.
