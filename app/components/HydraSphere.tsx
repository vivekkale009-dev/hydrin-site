"use client";
import React from "react";

export default function HydraSphere() {
  const sectionStyle: React.CSSProperties = {
    width: "85%",
    backgroundColor: "#ffffff",
    padding: "80px 8%",
  };
  
  

  const containerStyle: React.CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "40px",
    textAlign: "center",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: "18px",
    padding: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: "1.3rem",
    fontWeight: 600,
    color: "#1d4ed8",
    marginBottom: "10px",
  };

  const cardTextStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: "#4b5563",
    lineHeight: 1.5,
  };

  // Simple hover effect via inline onMouseEnter / onMouseLeave
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(-4px)";
    e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.12)";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
  };

  return (
    <section style={sectionStyle} id="hydrasphere">
      <div style={containerStyle}>
        <h2 style={titleStyle}>HydraSphere</h2>

        <div style={gridStyle}>
          {/* Hydra Stories */}
          <a href="/hydrasphere/stories" style={{ textDecoration: "none" }}>
            <div
              style={cardStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <h3 style={cardTitleStyle}>Hydra Stories</h3>
              <p style={cardTextStyle}>
                Inspiring hydration journeys, community stories & real
                experiences with OxyHydra.
              </p>
            </div>
          </a>

          {/* Brand Updates */}
          <a href="/hydrasphere/updates" style={{ textDecoration: "none" }}>
            <div
              style={cardStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <h3 style={cardTitleStyle}>Brand Updates</h3>
              <p style={cardTextStyle}>
                Official announcements, new product launches & important brand
                milestones.
              </p>
            </div>
          </a>

          {/* Sustainability Pulse */}
          <a
            href="/hydrasphere/sustainability"
            style={{ textDecoration: "none" }}
          >
            <div
              style={cardStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <h3 style={cardTitleStyle}>Sustainability Pulse</h3>
              <p style={cardTextStyle}>
                Water conservation efforts, recycling initiatives & responsible
                hydration practices.
              </p>
            </div>
          </a>

          {/* Events & Highlights */}
          <a href="/hydrasphere/events" style={{ textDecoration: "none" }}>
            <div
              style={cardStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <h3 style={cardTitleStyle}>Events & Highlights</h3>
              <p style={cardTextStyle}>
                Brand events, social drives & key on-ground activities by
                OxyHydra.
              </p>
            </div>
          </a>

          {/* HydraWell Blog */}
          <a
            href="/hydrasphere/hydrawell"
            style={{ textDecoration: "none" }}
          >
            <div
              style={cardStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <h3 style={cardTitleStyle}>HydraWell (Hydration Blog)</h3>
              <p style={cardTextStyle}>
                Hydration benefits, science of water in the human body &
                OxyHydra-focused wellness content.
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
