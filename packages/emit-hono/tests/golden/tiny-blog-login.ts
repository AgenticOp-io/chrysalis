import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { User } from "../domain.js";
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
  parseUrlComponent,
  passwordVerify,
  __hole,
  __respond,
} from "../runtime.js";

/**
 * @chrysalis-effects db.read:users, session.write
 * @chrysalis-shape mixed
 * @chrysalis-holes 0
 */
export async function login(c: Context): Promise<Response> {
  const __body = await c.req.parseBody().catch(() => ({} as Record<string, unknown>));
  let __html = "";
  let __status = 200;
  let username = ((isset((__body["username"] ?? null))) ? (trim((__body["username"] ?? null))) : (""));
  let password = ((isset((__body["password"] ?? null))) ? (String((__body["password"] ?? null))) : (""));
  if (((username === "") || (password === ""))) {
    __status = 400;
    __html += String("Missing credentials");
    return __respond(c, __html, __status);
  }
  let user = queryOne<User>("SELECT id, password FROM users WHERE username = ?", [username]);
  if (((user === null) || (!(await passwordVerify(password, (user as any).password))))) {
    __status = 401;
    __html += String("Invalid credentials");
    return __respond(c, __html, __status);
  }
  getSession(c).set("user_id", intval((user as any).id));
  return c.redirect(String("Location: /posts").replace(/^\s*Location:\s*/i, ""));
  return __respond(c, __html, __status);
}
