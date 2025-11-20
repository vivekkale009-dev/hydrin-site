// components/Features.tsx
import React from "react";

export default function Features() {
  return (
    <section className="features container">
      <h2 id="learn" style={{ color: "#f8fbff", fontSize: 28, margin: 0 }}>Purity & Craft</h2>
      <p style={{ color: "rgba(230,240,255,0.8)", marginTop: 8 }}>
        Carefully sourced and rigorously tested. Scan a batch QR, verify lab results — transparency you can trust.
      </p>

      <div className="feature-grid">
        <div className="feature">
          <h3 style={{ marginTop: 0 }}>Verified Purity</h3>
          <p style={{ marginBottom: 0 }}>
            Each batch is analyzed — mineral profile, TDS, pH. Results open to scan and verify instantly.
          </p>
        </div>
        <div className="feature">
          <h3 style={{ marginTop: 0 }}>Sustainable Packaging</h3>
          <p style={{ marginBottom: 0 }}>
            Thoughtful packaging that emphasizes minimalism and recyclability without compromising style.
          </p>
        </div>
        <div className="feature">
          <h3 style={{ marginTop: 0 }}>Premium Taste</h3>
          <p style={{ marginBottom: 0 }}>
            Balanced mineral composition — crisp, clean, and consistent in every pour.
          </p>
        </div>
      </div>
    </section>
  );
}
