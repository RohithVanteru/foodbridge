import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodBridge — Share food. Strengthen community.",
  description: "Connect safe surplus food with nearby old-age homes and orphanages for same-day collection.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
