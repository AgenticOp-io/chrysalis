# Chrysalis Web Language (CWL)

CWL is the **consolidated web language** of the Chrysalis Translation Hub: a small, explicit syntax that maps **1:1** to **WebIR** and encodes the intersection of route/handler semantics learned from PHP, JavaScript, TypeScript, Python, Java, Go, Ruby, C#, Rust, Kotlin, Scala, Swift, and contract-first APIs.

Use CWL when you want:

- A **canonical reference** for what “supported” means across all hub paths
- **Zero-loss ingest** (no regex/AST lift) for greenfield routes
- **Round-trip** authoring: CWL → WebIR → CWL, or CWL → Hono/Fastify with gold verify

---

## File extension

`.cwl` — typically `routes.cwl` or `src/routes.cwl`.

---

## Module

```cwl
module my_app;
```

Declares the module name stored in WebIR provenance.

### Module middleware (`use` presets)

See **`docs/CWL-RFC-0001-module-use-middleware.md`**.

```cwl
module api;
use json;
use urlencoded;
```

| Directive | WebIR preset |
| --- | --- |
| `use json;` | `express.json` body parser |
| `use urlencoded;` | `express.urlencoded` form parser |

### Path parameters

See **`docs/CWL-RFC-0002-path-parameters.md`**.

```cwl
@route GET "/items/:id"
handler item_show {
  effects: none;
  param id;
  return { ok: true, id: id };
}
```

---

## Route declaration

```cwl
@route GET "/health"
handler health {
  effects: none;
  return true;
}
```

| Part | Meaning |
| --- | --- |
| `@route METHOD "path"` | HTTP method + path template (WebIR `web.request.route`) |
| `handler name { ... }` | Named handler body |
| `effects:` | Declared effect list (metadata; full WebIR effect edges evolve with ingest) |
| `return` | Literal response value lowered to WebIR |
| `hole reason` | Explicit unsupported region (typed hole in IR) |

### Supported methods

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`

### Return forms

| Form | Example |
| --- | --- |
| Boolean | `return true;` |
| Integer | `return 42;` |
| String | `return "ok";` |
| Object | `return { ok: true, version: 1 };` |

Object keys must be identifiers; values must be literals (same policy as hub literal gold).

### Hole form

```cwl
@route POST "/legacy"
handler legacy_post {
  effects: io, db;
  hole legacy:invoice_create "delegate to PHP stack";
}
```

---

## Effects

`effects: none;` or comma-separated names: `io`, `db`, `session`, `mail`, etc.

Today, effects are **declarative** in CWL and recorded in handler metadata; Chrysalis core effect typing on handlers continues to deepen in `@chrysalis/ingest` for PHP and hub lifts for other origins.

---

## Pipeline

| Step | Tool |
| --- | --- |
| CWL → WebIR | `lift-to-webir.mjs --language cwl` or `cwl-ingest.mjs` |
| WebIR → Hono | `emit-from-hub.mjs --origin cwl --target hono` |
| WebIR → CWL | `emit-cwl-from-hub.mjs` |
| Gold verify | `hub-gold-verify.mjs` suite `cwl-gold-hono` |

---

## Hub matrix

| Pair | Grade (typical) |
| --- | --- |
| cwl → hono / fastify / typescript | **gold** (structural + trace replay) |
| cwl → cwl | **gold** (round-trip) |
| any → cwl | **silver** (projection; holes from source lift preserved) |
| cwl → python, java, … | **silver** / **open** (native emit as for other origins) |

---

## Relation to other languages

CWL is **not** a competitor to TypeScript or Python. It is the **IR surface language**:

| Legacy language | Path to CWL |
| --- | --- |
| PHP | ingest → WebIR → emit-cwl (holes explicit) |
| JavaScript | AST lift → WebIR → emit-cwl |
| Python | AST lift → WebIR → emit-cwl |
| OpenAPI/HAR | contract compose → WebIR → emit-cwl |

See **`docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`** for the full 575-pair map.

---

## Grammar (informal EBNF)

```text
module     ::= "module" IDENT ";"
route      ::= "@route" METHOD STRING
handler    ::= "handler" IDENT "{" stmt* "}"
stmt       ::= effects | return | hole
effects    ::= "effects:" effectList ";"
effectList ::= "none" | IDENT ("," IDENT)*
return     ::= "return" literal ";"
hole       ::= "hole" HOLE_ID STRING? ";"
literal    ::= bool | number | string | object
```

---

## Design principles (aligned with DESIGN.md)

1. **WebIR spine** — CWL is syntax for WebIR, not a parallel IR.
2. **Holes, not guesses** — use `hole`, never silent stubs.
3. **Injected ctx** — emitted TS uses `ctx.*`, not ambient nondeterminism.
4. **Oracle = spec + replay** — gold CWL routes use `hub-gold-verify` + `hub-gold-trace-replay`.

---

## Examples

Full gold fixture: `fixtures/hub-gold-cwl/routes.cwl`
