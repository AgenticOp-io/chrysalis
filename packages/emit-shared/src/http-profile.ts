/**
 * Framework-specific fragments for emitting handler bodies from WebIR.
 * Keeps `emit-tree` free of hard-coded Hono `c.*` calls.
 */

import { stringLit } from "./ts-util.js";

export type HttpEmitFrameworkId = "hono" | "fastify";

export interface HttpEmitProfile {
  readonly id: HttpEmitFrameworkId;
  readonly requestVar: string;
  readonly replyVar: string;
  sessionGetter(): string;
  query(name: string): string;
  pathParam(name: string): string;
  cookie(name: string): string;
  header(name: string): string;
  /** Full statement(s) including `const __body = ...` when the handler reads POST fields. */
  bodyPreamble(): string;
  /** `return ...` statement for redirects (includes Location: strip). */
  redirectReturn(locExpr: string): string;
  /** `return __respond(...)` for buffered HTML + status epilogue / early exit. */
  respondBuffered(): string;
  requireLogin(): string;
  currentUser(): string;
}

const c = "c";
const req = "req";
const reply = "reply";

export const honoHttpProfile: HttpEmitProfile = {
  id: "hono",
  requestVar: c,
  replyVar: c,
  sessionGetter: () => `getSession(${c})`,
  query: (name) => `${c}.req.query(${stringLit(name)})`,
  pathParam: (name) => `${c}.req.param(${stringLit(name)})`,
  cookie: (name) => `getCookie(${c}, ${stringLit(name)})`,
  header: (name) => `${c}.req.header(${stringLit(name)})`,
  bodyPreamble: () =>
    `const __body = await ${c}.req.parseBody().catch(() => ({} as Record<string, unknown>));`,
  redirectReturn: (locExpr) =>
    `return ${c}.redirect(String(${locExpr}).replace(/^\\s*Location:\\s*/i, ""));`,
  respondBuffered: () => `return __respond(${c}, __html, __status);`,
  requireLogin: () => `requireLogin(${c})`,
  currentUser: () => `currentUser(${c})`,
};

export const fastifyHttpProfile: HttpEmitProfile = {
  id: "fastify",
  requestVar: req,
  replyVar: reply,
  sessionGetter: () => `getSession(${req})`,
  query: (name) =>
    `((${req}.query as Record<string, unknown>)[${stringLit(name)}] ?? null)`,
  pathParam: (name) =>
    `((${req}.params as Record<string, unknown>)[${stringLit(name)}] ?? null)`,
  cookie: (name) =>
    `((${req}.cookies as Record<string, string | undefined> | undefined)?.[${stringLit(name)}] ?? null)`,
  header: (name) => {
    const k = name.toLowerCase();
    return `((${req}.headers as Record<string, string | string[] | undefined>)[${stringLit(k)}] ?? null)`;
  },
  bodyPreamble: () =>
    `const __body = (typeof ${req}.body === "object" && ${req}.body !== null && !Array.isArray(${req}.body) ? ${req}.body : {}) as Record<string, unknown>;`,
  redirectReturn: (locExpr) =>
    `return ${reply}.redirect(String(${locExpr}).replace(/^\\s*Location:\\s*/i, ""));`,
  respondBuffered: () => `return __respond(${reply}, __html, __status);`,
  requireLogin: () => `requireLogin(${req}, ${reply})`,
  currentUser: () => `currentUser(${req})`,
};
