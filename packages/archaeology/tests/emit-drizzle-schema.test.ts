import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { emitDrizzleSchema, mergeSchema, parseSchema } from "../src/index.js";

const TINY_BLOG_SCHEMA = resolve(__dirname, "../../../fixtures/tiny-blog/schema.sql");

describe("emitDrizzleSchema", () => {
  test("emits sqliteTable definitions aligned with DDL", () => {
    const ddl = parseSchema(readFileSync(TINY_BLOG_SCHEMA, "utf8"), TINY_BLOG_SCHEMA);
    const report = mergeSchema(ddl, { byTable: new Map(), orphan: [] });
    const src = emitDrizzleSchema(report);
    expect(src).toMatch(/import \{ integer, sqliteTable, text \} from "drizzle-orm\/sqlite-core"/);
    expect(src).toContain('export const users = sqliteTable("users"');
    expect(src).toContain("username:");
    expect(src).toContain('export const posts = sqliteTable("posts"');
    expect(src).toContain('export const comments = sqliteTable("comments"');
  });
});
