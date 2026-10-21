
"use client";

import Image from "next/image";
import Link from "next/link";
import "./home-dashboard.css";

const navigation = [
  { label: "Home", href: "/admin/home", icon: "⌂" },
  { label: "Scans", href: "/admin/scan-dashboard", icon: "⌁" },

];

const quickLinks = [
  {
    title: "Create Order",
    description: "Add a new order quickly.",
    href: "/admin/orders/create",
    icon: "🛒",
    color: "mint",
  },
  {
    title: "View Orders",
    description: "Manage all orders.",
    href: "/admin/orders",
    icon: "▤",
    color: "blue",
  },
  {
    title: "View Distributors",
    description: "Manage distributors and their orders.",
    href: "/admin/distributors",
    icon: "♧",
    color: "purple",
  },
  {
    title: "HR Management",
    description: "Employee records and HR operations.",
    href: "/admin/hr/dashboard",
    icon: "♙",
    color: "pink",
  },
  {
    title: "Employee Attendance",
    description: "Review daily attendance.",
    href: "/admin/hr/attendance",
    icon: "▦",
    color: "yellow",
  },
  {
    title: "Issue Employee Advances",
    description: "Manage employee advances.",
    href: "/admin/hr/advances",
    icon: "₹",
    color: "green",
  },
    {
    title: "Batch Management",
    description: "Manage all batches for QC.",
    href: "/admin/batches",
    icon: "▤",
    color: "yellow",
  },
  
  {
    title: "Inventory Management",
    description: "Stock and inventory operations.",
    href: "/admin/inventory",
    icon: "⬡",
    color: "cyan",
  },
];

const overviewItems = [
  { label: "Orders Created", href: "/admin/orders", icon: "🛒" },
  { label: "Attendance", href: "/admin/hr/attendance", icon: "♙" },
  { label: "Low Stock Items", href: "/admin/inventory", icon: "⬡" },
  { label: "Distributor Orders", href: "/admin/distributors", icon: "♧" },
  { label: "Employee Advances", href: "/admin/hr/advances", icon: "₹" },
];

export default function AdminHomePage() {
  return (
    <main className="es-dashboard">
      {/* Brand header */}
      <header className="es-dashboard-header">
        <Link href="/admin/home" className="es-dashboard-brand">
          <Image
            src="/OnlyESLogo.png"
            alt="Earthy Source"
            width={155}
            height={80}
            priority
            className="es-dashboard-logo"
          />
          <span className="es-dashboard-brand-caption">
            ADMIN WORKSPACE
          </span>
        </Link>

        <div className="es-dashboard-greeting">
          <span className="es-dashboard-sun">☀️</span>
          <span>Good to see you!</span>
        </div>

        <div className="es-dashboard-date">
          <span>▦</span>
          <div>
            <strong>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>
            <small>Earthy Source Operations</small>
          </div>
        </div>

        <Link href="/admin/home" className="es-dashboard-profile">
          <span className="es-dashboard-online-dot" />
          Workspace Active
        </Link>
      </header>

      {/* Main navigation */}
      <nav className="es-dashboard-nav" aria-label="Admin navigation">
        <div className="es-dashboard-nav-links">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                item.label === "Home"
                  ? "es-dashboard-nav-link active"
                  : "es-dashboard-nav-link"
              }
              aria-current={item.label === "Home" ? "page" : undefined}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

      
      </nav>

      {/* Welcome banner */}
      <section className="es-dashboard-hero">
        <div className="es-dashboard-hero-content">
          <span className="es-dashboard-kicker">
            WELCOME TO EARTHY SOURCE ADMIN
          </span>

          <h1>
            A Healthier Tomorrow,
            <br />
            <span>Together.</span> <b>✳</b>
          </h1>

          <p>
            Manage orders, people, inventory and operations —
            <br className="es-dashboard-desktop-break" />
            all in one place for a stronger, greener future.
          </p>

          <Link
            href="/admin/orders/create"
            className="es-dashboard-hero-button"
          >
            + Create New Order <span>→</span>
          </Link>
        </div>

        <div className="es-dashboard-quote">
          <span>✳</span>
          <p>
            “Good systems
            <br />
            build better tomorrows.”
          </p>
          <div />
          <small>PURE BY NATURE</small>
        </div>
      </section>

      {/* Quick actions */}
      <section className="es-dashboard-panel es-dashboard-quick-panel">
        <div className="es-dashboard-section-title">
          <div>
            <h2><span>⚡</span> Quick Actions</h2>
            <p>Jump to your most important tasks</p>
          </div>
          <span className="es-dashboard-section-count">
            {String(quickLinks.length).padStart(2, "0")} SHORTCUTS
          </span>
        </div>

        <div className="es-dashboard-quick-grid">
          {quickLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`es-dashboard-action ${item.color}`}
            >
              <span className="es-dashboard-action-icon">
                {item.icon}
              </span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span className="es-dashboard-action-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="es-dashboard-metrics">
        <Link href="/admin/orders" className="es-dashboard-metric">
          <span className="es-dashboard-metric-icon mint">🛒</span>
          <div>
            <small>Total Orders</small>
            <strong>—</strong>
            <span>View order records →</span>
          </div>
          <span className="es-dashboard-metric-spark">▥</span>
        </Link>

        <Link href="/admin/hr/dashboard" className="es-dashboard-metric">
          <span className="es-dashboard-metric-icon blue">♙</span>
          <div>
            <small>Total Employees</small>
            <strong>—</strong>
            <span>Open HR management →</span>
          </div>
          <span className="es-dashboard-metric-spark">▥</span>
        </Link>

        <Link href="/admin/inventory" className="es-dashboard-metric">
          <span className="es-dashboard-metric-icon yellow">⬡</span>
          <div>
            <small>Inventory Items</small>
            <strong>—</strong>
            <span>Check your inventory →</span>
          </div>
          <span className="es-dashboard-metric-spark">▥</span>
        </Link>

        <Link href="/admin/distributors" className="es-dashboard-metric">
          <span className="es-dashboard-metric-icon purple">♧</span>
          <div>
            <small>Distributors</small>
            <strong>—</strong>
            <span>Open distributor list →</span>
          </div>
          <span className="es-dashboard-metric-spark">▥</span>
        </Link>
      </section>

      {/* Activity and daily overview */}
      <section className="es-dashboard-bottom-grid">
        <div className="es-dashboard-panel es-dashboard-activity">
          <div className="es-dashboard-section-title">
            <div>
              <h2><span className="es-dashboard-green-icon">◷</span> Recent Activity</h2>
              <p>Shortcuts to the latest operational records</p>
            </div>
            <Link href="/admin/scan-dashboard" className="es-dashboard-view-link">
              Scan insights ↗
            </Link>
          </div>

          <div className="es-dashboard-activity-list">
            <Link href="/admin/orders" className="es-dashboard-activity-row">
              <span className="es-dashboard-row-icon mint">🛒</span>
              <span className="es-dashboard-row-label">
                <strong>Orders</strong>
                <small>Review recent order records</small>
              </span>
              <span className="es-dashboard-row-action">Open →</span>
            </Link>

            <Link href="/admin/hr/attendance" className="es-dashboard-activity-row">
              <span className="es-dashboard-row-icon blue">♙</span>
              <span className="es-dashboard-row-label">
                <strong>Employee attendance</strong>
                <small>Review attendance records</small>
              </span>
              <span className="es-dashboard-row-action">Open →</span>
            </Link>

            <Link href="/admin/inventory" className="es-dashboard-activity-row">
              <span className="es-dashboard-row-icon yellow">⬡</span>
              <span className="es-dashboard-row-label">
                <strong>Inventory</strong>
                <small>Check available stock</small>
              </span>
              <span className="es-dashboard-row-action">Open →</span>
            </Link>

            <Link href="/admin/distributors" className="es-dashboard-activity-row">
              <span className="es-dashboard-row-icon purple">♧</span>
              <span className="es-dashboard-row-label">
                <strong>Distributor management</strong>
                <small>Review distributors and their orders</small>
              </span>
              <span className="es-dashboard-row-action">Open →</span>
            </Link>

            <Link href="/admin/hr/advances" className="es-dashboard-activity-row">
              <span className="es-dashboard-row-icon pink">₹</span>
              <span className="es-dashboard-row-label">
                <strong>Employee advances</strong>
                <small>Manage advances and settlements</small>
              </span>
              <span className="es-dashboard-row-action">Open →</span>
            </Link>
          </div>
        </div>

        <div className="es-dashboard-panel es-dashboard-today">
          <div className="es-dashboard-section-title">
            <div>
              <h2><span className="es-dashboard-target">◎</span> Today at a Glance</h2>
              <p>Quick access to daily operations</p>
            </div>
          </div>

          <div className="es-dashboard-overview-list">
            {overviewItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="es-dashboard-overview-row"
              >
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
                <span className="es-dashboard-overview-arrow">→</span>
              </Link>
            ))}
          </div>

          <div className="es-dashboard-tip">
            <span>✳</span>
            <div>
              <strong>Small steps, steady growth.</strong>
              <p>Every detail counts towards a better tomorrow.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="es-dashboard-footer">
        <span>EARTHY SOURCE · ADMIN WORKSPACE</span>
        <span>Quality • Purity • Progress</span>
      </footer>
    </main>
  );
}
