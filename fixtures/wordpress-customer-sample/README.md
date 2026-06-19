# WordPress customer sample fixture

Customer-oracle **sample slice** for Phase 11 (**G6280**). Uses `bootstrap/wp-load.php` and a REST route (`/wp-json/wp/v2/posts`) to mimic a real customer tree layout without shipping WordPress core.

Gate: `runWordPressCustomerSampleOracleGate`

```bash
pnpm run hub:wordpress-customer-sample-oracle-smoke
```

See [`docs/WORDPRESS-CUSTOMER-ORACLE.md`](../docs/WORDPRESS-CUSTOMER-ORACLE.md).
