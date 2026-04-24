import type { Context } from "hono";
import { getCookie } from "hono/cookie";
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
 * @chrysalis-effects db.read:comments, db.read:posts, db.read:users
 * @chrysalis-shape html
 * @chrysalis-holes 0
 */
export async function posts_view(c: Context): Promise<Response> {
  let __html = "";
  let __status = 200;
  let post = queryOne("SELECT p.id, p.title, p.body, p.created_at, u.username AS author\r\n       FROM posts p JOIN users u ON u.id = p.author_id\r\n      WHERE p.id = ? AND p.status = 'published'", [c.req.param("id")]);
  if ((post === null)) {
    __status = 404;
    __html += String("Post not found");
    return __respond(c, __html, __status);
  }
  let comments = queryAll("SELECT c.id, c.body, c.created_at, u.username AS author\r\n       FROM comments c JOIN users u ON u.id = c.author_id\r\n      WHERE c.post_id = ?\r\n      ORDER BY c.created_at ASC", [c.req.param("id")]);
  __html += String("<!doctype html>\r\n<html>\r\n<head><title>");
  __html += String(escapeHtml((post as any).title));
  __html += String("</title></head>\r\n<body>\r\n  <h1>");
  __html += String(escapeHtml((post as any).title));
  __html += String("</h1>\r\n  <p><em>by ");
  __html += String(escapeHtml((post as any).author));
  __html += String(" on ");
  __html += String(escapeHtml((post as any).created_at));
  __html += String("</em></p>\r\n  <div>");
  __html += String(nl2br(escapeHtml((post as any).body)));
  __html += String("</div>\r\n\r\n  <h2>Comments</h2>\r\n  ");
  if (empty(comments)) {
    __html += String("    <p>No comments yet.</p>\r\n  ");
  } else {
    __html += String("    <ul>\r\n      ");
    for (const c of (comments ?? []) as any[]) {
      __html += String("        <li>\r\n          <strong>");
      __html += String(escapeHtml((c as any).author));
      __html += String("</strong>\r\n          (");
      __html += String(escapeHtml((c as any).created_at));
      __html += String("):\r\n          ");
      __html += String(escapeHtml((c as any).body));
      __html += String("        </li>\r\n      ");
    }
    __html += String("    </ul>\r\n  ");
  }
  __html += String("\r\n  ");
  if ((currentUser(c) !== null)) {
    __html += String("    <form method=\"post\" action=\"/posts/");
    __html += String(intval((post as any).id));
    __html += String("/comments\">\r\n      <textarea name=\"body\" required></textarea>\r\n      <button type=\"submit\">Comment</button>\r\n    </form>\r\n  ");
  } else {
    __html += String("    <p><a href=\"/login\">Log in</a> to comment.</p>\r\n  ");
  }
  __html += String("</body>\r\n</html>\r\n");
  return __respond(c, __html, __status);
}
