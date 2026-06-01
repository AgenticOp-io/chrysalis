export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams?.q ?? "";
  return (
    <main>
      <h1>Search</h1>
      <p>q: {q}</p>
    </main>
  );
}
