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
};

type BlockedIp = {
  id: number;
  ip_address: string;
  reason: string | null;
  is_blocked: boolean;
  created_at: string;
};

const AUTO_BLOCK_SCAN_THRESHOLD = 50;
const AUTO_BLOCK_FAKE_THRESHOLD = 10;

export default function ScanDashboard() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // --- LOGIC RESTORED ---
  useEffect(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    setFromDate(fromStr);
    setToDate(toStr);
  }, []);

  async function autoBlock(scanRows: ScanRow[], currentBlocked: BlockedIp[]): Promise<void> {
    try {
      const existingBlocked = new Set(currentBlocked.filter((b) => b.is_blocked).map((b) => b.ip_address));
      const ipAgg: Record<string, { total: number; fake: number }> = {};

      for (const s of scanRows) {
        const ip = s.ip_address || "unknown";
        if (!ipAgg[ip]) ipAgg[ip] = { total: 0, fake: 0 };
        ipAgg[ip].total++;
        if (s.status === "fake") ipAgg[ip].fake++;
      }

      const rowsToInsert: { ip_address: string; is_blocked: boolean; reason: string }[] = [];
      for (const [ip, agg] of Object.entries(ipAgg)) {
        if (ip === "unknown" || existingBlocked.has(ip)) continue;
        if (agg.total >= AUTO_BLOCK_SCAN_THRESHOLD || agg.fake >= AUTO_BLOCK_FAKE_THRESHOLD) {
          rowsToInsert.push({
            ip_address: ip,
            is_blocked: true,
            reason: `Auto-blocked: total=${agg.total}, fake=${agg.fake}`,
          });
        }
      }

      if (!rowsToInsert.length) return;
      await supabase.from("blocked_ips").insert(rowsToInsert);
      const { data: refreshed } = await supabase.from("blocked_ips").select("*");
      setBlockedIps(refreshed || []);
    } catch (e) {
      console.error("Auto-block failed", e);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const { data: scanData, error: scanErr } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      const { data: ipData, error: ipErr } = await supabase.from("blocked_ips").select("*");
      if (scanErr) throw scanErr;
      if (ipErr) throw ipErr;

      setScans(scanData || []);
      setBlockedIps(ipData || []);
      setError("");
      await autoBlock(scanData || [], ipData || []);
    } catch (e) {
      setError("Failed to load scan data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredScans = useMemo(() => {
    if (!fromDate || !toDate) return scans;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return scans.filter((s) => {
      const d = new Date(s.created_at);
      return d >= from && d <= to;
    });
  }, [scans, fromDate, toDate]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let totalToday = 0, verified = 0, fake = 0, expired = 0;

    for (const s of scans) {
      if (s.created_at?.slice(0, 10) === todayStr) totalToday++;
      if (s.status === "verified") verified++;
      else if (s.status === "fake") fake++;
      else if (s.status === "expired") expired++;
    }

    const scansPerBatch: Record<string, number> = {};
    const ipStats: Record<string, any> = {};

    for (const s of filteredScans) {
      if (s.batch_code) scansPerBatch[s.batch_code] = (scansPerBatch[s.batch_code] || 0) + 1;
      const ipKey = s.ip_address || "unknown";
      if (!ipStats[ipKey]) {
        ipStats[ipKey] = { total: 0, fake: 0, lastSeen: s.created_at, country: s.country, state: s.state, city: s.city, isp: s.isp };
      }
      ipStats[ipKey].total++;
      if (s.status === "fake") ipStats[ipKey].fake++;
    }

    return {
      totalToday, verified, fake, expired,
      batchList: Object.entries(scansPerBatch).map(([batch, count]) => ({ batch, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      ipList: Object.entries(ipStats).map(([ip, d]) => ({ ip, ...d })),
      totalForBars: verified + fake + expired || 1
    };
  }, [scans, filteredScans]);

  async function toggleIpBlock(ip: string, isCurrentlyBlocked: boolean) {
    if (!ip) return;
    try {
      if (isCurrentlyBlocked) {
        await supabase.from("blocked_ips").update({ is_blocked: false }).eq("ip_address", ip);
      } else {
        const existing = blockedIps.find((b) => b.ip_address === ip);
        if (existing) {
          await supabase.from("blocked_ips").update({ is_blocked: true, reason: "Manually blocked" }).eq("ip_address", ip);
        } else {
          await supabase.from("blocked_ips").insert({ ip_address: ip, is_blocked: true, reason: "Manually blocked" });
        }
      }
      const { data } = await supabase.from("blocked_ips").select("*");
      setBlockedIps(data || []);
    } catch (e) { alert("Failed to update block status."); }
  }

  const isIpBlocked = (ip: string) => blockedIps.some((b) => b.ip_address === ip && b.is_blocked);

  // --- FRESH THEME STYLING ---
  const freshGreen = "#16a34a";
  const softBg = "#f8fafc";
  const navLinkStyle = { marginRight: 20, color: "#64748b", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 };

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", background: softBg, color: "#1e293b" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, maxWidth: "1200px", margin: "0 auto 24px auto" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>Earthy Source <span style={{ color: freshGreen }}>Scans</span></h1>
        <button
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
          style={{ padding: "8px 18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", cursor: "pointer", fontWeight: 600 }}
        >
          Logout
        </button>
      </div>

{/* NAVIGATION BAR - FIXED FOR MOBILE SWIPING */}
<nav 
  className="admin-nav-scroll"
  style={{ 
    maxWidth: "1200px", 
    margin: "0 auto 32px auto", 
    background: "white", 
    padding: "12px 16px", 
    borderRadius: "16px", 
    display: "flex", 
    flexWrap: "nowrap", 
    justifyContent: "flex-start", // Change from space-between to allow scrolling
    alignItems: "center",
    gap: "15px", // Give tabs some breathing room
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    overflowX: "auto", // CHANGED: This allows you to swipe left/right
    msOverflowStyle: "none", // IE and Edge
    scrollbarWidth: "none", // Firefox
    WebkitOverflowScrolling: "touch" // Smooth swiping on iPhone
  }}
>
  {/* Add a CSS hide for the scrollbar inside the component if you want */}
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
	{ label: "Careers", href: "/admin/careers-manager" },
    { label: "Main Dashboard", href: "/admin/dashboard" },
  ].map((link) => (
    <a 
      key={link.href}
      href={link.href} 
      style={{ 
        textDecoration: "none",
        fontSize: "13px", 
        padding: "8px 12px", 
        whiteSpace: "nowrap", // Prevents text from breaking
        color: link.active ? "#15803d" : "#64748b", 
        fontWeight: link.active ? 700 : 500,
        flexShrink: 0, // IMPORTANT: Prevents the tab from getting squashed
        transition: "0.2s",
        borderBottom: link.active ? "2px solid #15803d" : "none"
      }}
    >
      {link.label}
    </a>
  ))}
</nav>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* DATE FILTER SECTION */}
        <section style={{ background: "white", borderRadius: "20px", padding: "24px", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>From</label><br />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ marginTop: 4, padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>To</label><br />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ marginTop: 4, padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          </div>
          <button onClick={loadData} style={{ marginTop: 18, padding: "10px 24px", borderRadius: "10px", border: "none", background: freshGreen, color: "white", fontWeight: 700, cursor: "pointer" }}>
            Refresh Data
          </button>
          {loading && <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading...</span>}
        </section>

        {/* METRICS */}
      {/* METRICS - RESPONSIVE GRID */}
<section style={{ 
  display: "grid", 
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
  gap: 20, 
  marginBottom: 24 
}}>
  <MetricCard label="Scans Today" value={stats.totalToday} color="#0f172a" />
  <MetricCard label="Verified" value={stats.verified} color={freshGreen} />
  <MetricCard label="Fake Attempts" value={stats.fake} color="#ef4444" />
  <MetricCard label="Expired Scans" value={stats.expired} color="#f59e0b" />
</section>

        {/* IP ACTIVITY TABLE */}
        <section style={{ background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          <h2 style={{ marginBottom: 20, fontSize: "1.2rem", fontWeight: 700 }}>IP Activity & Control</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#94a3b8", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ padding: "12px" }}>IP ADDRESS</th>
                  <th style={{ padding: "12px" }}>TOTAL</th>
                  <th style={{ padding: "12px" }}>FAKE</th>
                  <th style={{ padding: "12px" }}>LOCATION</th>
                  <th style={{ padding: "12px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {stats.ipList.slice(0, 10).map(ipRow => {
                  const blocked = isIpBlocked(ipRow.ip);
                  return (
                    <tr key={ipRow.ip} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "14px 12px", fontWeight: 500 }}>{ipRow.ip}</td>
                      <td style={{ padding: "12px" }}>{ipRow.total}</td>
                      <td style={{ padding: "12px", color: "#ef4444" }}>{ipRow.fake}</td>
                      <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{ipRow.city}, {ipRow.state}</td>
                      <td style={{ padding: "12px" }}>
                        <button 
                          onClick={() => toggleIpBlock(ipRow.ip, blocked)}
                          style={{ padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", background: blocked ? "#fee2e2" : "#dcfce7", color: blocked ? "#b91c1c" : "#15803d", fontWeight: 600, fontSize: "0.8rem" }}>
                          {blocked ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* MAP SECTION - PRESERVED */}
        <section style={{ background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h2 style={{ marginBottom: 20, fontSize: "1.2rem", fontWeight: 700 }}>Geographic Distribution</h2>
          <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <ScanMap
              points={filteredScans
                .filter((s) => !!s.latitude && !!s.longitude)
                .map((s) => ({
                  id: s.id,
                  batch_code: s.batch_code,
                  status: s.status,
                  latitude: s.latitude as number,
                  longitude: s.longitude as number,
                  city: s.city,
                  state: s.state,
                  country: s.country,
                  isp: s.isp,
                  created_at: s.created_at,
                })) as MapPoint[]
              }
            />
          </div>
        </section>

      </div>
    </main>
  );
}

// SUB-COMPONENTS
function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "white", borderRadius: "20px", padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
      <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: color }}>{value}</div>
    </div>
  );
}