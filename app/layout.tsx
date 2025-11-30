// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import ChatWidget from "./components/ChatWidget";

export const metadata: Metadata = {
  title: "OxyHydra",
  description: "OxyHydra – smart packaged drinking water with live purity check.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Floating chat widget (water drop) on every page */}
        <ChatWidget />
      </body>
    </html>
  );
}
