import "./globals.css";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`next-root ${geist.className}`}>{children}</body>
    </html>
  );
}
