export function load({ params }: { params: { slug: string } }) {
  return { slug: params.slug, source: "page-server" };
}
