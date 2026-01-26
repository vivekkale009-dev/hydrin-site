// app/layout.tsx
import "./globals.css";
import "./homepage.css"; // Added to ensure the floating button style is loaded
import type { Metadata } from "next";
import ChatWidget from "./components/ChatWidget";
import AdminAuthWrapper from "./components/AdminAuthWrapper"; // Keep logic in a separate component to prevent breaking SSR

export const metadata: Metadata = {
  title: "Earthy Source | Pure Vitality",
  description: "Sai Sanjivani / Aqion – smart packaged drinking water with live purity check. Grounded in nature, verified by tech.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ scrollBehavior: 'smooth' }}>
      <head>
        {/* Importing a clean, premium font pair */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ 
        margin: 0, 
        fontFamily: "'Plus Jakarta Sans', sans-serif", 
        background: "#fcfdfd", // A very slight "water" tinted white
        color: "#1a2e2a", // Deep forest charcoal
        WebkitFontSmoothing: "antialiased"
      }}>
        {/* Main Content */}
        <div style={{ position: "relative", minHeight: "100vh" }}>
          {children}
        </div>

        {/* Floating chat widget */}
        <ChatWidget />

        {/* Admin Dashboard Button (Only shows if logged in) */}
        <AdminAuthWrapper />
        
        {/* Subtle Background Accent for Earthy feel */}
        <div style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: "40vw",
          height: "40vw",
          background: "radial-gradient(circle, rgba(22, 163, 74, 0.05) 0%, rgba(255,255,255,0) 70%)",
          zIndex: -1,
          pointerEvents: "none"
        }} />
      </body>
    </html>
  );
}