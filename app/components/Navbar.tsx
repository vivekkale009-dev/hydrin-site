// components/Navbar.tsx
"use client";
import React from "react";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container">
        <div className="brand">OxyHydra</div>
        <nav className="nav-actions" aria-label="Primary">
          <a className="btn btn-ghost" href="/purity-check">Purity Check</a>
          <a className="btn btn-primary" href="#learn">Learn More</a>
        </nav>
      </div>
    </header>
  );
}
