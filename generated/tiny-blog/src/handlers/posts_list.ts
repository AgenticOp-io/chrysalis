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
  microtimeString,
  pregMatch,
  parseUrlComponent,
  parseUrlParts,
  passwordVerify,
  __hole,
  __respond,
} from "../runtime.js";

/**
 * @chrysalis-provenance "pages/posts_list.php"
 * @chrysalis-effects db.read:posts, db.read:users
 * @chrysalis-shape html
 * @chrysalis-holes 0
 */
export async function posts_list(c: Context): Promise<Response> {
  let __html = "";
  let __status = 200;
  let posts = queryAll("SELECT p.id, p.title, p.created_at, u.username AS author\r\n       FROM posts p JOIN users u ON u.id = p.author_id\r\n      WHERE p.status = 'published'\r\n      ORDER BY p.created_at DESC\r\n      LIMIT 50", []);
  __html += String("<!doctype html>\r\n<html>\r\n<head><title>tiny-blog</title></head>\r\n<body>\r\n  <h1>Posts</h1>\r\n  <ul>\r\n    ");
  for (const p of (posts ?? []) as any[]) {
    __html += String("      <li>\r\n        <a href=\"/posts/");
    __html += String(intval((p as any).id));
    __html += String("\">");
    __html += String(escapeHtml((p as any).title));
    __html += String("</a>\r\n        by ");
    __html += String(escapeHtml((p as any).author));
    __html += String("        on ");
    __html += String(escapeHtml((p as any).created_at));
    __html += String("      </li>\r\n    ");
  }
  __html += String("  </ul>\r\n</body>\r\n</html>\r\n");
  return __respond(c, __html, __status);
}
