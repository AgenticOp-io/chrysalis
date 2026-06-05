/** Hub matrix smoke: minimal SvelteKit API route */
export function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
