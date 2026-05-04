import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { Post } from "../domain.js";
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
  microtimeString,
  pregMatch,
  parseUrlComponent,
  parseUrlParts,
  passwordVerify,
  __hole,
  __respond,
} from "../runtime.js";

/**
 * @chrysalis-provenance "pages/posts_create.php"
 * @chrysalis-effects db.read:users, db.write:posts, session.read
 * @chrysalis-shape mixed
 * @chrysalis-holes 0
 */
export async function posts_create(c: Context): Promise<Response> {
  const __ct = String(c.req.header("content-type") ?? "").toLowerCase();
  const __body =
    __ct.includes("application/x-www-form-urlencoded") || __ct.includes("multipart/form-data")
      ? await c.req.parseBody().catch(() => ({} as Record<string, unknown>))
      : ({} as Record<string, unknown>);
  let __html = "";
  let __status = 200;
  let me = requireLogin(c);
  let title = ((isset((__body["title"] ?? null))) ? (trim((__body["title"] ?? null))) : (""));
  let body = ((isset((__body["body"] ?? null))) ? (trim((__body["body"] ?? null))) : (""));
  if (((title === "") || (body === ""))) {
    __status = 400;
    __html += String("Title and body required");
    return __respond(c, __html, __status);
  }
  let id = execSql("INSERT INTO posts (author_id, title, body) VALUES (?, ?, ?)", [(me as any).id, title, body]);
  return c.redirect(String((String("Location: /posts/") + String(id))).replace(/^\s*Location:\s*/i, ""));
  return __respond(c, __html, __status);
}
