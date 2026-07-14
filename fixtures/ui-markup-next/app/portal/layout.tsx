import "./portal-shell.css";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-region">{children}</div>;
}
