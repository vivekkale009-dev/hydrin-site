import "./globals.css";
import "./homepage.css"; 
import type { Metadata } from "next";
import ChatWidget from "./components/ChatWidget";
import AdminAuthWrapper from "./components/AdminAuthWrapper"; 
import 'leaflet/dist/leaflet.css';

// --- SINGLE METADATA BLOCK ---
export const metadata: Metadata = {
  title: "Earthy Source | Pure Vitality",
  description: "Intelligence in every drop. Grounded in nature, verified by tech.",
  metadataBase: new URL('https://earthysource.in'), 
  icons: {
    icon: "/favicon.ico", 
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Earthy Source | Pure Vitality",
    description: "Intelligence in every drop. Grounded in nature, verified by tech.",
    url: 'https://earthysource.in',
    siteName: 'Earthy Source',
    images: [
      {
        url: '/opengraph-image.png', 
        width: 1200,
        height: 630,
        alt: 'Earthy Source - Pure Hydration',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ scrollBehavior: 'smooth' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ 
        margin: 0, 
        fontFamily: "'Plus Jakarta Sans', sans-serif", 
        background: "#fcfdfd", 
        color: "#1a2e2a", 
        WebkitFontSmoothing: "antialiased"
      }}>
        <div style={{ position: "relative", minHeight: "100vh" }}>
          {children}
        </div>

        <ChatWidget />
        <AdminAuthWrapper />
        
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