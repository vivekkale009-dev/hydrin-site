"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ScanMap, { MapPoint } from "./ScanMap";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ScanRow = {
  id: number;
  batch_code: string;
  status: string;
  created_at: string;
  scanned_at: string;
  ip_address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  isp: string | null;
  latitude: number | null;
  longitude: number | null;
  pincode: string | null;
  device_type: string | null;
  browser: string | null;
  fingerprint: string | null;
  first_scan: boolean | null;
  is_vpn: boolean | null;
};

type BlockedIp = {
  id: number;
  ip_address: string;
  is_blocked: boolean;
};

export default function ScanDashboard() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Analytics Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setFromDate(fromStr);
    setToDate(toStr);
  }, []);

  async function loadData() {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/scan-insights?from=${fromDate}&to=${toDate}`);
      const result = await response.json();
      setScans(result.scans || []); 
      setBlockedIps(result.blockedIps || []);
    } catch (e) {
      console.error("Load error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fromDate && toDate) loadData();
  }, [fromDate, toDate]);

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const matchesSearch = (s.batch_code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.ip_address?.includes(searchTerm));
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [scans, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let today = 0, verified = 0, fake = 0, vpnCount = 0;
    scans.forEach(s => {
      if (s.created_at?.slice(0, 10) === todayStr) today++;
      if (s.status === "verified") verified++;
      if (s.status === "fake") fake++;
      if (s.is_vpn) vpnCount++;
    });
    return { today, verified, fake, vpnCount };
  }, [scans]);

async function toggleIpBlock(ip: string, isCurrentlyBlocked: boolean) {
  const action = isCurrentlyBlocked ? "unblock" : "block";
  
  try {
    const res = await fetch("/api/ip-control", { // Adjust path to your route
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, action }),
    });

    const result = await res.json();
    
    if (result.success) {
      // Refresh the data so the UI updates
      loadData(); 
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (e) {
    alert("Failed to connect to the server.");
  }
}

  const isIpBlocked = (ip: string) => blockedIps.some((b) => b.ip_address === ip && b.is_blocked);

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", background: "#f8fafc", color: "#1e293b" }}>
      
      {/* 1. TOP HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, maxWidth: "1400px", margin: "0 auto 24px auto" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>Earthy Source <span style={{ color: "#16a34a" }}>Scans</span></h1>
        <button onClick={() => window.location.href = "/admin/login"} style={{ padding: "8px 18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", cursor: "pointer", fontWeight: 600 }}>Logout</button>
      </div>

      {/* 2. RESTORED NAVIGATION RIBBON */}
      <nav 
        className="admin-nav-scroll"
        style={{ 
          maxWidth: "1400px", 
          margin: "0 auto 32px auto", 
          background: "white", 
          padding: "12px 16px", 
          borderRadius: "16px", 
          display: "flex", 
          flexWrap: "nowrap", 
          justifyContent: "flex-start",
          alignItems: "center",
          gap: "15px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflowX: "auto",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <style>{`
          .admin-nav-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {[
          { label: "Overview", href: "/admin/scan-dashboard", active: true },
          { label: "Analytics", href: "/admin/scan-dashboard/analytics" },
          { label: "Orders", href: "/admin/orders" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "HR", href: "/admin/hr/dashboard" },
          { label: "VAN", href: "/admin/vans" },
          { label: "SKU & Production", href: "/admin/production-parameters" },
          { label: "Batches", href: "/admin/batches" },
          { label: "Expenses", href: "/admin/expenses" },
          { label: "Distributors", href: "/admin/distributors" },
          { label: "CRM", href: "/admin/crm" },
		  { label: "Raw Materials", href: "/admin/raw-materials" },
          { label: "Marketing", href: "/admin/marketing" },
          { label: "Visitor Pass", href: "/admin/visitor-dashboard" },
		  { label: "Invoices / GST Filing", href: "/admin/gst-filing" },
		  { label: "Machine Maintenance", href: "/admin/machinery" },
          { label: "Careers", href: "/admin/careers-manager" },
          { label: "Letters", href: "/admin/letters" },
		  { label: "Broadcast", href: "/admin/broadcast" },
          { label: "DB Health", href: "/admin/database-health" },
          { label: "Main Dashboard", href: "/admin/dashboard" },
        ].map((link) => (
          <a 
            key={link.href}
            href={link.href} 
            style={{ 
              textDecoration: "none",
              fontSize: "13px", 
              padding: "8px 12px", 
              whiteSpace: "nowrap",
              color: link.active ? "#15803d" : "#64748b", 
              fontWeight: link.active ? 700 : 500,
              flexShrink: 0,
              transition: "0.2s",
              borderBottom: link.active ? "2px solid #15803d" : "none"
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* 3. PROFESSIONAL FILTER PANEL */}
        <section style={{ background: "white", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>
          <div style={{ minWidth: "250px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Date Analysis Period</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", flex: 1 }} />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", flex: 1 }} />
            </div>
          </div>

          <div style={{ flex: 2, minWidth: "250px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Quick Search</label>
            <input placeholder="Search Batch Number, IP Address, or City..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ marginTop: "5px", width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          </div>

          <div style={{ width: "180px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Scan Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginTop: "5px", width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <option value="all">All Records</option>
              <option value="verified">Verified Only</option>
              <option value="fake">Fake Only</option>
              <option value="expired">Expired Only</option>
            </select>
          </div>

          <button onClick={loadData} style={{ background: "#15803d", color: "white", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Syncing..." : "Sync Database"}
          </button>
        </section>

        {/* 4. KEY PERFORMANCE METRICS */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          <StatCard label="Scans Today" value={stats.today} subtext="Real-time activity" icon="⚡" />
          <StatCard label="Purity Verified" value={stats.verified} subtext="Passed QC" icon="✅" color="#16a34a" />
          <StatCard label="Suspected Fake" value={stats.fake} subtext="Critical alerts" icon="🚨" color="#ef4444" />
          <StatCard label="Masked Scans (VPN)" value={stats.vpnCount} subtext="Security bypasses" icon="🛡️" color="#6366f1" />
        </section>

        {/* 5. MASTER SCAN LOG (EVERY COLUMN) */}
        <section style={{ background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>Master Scan Log (Every Column)</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "15px" }}>ID</th>
                  <th style={{ padding: "15px" }}>Batch / Time</th>
                  <th style={{ padding: "15px" }}>Identity (IP & VPN)</th>
                  <th style={{ padding: "15px" }}>Location & Pincode</th>
                  <th style={{ padding: "15px" }}>Network (ISP)</th>
                  <th style={{ padding: "15px" }}>Device / Browser</th>
                  <th style={{ padding: "15px" }}>Fingerprint</th>
                  <th style={{ padding: "15px" }}>Result</th>
                  <th style={{ padding: "15px" }}>Control</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "13px" }}>
                {filteredScans.slice(0, 100).map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "15px", color: "#94a3b8" }}>#{s.id}</td>
                    <td style={{ padding: "15px" }}>
                      <div style={{ fontWeight: 700 }}>{s.batch_code}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date(s.scanned_at || s.created_at).toLocaleString()}</div>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <div>{s.ip_address}</div>
                      {s.is_vpn && <span style={{ fontSize: "10px", color: "#6366f1", fontWeight: 800 }}>🛡️ VPN</span>}
                    </td>
                    <td style={{ padding: "15px" }}>
                      <div>{s.city}, {s.state}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>PIN: {s.pincode || "---"}</div>
                    </td>
                    <td style={{ padding: "15px", color: "#64748b" }}>{s.isp || "Unknown"}</td>
                    <td style={{ padding: "15px" }}>
                      <div style={{ fontSize: "11px" }}>{s.device_type} <br/> {s.browser}</div>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <code style={{ fontSize: "10px", color: "#64748b" }}>{s.fingerprint?.slice(0, 10)}...</code>
                      {s.first_scan && <div style={{ fontSize: "9px", color: "#16a34a", fontWeight: 700 }}>NEW USER</div>}
                    </td>
                    <td style={{ padding: "15px" }}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 800,
                        background: s.status === "verified" ? "#dcfce7" : s.status === "fake" ? "#fee2e2" : "#fef3c7",
                        color: s.status === "verified" ? "#15803d" : s.status === "fake" ? "#b91c1c" : "#92400e"
                      }}>{s.status?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <button 
                        onClick={() => toggleIpBlock(s.ip_address!, isIpBlocked(s.ip_address!))}
                        style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: isIpBlocked(s.ip_address!) ? "#ef4444" : "white", color: isIpBlocked(s.ip_address!) ? "white" : "#0f172a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        {isIpBlocked(s.ip_address!) ? "Unblock" : "Block IP"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. MAP SECTION (KEPT AS IS) */}
        <section style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "20px", fontWeight: 700 }}>Live Geographic Monitoring</h3>
          <div style={{ height: "480px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
             <ScanMap points={filteredScans.filter(s => s.latitude && s.longitude).map(s => ({ ...s, latitude: s.latitude!, longitude: s.longitude! })) as MapPoint[]} />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, subtext, icon, color = "#0f172a" }: any) {
  return (
    <div style={{ background: "white", padding: "24px", borderRadius: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "15px" }}>
      <div style={{ fontSize: "24px", background: "#f8fafc", width: "55px", height: "55px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "14px", border: "1px solid #f1f5f9" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: "28px", fontWeight: 800, color: color, lineHeight: 1, margin: "4px 0" }}>{value}</div>
        <div style={{ fontSize: "11px", color: "#64748b" }}>{subtext}</div>
      </div>
    </div>
  );
}