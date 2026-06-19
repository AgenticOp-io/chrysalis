# WordPress core stub fixture

Phase 10 WordPress vertical slice with **stub WordPress core** implementations in `lib/wp-core-stubs.php` (**G6224**). Same route shape as `wordpress-probe` but PHP executes real stub functions instead of unresolved `wp_*` calls.

| Route | File | wp_* |
| --- | --- | --- |
| `GET /` | `pages/public_home.php` | hooks + bloginfo + head/footer |
| `GET /wp-admin` | `pages/admin_home.php` | admin gate + nonce |

Manifest `wordpressEffectCallees` lowers calls to `effect.wp.call` (**G6225**).

```bash
pnpm run hub:wordpress-core-stub-oracle-capture-smoke
```

**Non-goal:** shipping WordPress core itself — customer slices use oracle evidence on their tree.
