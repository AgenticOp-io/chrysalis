import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { Comment, Post } from "../domain.js";
import { queryAll, queryOne, execSql, db } from "../db.js";
import { getSession } from "../session.js";
import {
  escapeHtml,
  nl2br,
  currentUser,
  requireLogin,
  isset,
  empty,
  trim,
  intval,
  strlen,
  pregMatch,
  passwordVerify,
  __hole,
  __respond,
} from "../runtime.js";

/**
 * @chrysalis-effects db.read:posts, db.write:comments
 * @chrysalis-shape mixed
 * @chrysalis-holes 0
 */
export async function comments_create(c: Context): Promise<Response> {
  const __body = await c.req.parseBody().catch(() => ({} as Record<string, unknown>));
  let __html = "";
  let __status = 200;
  let me = requireLogin(c);
  let body = ((isset((__body["body"] ?? null))) ? (trim((__body["body"] ?? null))) : (""));
  if ((body === "")) {
    __status = 400;
    __html += String("Comment body required");
    return __respond(c, __html, __status);
  }
  let post = queryOne<Post>("SELECT id FROM posts WHERE id = ? AND status = 'published'", [c.req.param("id")]);
  if ((post === null)) {
    __status = 404;
    __html += String("Post not found");
    return __respond(c, __html, __status);
  }
  execSql("INSERT INTO comments (post_id, author_id, body) VALUES (?, ?, ?)", [c.req.param("id"), (me as any).id, body]);
  return c.redirect(String((String("Location: /posts/") + String(c.req.param("id")))).replace(/^\s*Location:\s*/i, ""));
  return __respond(c, __html, __status);
}
