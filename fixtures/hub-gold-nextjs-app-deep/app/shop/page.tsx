export default function Shop() {
  const visible = true;
  return (
    <main>
      <h1>Shop</h1>
      {visible ? <p>Visible</p> : <p>Hidden</p>}
    </main>
  );
}
