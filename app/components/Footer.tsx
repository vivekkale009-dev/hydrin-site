// components/Footer.tsx
import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#fff" }}>Hydrin</div>
          <div style={{ fontSize: 13, color: "rgba(230,240,255,0.65)" }}>© {new Date().getFullYear()} Hydrin — All rights reserved</div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <a className="btn btn-ghost" href="/privacy">Privacy</a>
          <a className="btn btn-ghost" href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}
