import { Hono } from "hono";
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
}

export const app = new Hono();
app.use("*", sessionMiddleware());

registerRoutes(app);
