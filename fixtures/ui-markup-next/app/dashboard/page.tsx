"use client";

import { useState } from "react";
import "./page.module.css";

export default function DashboardPage() {
  const [showFilters, setShowFilters] = useState(false);
  const showUpgradeModal = false;
  return (
    <main className="dashboard-page">
      <header className="dash-bar">
        <h1>Next Dashboard</h1>
        <button type="button" onClick={() => setShowFilters(true)}>
          Filters
        </button>
      </header>
      {showFilters && (
        <aside className="filters-panel">
          <h2>Filters</h2>
          <button type="button" onClick={() => setShowFilters(false)}>
            Close
          </button>
        </aside>
      )}
      {showUpgradeModal && (
        <div className="modal-panel">
          <p>Upgrade plan</p>
        </div>
      )}
    </main>
  );
}
