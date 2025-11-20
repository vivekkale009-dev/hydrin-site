// app/layout.tsx
import "./globals.css";
import React from "react";

export const metadata = {
  title: "OXYHYDRA - Hydration, Elevated",
  description: "OxyHydra — premium bottled water. Purity Check & Learn More.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google font */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
  <script src="/parallax.js"></script>
  {children}
</body>
    </html>
  );
}
