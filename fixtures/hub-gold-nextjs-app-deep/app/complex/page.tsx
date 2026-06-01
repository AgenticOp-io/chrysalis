export default function Complex() {
  const dynamic = 1;
  return (
    <main>
      <h1>Complex</h1>
      {dynamic > 0 ? <p>Dynamic</p> : <p>Hidden</p>}
    </main>
  );
}
