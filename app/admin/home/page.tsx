
"use client";

import Link from "next/link";

const quickLinks = [
  {
    title: "Create Order",
    description: "Create a new customer or distributor order.",
    href: "/admin/orders/create",
    icon: "＋",
    category: "ORDERS",
  },
  {
    title: "View Orders",
    description: "Review orders, payments, and delivery progress.",
    href: "/admin/orders",
    icon: "▤",
    category: "ORDERS",
  },
  {
    title: "Distributors",
    description: "Manage distributors and view their orders.",
    href: "/admin/distributors",
    icon: "♧",
    category: "NETWORK",
  },
  {
    title: "HR Management",
    description: "Access employee records and HR operations.",
    href: "/admin/hr/dashboard",
    icon: "♙",
    category: "PEOPLE",
  },
  {
    title: "Employee Attendance",
    description: "Review and manage daily attendance.",
    href: "/admin/hr/attendance",
    icon: "▦",
    category: "PEOPLE",
  },
  {
    title: "Employee Advances",
    description: "Manage employee advances and payments.",
    href: "/admin/hr/advances",
    icon: "₹",
    category: "PEOPLE",
  },
  {
    title: "Inventory Management",
    description: "Access stock and inventory operations.",
    href: "/admin/inventory",
    icon: "▥",
    category: "OPERATIONS",
  },
  {
    title: "Scan Dashboard",
    description: "Open scan insights and your existing analytics.",
    href: "/admin/scan-dashboard",
    icon: "⌁",
    category: "ANALYTICS",
  },
];

export default function AdminHomePage() {
  return (
    <main className="es-admin-home">
      {/* Top brand bar */}
      <header className="es-home-topbar">
        <Link href="/admin/home" className="es-home-brand">
          <span className="es-home-brand-symbol">E</span>
          <span className="es-home-brand-copy">
            <strong>EARTHY SOURCE</strong>
            <small>ADMIN WORKSPACE</small>
          </span>
        </Link>

        <div className="es-home-status">
          <span className="es-home-status-dot" />
          Operations Workspace
        </div>
      </header>

      {/* Hero */}
      <section className="es-home-hero">
        <div className="es-home-hero-content">
          <div className="es-home-eyebrow">
            <span className="es-home-eyebrow-line" />
            YOUR BUSINESS. ONE WORKSPACE.
          </div>

          <h1 className="es-home-title">
            Good to have
            <br />
            you <span>here.</span>
          </h1>

          <p className="es-home-description">
            Everything you need to keep Earthy Source moving forward.
            Manage orders, empower your team, support your distributors,
            and stay in control of daily operations.
          </p>

          <div className="es-home-hero-actions">
            <Link
              href="/admin/orders/create"
              className="es-home-primary"
            >
              <span className="es-home-primary-plus">＋</span>
              Create New Order
              <span className="es-home-primary-arrow">↗</span>
            </Link>

            <Link
              href="/admin/scan-dashboard"
              className="es-home-secondary"
            >
              Explore Scan Dashboard
              <span>→</span>
            </Link>
          </div>

          <div className="es-home-hero-note">
            <span className="es-home-note-star">✳</span>
            Built around quality, purity and progress.
          </div>
        </div>

        {/* Decorative brand artwork; no external image required */}
        <div className="es-home-art" aria-hidden="true">
          <div className="es-home-art-ring es-home-art-ring-one" />
          <div className="es-home-art-ring es-home-art-ring-two" />
          <div className="es-home-art-orb">
            <div className="es-home-art-leaf">✦</div>
            <div className="es-home-art-wordmark">ES</div>
            <div className="es-home-art-caption">PURE BY NATURE</div>
          </div>
          <div className="es-home-art-label es-home-art-label-top">
            <span>✳</span> QUALITY FIRST
          </div>
          <div className="es-home-art-label es-home-art-label-bottom">
            EARTHY SOURCE <span>◆</span>
          </div>
        </div>

        <div className="es-home-hero-decoration" aria-hidden="true">
          ES
        </div>
      </section>

      {/* Quick actions */}
      <section className="es-home-section">
        <div className="es-home-section-heading">
          <div>
            <div className="es-home-section-eyebrow">
              YOUR DAILY CONTROL CENTRE
            </div>
            <h2>Where would you like to go?</h2>
            <p>
              Choose a workspace to get things done quickly.
            </p>
          </div>

          <div className="es-home-count">
            <strong>08</strong>
            <span>QUICK ACTIONS</span>
          </div>
        </div>

        <div className="es-home-grid">
          {quickLinks.map((item, index) => (
            <Link
              key={item.title}
              href={item.href}
              className="es-home-card"
            >
              <div className="es-home-card-top">
                <span className="es-home-card-index">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="es-home-card-arrow">↗</span>
              </div>

              <div className="es-home-card-icon">
                {item.icon}
              </div>

              <div className="es-home-card-category">
                {item.category}
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <div className="es-home-card-bottom">
                <span>Open workspace</span>
                <span className="es-home-card-bottom-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="es-home-footer">
        <div className="es-home-footer-brand">
          <span className="es-home-footer-mark">E</span>
          <span>EARTHY SOURCE</span>
        </div>

        <p>Every drop matters. Every detail counts.</p>

        <span className="es-home-footer-tag">ADMIN WORKSPACE</span>
      </footer>
    </main>
  );
}
