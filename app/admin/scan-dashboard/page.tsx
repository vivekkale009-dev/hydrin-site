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

// === AUTO-BLOCK THRESHOLDS (same idea as earlier) ===
const AUTO_BLOCK_SCAN_THRESHOLD = 50;
const AUTO_BLOCK_FAKE_THRESHOLD = 10;

export default function ScanDashboard() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // date range for IP/Recent/Batches/Map
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // default last 30 days
  useEffect(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    setFromDate(fromStr);
    setToDate(toStr);
  }, []);

  // ================= LOAD DATA =================
  async function autoBlock(
    scanRows: ScanRow[],
    currentBlocked: BlockedIp[]
  ): Promise<void> {
    try {
      const existingBlocked = new Set(
        currentBlocked.filter((b) => b.is_blocked).map((b) => b.ip_address)
      );

      const ipAgg: Record<string, { total: number; fake: number }> = {};

      for (const s of scanRows) {
        const ip = s.ip_address || "unknown";
        if (!ipAgg[ip]) ipAgg[ip] = { total: 0, fake: 0 };
        ipAgg[ip].total++;
        if (s.status === "fake") ipAgg[ip].fake++;
      }

      const rowsToInsert: {
        ip_address: string;
        is_blocked: boolean;
        reason: string;
      }[] = [];

      for (const [ip, agg] of Object.entries(ipAgg)) {
        if (ip === "unknown") continue;
        if (existingBlocked.has(ip)) continue;

        if (
          agg.total >= AUTO_BLOCK_SCAN_THRESHOLD ||
          agg.fake >= AUTO_BLOCK_FAKE_THRESHOLD
        ) {
          rowsToInsert.push({
            ip_address: ip,
            is_blocked: true,
            reason: `Auto-blocked: total=${agg.total}, fake=${agg.fake}`,
          });
        }
      }

      if (!rowsToInsert.length) return;

      await supabase.from("blocked_ips").insert(rowsToInsert);
      const { data: refreshed } = await supabase
        .from("blocked_ips")
        .select("*");
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

      const { data: ipData, error: ipErr } = await supabase
        .from("blocked_ips")
        .select("*");

      if (scanErr) throw scanErr;
      if (ipErr) throw ipErr;

      const safeScans = scanData || [];
      const safeBlocked = ipData || [];

      setScans(safeScans);
      setBlockedIps(safeBlocked);
      setError("");

      // run auto-block based on ALL scans (not filtered)
      await autoBlock(safeScans, safeBlocked);
    } catch (e) {
      console.error(e);
      setError("Failed to load scan data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============= FILTERED SCANS (by date range) =============
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

  // ============= METRICS & AGGREGATIONS =============
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // top counters still on ALL scans (same behaviour as before)
    let totalToday = 0;
    let verified = 0;
    let fake = 0;
    let expired = 0;

    for (const s of scans) {
      const dateOnly = s.created_at?.slice(0, 10);
      if (dateOnly === todayStr) totalToday++;

      if (s.status === "verified") verified++;
      else if (s.status === "fake") fake++;
      else if (s.status === "expired") expired++;
    }

    // batch + IP stats on FILTERED scans (respect date range)
    const scansPerBatch: Record<string, number> = {};
    const ipStats: Record<
      string,
      {
        total: number;
        fake: number;
        lastSeen: string;
        country: string | null;
        state: string | null;
        city: string | null;
        isp: string | null;
      }
    > = {};

    for (const s of filteredScans) {
      if (s.batch_code) {
        scansPerBatch[s.batch_code] =
          (scansPerBatch[s.batch_code] || 0) + 1;
      }

      const ipKey = s.ip_address || "unknown";
      if (!ipStats[ipKey]) {
        ipStats[ipKey] = {
          total: 0,
          fake: 0,
          lastSeen: s.created_at,
          country: s.country,
          state: s.state,
          city: s.city,
          isp: s.isp,
        };
      }
      ipStats[ipKey].total++;
      if (s.status === "fake") ipStats[ipKey].fake++;
      if (s.created_at > ipStats[ipKey].lastSeen) {
        ipStats[ipKey].lastSeen = s.created_at;
      }
    }

    const batchList = Object.entries(scansPerBatch)
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const ipList = Object.entries(ipStats).map(([ip, d]) => ({
      ip,
      ...d,
    }));

    const totalForBars = verified + fake + expired || 1;

    return {
      totalToday,
      verified,
      fake,
      expired,
      batchList,
      ipList,
      totalForBars,
    };
  }, [scans, filteredScans]);

  // recent scans should follow date range
  const recentScans = useMemo(
    () => filteredScans.slice(0, 30),
    [filteredScans]
  );

  // =============== BLOCK / UNBLOCK IP ===============
  async function toggleIpBlock(ip: string, isCurrentlyBlocked: boolean) {
    if (!ip) return;

    try {
      if (isCurrentlyBlocked) {
        // Unblock
        await supabase
          .from("blocked_ips")
          .update({ is_blocked: false })
          .eq("ip_address", ip);
      } else {
        // Block
        await supabase.from("blocked_ips").insert({
          ip_address: ip,
          is_blocked: true,
          reason: "Manually blocked from dashboard",
        });
      }

      const { data: ipData } = await supabase
        .from("blocked_ips")
        .select("*");
      setBlockedIps(ipData || []);
    } catch (e) {
      console.error("Failed to toggle block", e);
      alert("Failed to update block status. Check console.");
    }
  }

  const isIpBlocked = (ip: string) =>
    blockedIps.some((b) => b.ip_address === ip && b.is_blocked);

  // ===================== UI =====================
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#050816",
        color: "white",
      }}
    >
	
	<button
  onClick={async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }}
  style={{
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #64748b",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    marginLeft: 1200,
    fontSize: "0.85rem",
  }}
>
  Logout
</button>

      <h1 style={{ fontSize: "2.2rem", fontWeight: 800 }}>
        OxyHydra Scan Dashboard
      </h1>
	  
	   <nav style={{ marginTop: 16 }}>
  <a href="/admin/scan-dashboard" style={{ marginRight: 16 }}>Overview</a>
  <a href="/admin/scan-dashboard/analytics">Analytics</a>
</nav>

      {/* Date filter for IP activity / recent scans / batches / map */}
      <section
        style={{
          marginTop: 16,
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <label style={{ fontSize: "0.9rem" }}>From</label>
          <br />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #4b5563",
              background: "#020617",
              color: "white",
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.9rem" }}>To</label>
          <br />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #4b5563",
              background: "#020617",
              color: "white",
            }}
          />
        </div>
        <button
          onClick={loadData}
          style={{
            marginTop: 18,
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: "white",
            color: "black",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload Data
        </button>
        {loading && <span>Loading…</span>}
        {error && <span style={{ color: "#f97316" }}>{error}</span>}
      </section>

      {/* SUMMARY CARDS (all-time / today) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <MetricCard label="Scans Today" value={stats.totalToday} />
        <MetricCard label="Verified" value={stats.verified} />
        <MetricCard label="Fake Attempts" value={stats.fake} />
        <MetricCard label="Expired Scans" value={stats.expired} />
      </section>

      {/* STATUS BREAKDOWN BARS */}
      <section
        style={{
          marginTop: 24,
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Status Breakdown</h2>

        <StatusBar
          label="Verified"
          value={stats.verified}
          total={stats.totalForBars}
          color="#22c55e"
        />
        <StatusBar
          label="Fake"
          value={stats.fake}
          total={stats.totalForBars}
          color="#ef4444"
        />
        <StatusBar
          label="Expired"
          value={stats.expired}
          total={stats.totalForBars}
          color="#f97316"
        />
      </section>

      {/* TOP BATCHES – respects date range */}
      <section
        style={{
          marginTop: 24,
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Top Scanned Batches</h2>
        {stats.batchList.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No scans in this range.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>Batch</th>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Scan Count
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.batchList.map((b) => (
                <tr key={b.batch}>
                  <td style={{ padding: "8px" }}>{b.batch}</td>
                  <td style={{ padding: "8px" }}>{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* IP ACTIVITY + BLOCK / UNBLOCK (date-filtered) */}
      <section
        style={{
          marginTop: 24,
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>IP Activity & Control</h2>
        {stats.ipList.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No IP data in this range.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px" }}>IP</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Total</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Fake</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    Location
                  </th>
                  <th style={{ textAlign: "left", padding: "8px" }}>ISP</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    Last Seen
                  </th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Block</th>
                </tr>
              </thead>
              <tbody>
                {stats.ipList.map((ipRow) => {
                  const blocked = isIpBlocked(ipRow.ip);
                  return (
                    <tr key={ipRow.ip}>
                      <td style={{ padding: "8px" }}>{ipRow.ip}</td>
                      <td style={{ padding: "8px" }}>{ipRow.total}</td>
                      <td style={{ padding: "8px", color: "#f97316" }}>
                        {ipRow.fake}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {ipRow.city || "-"},{" "}
                        {ipRow.state || "-"},{" "}
                        {ipRow.country || "-"}
                      </td>
                      <td style={{ padding: "8px" }}>{ipRow.isp || "-"}</td>
                      <td style={{ padding: "8px" }}>
                        {new Date(ipRow.lastSeen).toLocaleString()}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <button
                          onClick={() => toggleIpBlock(ipRow.ip, blocked)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            background: blocked ? "#ef4444" : "#22c55e",
                            color: "white",
                          }}
                        >
                          {blocked ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RECENT SCANS TABLE (date-filtered) */}
      <section
        style={{
          marginTop: 24,
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>
          Recent Scans (Last {recentScans.length})
        </h2>
        {recentScans.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No scans in this range.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px" }}>Time</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Batch</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Device</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    Browser
                  </th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    Pincode
                  </th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    First / Repeat
                  </th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    Fingerprint
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "8px" }}>
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "8px" }}>{s.batch_code}</td>
                    <td
                      style={{
                        padding: "8px",
                        color:
                          s.status === "verified"
                            ? "#22c55e"
                            : s.status === "fake"
                            ? "#ef4444"
                            : s.status === "expired"
                            ? "#f97316"
                            : "white",
                      }}
                    >
                      {s.status}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {s.device_type || "-"}
                    </td>
                    <td style={{ padding: "8px" }}>{s.browser || "-"}</td>
                    <td style={{ padding: "8px" }}>{s.pincode || "-"}</td>
                    <td style={{ padding: "8px" }}>
                      {s.first_scan ? "First" : "Repeat"}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {s.fingerprint
                        ? `${s.fingerprint.slice(0, 10)}…`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MAP AT BOTTOM – date-filtered */}
      <section
        style={{
          marginTop: 40,
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Scan Locations Map</h2>

        <ScanMap
          points={
            filteredScans
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
      </section>
    </main>
  );
}

// ================== SMALL COMPONENTS ==================

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.9)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span>
          {value} ({pct}%)
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(148,163,184,0.3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}
