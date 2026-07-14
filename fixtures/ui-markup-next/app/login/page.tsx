"use client";

import "./page.module.css";

function StatusChip({ label }: { label: string }) {
  return <span className="chip">{label}</span>;
}

export default function LoginPage() {
  const title = "Next Sign in";
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{title}</h1>
        <StatusChip label="demo" />
        <button type="button">Continue</button>
      </div>
    </main>
  );
}
