import { json } from "@sveltejs/kit";

/** @type {import("./$types").RequestHandler} */
export function GET() {
  return json({ service: "hub-gold-svelte-structured", version: 1 });
}
