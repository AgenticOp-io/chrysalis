/** Async RSC page — G9928 / D6420 Next depth (named RSC + interp holes). */
import "./page.module.css";

export default async function DashboardPage() {
  const title = "Next Dashboard";
  return (
    <main className="dashboard-page">
      <h1>{title}</h1>
      <p>Server component shell</p>
    </main>
  );
}
