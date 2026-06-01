/** @type {import("./$types").PageServerLoad} */
export function load({ url }) {
  return { q: url.searchParams.get("q") ?? "", source: "search" };
}
