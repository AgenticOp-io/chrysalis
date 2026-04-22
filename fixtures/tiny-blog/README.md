# fixtures/tiny-blog

The Milestone 1 target app. A deliberately small, deliberately old-school PHP
blog with **no framework**, **procedural style**, **mixed HTML+PHP**, and a
handful of idioms that exercise most of what a converter must handle:
sessions, form POSTs, SQL with parameters, auth checks, redirects, and a
mixed template/controller file layout.

## Endpoints

| Method | Path                       | File                          |
| ------ | -------------------------- | ----------------------------- |
| GET    | `/posts`                   | `pages/posts_list.php`        |
| GET    | `/posts/:id`               | `pages/posts_view.php`        |
| POST   | `/login`                   | `pages/login.php`             |
| POST   | `/posts`                   | `pages/posts_create.php`      |
| POST   | `/posts/:id/comments`      | `pages/comments_create.php`   |

`index.php` is a tiny dispatcher; it's typical of pre-framework PHP apps and
is exactly what Chrysalis must learn to read.

## Schema

`schema.sql` defines `users`, `posts`, `comments` against SQLite (the default
for fixture runs) and MySQL (via a variant). Chrysalis's archaeology pass
will reconstruct types from this file, the form fields in the PHP templates,
and the trace corpus captured by the oracle.

## How to run (once Milestone 1 tooling exists)

```bash
# 1. Start the legacy app
php -S 127.0.0.1:8000 -t fixtures/tiny-blog

# 2. Start the oracle sidecar in front of it
chrysalis observe --upstream http://127.0.0.1:8000 --listen :8080 --out ./traces

# 3. Exercise the app through the sidecar (browser or curl) to build a corpus

# 4. Run the pipeline
chrysalis ingest --source fixtures/tiny-blog --out .chrysalis/ir
chrysalis archaeology --db fixtures/tiny-blog/blog.sqlite --corpus ./traces --out .chrysalis/schema
chrysalis emit --target=hono --out ./generated
chrysalis verify --project ./generated --corpus ./traces
chrysalis status
```

## Do not "modernize" this fixture

It is deliberately ugly. Its value is that it looks like the real-world legacy
code Chrysalis exists to migrate. Resist the urge to refactor it.
