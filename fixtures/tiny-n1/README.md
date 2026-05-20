# tiny-n1

A deliberately broken PHP fixture used to exercise `@chrysalis/insight`.
Every handler here contains a well-known legacy anti-pattern:

| Route | Anti-pattern | Recognizer |
| --- | --- | --- |
| `GET /dashboard` | 2N+1 query per post (author + comment count) | `n-plus-one-queries` |
| `POST /register` | six ad-hoc guards across three fields | `scattered-validation` |
| `POST /action` | four-way `if/elseif` chain on `$_POST['op']` | `string-dispatch` |
| `GET /search` | reflected echo of `$_GET['q']` without `htmlspecialchars` | `unescaped-output` |
| `GET /lookup` | `query_all("... " . $id)` — dynamic SQL + request input | `raw-sql-concat` |

`index.php` + `lib/db.php` + `schema.sql` let `scripts/drive-tiny-n1.mjs` capture
an oracle corpus for CI (`rewrite --traces traces/tiny-n1-ci`). The fixture is
still **not** a full production app — it exists so `chrysalis insight` and
`chrysalis rewrite` produce predictable, non-empty output for tests and CI.
