import { Inter } from "next/font/google";

export const loginFont = Inter({ subsets: ["latin"] });

export default function LoginLoading() {
  return <p className="loading">Loading login…</p>;
}
