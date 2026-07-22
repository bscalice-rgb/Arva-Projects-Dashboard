import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arva Scope-3 Projects Dashboard",
  description:
    "Manage Channel Partners, growers, enrollment pipeline, supply sheds and program outcomes for Arva's Scope-3 regenerative-agriculture carbon programs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
