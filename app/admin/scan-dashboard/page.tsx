"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic"; // << REQUIRED FIX FOR LEAFLET

// Leaflet must load on client side only
const ScanMap = dynamic(() => import("./ScanMap"), {
  ssr: false,
});

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
  latitude?: number | null;
  longitude?: number | null;
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

  // ===================== FETCH DATA =====================
  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const { data: scanData, error: scanErr } = await supabase
          .from("scans")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000);

        if (scanErr) throw scanErr;

        const { data: ipData, error: ipErr } = await supabase
          .from("blocked_ips")
          .select("*");

        if (ipErr) throw ipErr;

        setScans((scanData || []) as ScanRow[]);
        setBlockedIps((ipData || []) as BlockedIp[]);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load scan data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ===================== DERIVED METRICS =====================
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let totalToday = 0;
    let verified = 0;
    let fake = 0;
    let expired = 0;

    const scansPerBatch: Record<string, number> = {};
    const ipStats: Record<string, any> = {};

    for (const s of scans) {
      const dateOnly = s.created_at?.slice(0, 10);
      if (dateOnly === todayStr) totalToday++;

      if (s.status === "verified") verified++;
      else if (s.status === "fake") fake++;
      else if (s.status === "expired") expired++;

      if (s.batch_code) {
        scansPerBatch[s.batch_code] = (scansPerBatch[s.batch_code] || 0) + 1;
      }

      if (s.ip_address) {
        const existing = ipStats[s.ip_address] || {
          total: 0,
          fake: 0,
          lastSeen: s.created_at,
          country: s.country,
          state: s.state,
          city: s.city,
          isp: s.isp,
        };

        existing.total += 1;
        if (s.status === "fake") existing.fake += 1;
        if (s.created_at > existing.lastSeen) existing.lastSeen = s.created_at;

        existing.country = existing.country || s.country;
        existing.state = existing.state || s.state;
        existing.city = existing.city || s.city;
        existing.isp = existing.isp || s.isp;

        ipStats[s.ip_address] = existing;
      }
    }

    const batchList = Object.entries(scansPerBatch)
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => b.count - a.count);

    const ipList = Object.entries(ipStats)
      .map(([ip, v]) => ({ ip, ...v }))
      .sort((a, b) => b.total - a.total);

    return { totalToday, verified, fake, expired, batchList, ipList };
  }, [scans]);

  // ===================== AUTO-BLOCK LOGIC =====================
  useEffect(() => {
    async function autoBlock() {
      const suspiciousIps = stats.ipList.filter(
        (ip) =>
          ip.total >= AUTO_BLOCK_SCAN_THRESHOLD ||
          ip.fake >= AUTO_BLOCK_FAKE_THRESHOLD
      );

      if (!suspiciousIps.length) return;

      for (const entry of suspiciousIps) {
        const alreadyBlocked = blockedIps.some(
          (b) => b.ip_address === entry.ip && b.is_blocked
        );
        if (alreadyBlocked) continue;

        const { data, error } = await supabase
          .from("blocked_ips")
          .upsert({
            ip_address: entry.ip,
            reason: `Auto-block: ${entry.total} scans (${entry.fake} fake)`,
            is_blocked: true,
          })
          .select()
          .single();

        if (!error && data) {
          setBlockedIps((prev) => {
            const others = prev.filter((p) => p.ip_address !== entry.ip);
            return [...others, data as BlockedIp];
          });

          await fetch("/api/send-alert", {
            method: "POST",
            body: JSON.stringify({
              type: "auto_block_ip",
              payload: entry,
            }),
          }).catch(() => {});
        }
      }
    }

    if (scans.length) autoBlock();
  }, [stats.ipList.length]);

  // ===================== MANUAL BLOCK / UNBLOCK =====================
  async function handleBlock(ip: string) {
    const { data, error } = await supabase
      .from("blocked_ips")
      .upsert({
        ip_address: ip,
        reason: "Manual block from dashboard",
        is_blocked: true,
      })
      .select()
      .single();

    if (!error && data) {
      setBlockedIps((prev) => [...prev.filter((p) => p.ip_address !== ip), data]);
    }
  }

  async function handleUnblock(ip: string) {
    const { data, error } = await supabase
      .from("blocked_ips")
      .update({ is_blocked: false })
      .eq("ip_address", ip)
      .select()
      .single();

    if (!error && data) {
      setBlockedIps((prev) => [...prev.filter((p) => p.ip_address !== ip), data]);
    }
  }

  function isIpBlocked(ip: string) {
    return blockedIps.some((b) => b.ip_address === ip && b.is_blocked);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#050816",
        color: "white",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 8 }}>
        OxyHydra Scan Dashboard
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Realtime overview of QR scans, locations, and security signals.
      </p>

      {/* TOP METRICS LIKE BEFORE */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricCard label="Scans Today" value={stats.totalToday} />
        <MetricCard label="Verified" value={stats.verified} />
        <MetricCard label="Fake Attempts" value={stats.fake} />
        <MetricCard label="Expired Scans" value={stats.expired} />
      </section>

      {/* STATUS BARS */}
      <section
        style={{
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <h2>Status Breakdown</h2>
        <StatusBar label="Verified" count={stats.verified} total={scans.length} color="#22c55e" />
        <StatusBar label="Fake" count={stats.fake} total={scans.length} color="#ef4444" />
        <StatusBar label="Expired" count={stats.expired} total={scans.length} color="#f97316" />
      </section>

      {/* BATCH STATS */}
      <section
        style={{
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <h2>Top Batches</h2>
        {stats.batchList.slice(0, 10).map((b) => (
          <div key={b.batch} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{b.batch}</span>
            <span>{b.count}</span>
          </div>
        ))}
      </section>

      {/* IP TABLE (unchanged) */}
      <section
        style={{
          background: "rgba(15,23,42,0.9)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <h2>IP Activity & Locations</h2>

        <div style={{ maxHeight: 420, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>IP</Th>
                <Th>Location</Th>
                <Th>ISP</Th>
                <Th>Total</Th>
                <Th>Fake</Th>
                <Th>Last Seen</Th>
                <Th>Blocked?</Th>
                <Th>Action</Th>
              </tr>
            </thead>

            <tbody>
              {stats.ipList.map((row) => (
                <tr key={row.ip}>
                  <Td>{row.ip}</Td>
                  <Td>{row.city || "-"}, {row.state || "-"}, {row.country || "-"}</Td>
                  <Td>{row.isp || "-"}</Td>
                  <Td>{row.total}</Td>
                  <Td>{row.fake}</Td>
                  <Td>{new Date(row.lastSeen).toLocaleString()}</Td>
                  <Td>{isIpBlocked(row.ip) ? "Yes" : "No"}</Td>
                  <Td>
                    {isIpBlocked(row.ip) ? (
                      <button onClick={() => handleUnblock(row.ip)} style={btnStyle("unblock")}>
                        Unblock
                      </button>
                    ) : (
                      <button onClick={() => handleBlock(row.ip)} style={btnStyle("block")}>
                        Block
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ✅ ADD MAP BELOW DASHBOARD WITHOUT MODIFYING ANY OTHER UI */}
      <section style={{ marginTop: 30 }}>
        <h2 style={{ marginBottom: 12 }}>Scan Map</h2>

        <ScanMap
          points={scans
            .filter((s) => s.latitude && s.longitude)
            .map((s) => ({
              id: s.id,
              batch_code: s.batch_code,
              status: s.status,
              latitude: Number(s.latitude),
              longitude: Number(s.longitude),
              city: s.city,
              state: s.state,
              country: s.country,
              isp: s.isp,
              created_at: s.created_at,
            }))}
        />
      </section>
    </main>
  );
}

/* ---------- UI HELPERS (UNCHANGED) ---------- */

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.9)",
        borderRadius: 16,
        padding: 16,
        border: "1px solid rgba(148,163,184,0.3)",
      }}
    >
      <div style={{ opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span>
          {count} ({pct}%)
        </span>
      </div>

      <div style={{ width: "100%", height: 8, background: "#1f2937", borderRadius: 99 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: 8, textAlign: "left", fontWeight: 600, borderBottom: "1px solid #374151" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 8 }}>{children}</td>;
}

function btnStyle(type: "block" | "unblock"): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    background: type === "block" ? "#ef4444" : "#22c55e",
    color: "#0b1120",
  };
}
