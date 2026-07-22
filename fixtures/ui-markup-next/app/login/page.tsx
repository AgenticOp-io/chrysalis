"use client";

import "./page.module.css";

function StatusChip({ label }: { label: string }) {
  return <span className="chip">{label}</span>;
}

function UpgradeModal({ open }: { open: boolean }) {
  if (!open) return null;
  return <div className="modal">Upgrade</div>;
}

export default function LoginPage() {
  const title = "Next Sign in";
  const showUpgradeModal = false;
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{title}</h1>
        <StatusChip label="demo" />
        {showUpgradeModal && (
          <div className="modal-panel">
            <p>Upgrade plan</p>
          </div>
        )}
        <UpgradeModal open={showUpgradeModal} />
        <button type="button">Continue</button>
      </div>
    </main>
  );
}
