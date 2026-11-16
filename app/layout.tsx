import type { Metadata } from "next";
import { Fustat, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fustat = Fustat({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-fustat" });

export const metadata: Metadata = {
  title: "A raw-SQL baseline for storefront-tour (unofficial)",
  description:
    "Publisher's own storefront-tour eval, run through MCP and against the raw files, with the two answers the package guide talks the agent out of.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fustat.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
