import { Hono } from "hono";
import { chrysalisDeterminismMiddleware } from "./ctx.js";
import { sqlTapeMiddleware } from "./db.js";
import { sessionMiddleware } from "./session.js";

import { posts_list } from "./handlers/posts_list.js";
import { posts_view } from "./handlers/posts_view.js";
import { login } from "./handlers/login.js";
import { posts_create } from "./handlers/posts_create.js";
import { comments_create } from "./handlers/comments_create.js";

function registerRoutes(app: import("hono").Hono): void {
  app.get("/posts", posts_list);
  app.get("/posts/:id", posts_view);
  app.post("/login", login);
  app.post("/posts", posts_create);
  app.post("/posts/:id/comments", comments_create);
  app.get("/login", (_c) => new Response(null, { status: 405, headers: { Allow: "POST" } }));
  app.get("/posts/:id/comments", (_c) => new Response(null, { status: 405, headers: { Allow: "POST" } }));
}

export const app = new Hono();
app.use("*", sqlTapeMiddleware);
app.use("*", chrysalisDeterminismMiddleware());
app.use("*", sessionMiddleware());

registerRoutes(app);

/**
 * In-process corpus replay: build Request in this module next to app so Hono
 * always sees a Request with a populated url (avoids tsx / loader edge cases).
 */
export async function chrysalisInProcessFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return app.fetch(new Request(url, init ?? {}));
}
