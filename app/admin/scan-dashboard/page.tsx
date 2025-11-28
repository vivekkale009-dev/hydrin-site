export const dynamic = "force-dynamic";
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

  // ============= LOAD DATA =============
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: scanData } = await supabase
          .from("scans")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000);

        const { data: ipData } = await supabase
          .from("blocked_ips")
          .select("*");

        setScans(scanData || []);
        setBlockedIps(ipData || []);
      } catch (e) {
        setError("Failed to load scan data.");
      }
      setLoading(false);
    }
    load();
  }, []);

  // ============= METRICS =============
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let totalToday = 0;
    let verified = 0;
    let fake = 0;
    let expired = 0;

    const scansPerBatch: any = {};
    const ipStats: any = {};

    for (const s of scans) {
      const dateOnly = s.created_at?.slice(0, 10);
      if (dateOnly === todayStr) totalToday++;

      if (s.status === "verified") verified++;
      else if (s.status === "fake") fake++;
      else if (s.status === "expired") expired++;

      scansPerBatch[s.batch_code] =
        (scansPerBatch[s.batch_code] || 0) + 1;

      if (!ipStats[s.ip_address]) {
        ipStats[s.ip_address] = {
          total: 0,
          fake: 0,
          lastSeen: s.created_at,
          country: s.country,
          state: s.state,
          city: s.city,
          isp: s.isp,
        };
      }

      ipStats[s.ip_address].total++;
      if (s.status === "fake") ipStats[s.ip_address].fake++;
      if (s.created_at > ipStats[s.ip_address].lastSeen)
        ipStats[s.ip_address].lastSeen = s.created_at;
    }

    const batchList = Object.entries(scansPerBatch).map(([batch, count]) => ({
      batch,
      count,
    }));

    const ipList = Object.entries(ipStats).map(([ip, d]: any) => ({
      ip,
      ...d,
    }));

    return { totalToday, verified, fake, expired, batchList, ipList };
  }, [scans]);

  // ============= UI =============
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#050816",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", fontWeight: 800 }}>
        OxyHydra Scan Dashboard
      </h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

      {/* METRICS */}
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

      {/* ⭐⭐⭐ MAP AT BOTTOM ⭐⭐⭐ */}
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
            scans
              .filter((s) => !!s.latitude && !!s.longitude)
              .map((s) => ({
                id: s.id,
                batch_code: s.batch_code,
                status: s.status,
                latitude: s.latitude!,
                longitude: s.longitude!,
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
