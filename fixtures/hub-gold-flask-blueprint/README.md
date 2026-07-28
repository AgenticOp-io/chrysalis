# hub-gold-flask-blueprint

Gold fixture for **Flask Blueprint** as a Python secondary peel (secondary to Flask
`hub-flagship-python` D6448-ST). Same-file `Blueprint('name', …, url_prefix=…)` +
`@bp.get|post|route|…` with **literal** `url_prefix` join. Cross-file Blueprint modules
remain honest holes (**D6447** — no invent).

## Contents

- `app.py` — 20 Blueprint routes mirroring Flask flagship shapes under `/api` prefix.

## Smoke

```bash
pnpm run hub:flask-blueprint-smoke
```

See `fixtures/ci/flask-blueprint-honest-holes.json`. DESIGN **D6532** / **G10070**.
