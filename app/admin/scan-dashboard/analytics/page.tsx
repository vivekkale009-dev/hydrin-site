"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type DailyPoint = {
  date: string;
  verified: number;
  fake: number;
  expired: number;
  total: number;
};

type CityPoint = {
  city: string;
  total: number;
  verified: number;
  fake: number;
  expired: number;
};

type DevicePoint = {
  fingerprint: string;
  total: number;
  first: number;
  repeat: number;
  city: string | null;
  state: string | null;
};

type BatchPoint = {
  batch: string;
  total: number;
  verified: number;
  fake: number;
  expired: number;
};

type InsightsResponse = {
  summary: { verified: number; fake: number; expired: number };
  daily: DailyPoint[];
  byCity: CityPoint[];
  byDevice: DevicePoint[];
  byBatch: BatchPoint[];
};

export default function ScanAnalytics() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // default: last 30 days
  useEffect(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    setFrom(fromStr);
    setTo(toStr);
  }, []);

  useEffect(() => {
    if (!from || !to) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function fetchData() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/scan-insights?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as InsightsResponse;
      setData(json);
    } catch (e) {
      console.error(e);
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  const dailyData = data?.daily ?? [];
  const cityData = data?.byCity ?? [];
  const deviceData = data?.byDevice ?? [];
  const batchData = data?.byBatch ?? [];

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
        OxyHydra Scan Analytics
      </h1>

      {/* Simple link back to Overview */}
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <a href="/admin/scan-dashboard" style={{ textDecoration: "underline" }}>
          ← Back to Overview
        </a>
      </div>

      {/* Date range filter */}
      <section
        style={{
          marginTop: 12,
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
            value={from}
            onChange={(e) => setFrom(e.target.value)}
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
            value={to}
            onChange={(e) => setTo(e.target.value)}
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
          onClick={fetchData}
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
          Refresh
        </button>
        {loading && <span>Loading…</span>}
        {error && <span style={{ color: "#f97316" }}>{error}</span>}
      </section>

      {!data ? (
        <p style={{ marginTop: 20 }}>No data yet.</p>
      ) : (
        <>
          {/* 1. Time series – scans per day */}
          <section
            style={{
              marginTop: 24,
              background: "rgba(15,23,42,0.9)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginBottom: 12 }}>Daily Scan Trend</h2>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid #4b5563",
                      color: "white",
                      fontSize: "0.8rem",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="verified"
                    name="Verified"
                    dot={false}
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="fake"
                    name="Fake"
                    dot={false}
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="expired"
                    name="Expired"
                    dot={false}
                    stroke="#f97316"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 2. Scans by City */}
          <section
            style={{
              marginTop: 24,
              background: "rgba(15,23,42,0.9)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginBottom: 12 }}>Scans by City (Top 20)</h2>
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={cityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  {/* we hide ticks to avoid clutter but still use city in tooltip */}
                  <XAxis dataKey="city" hide />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.2)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) {
                        return null;
                      }
                      const d = payload[0].payload as CityPoint;
                      return (
                        <div
                          style={{
                            background: "#020617",
                            border: "1px solid #4b5563",
                            padding: "8px 10px",
                            borderRadius: 8,
                            fontSize: "0.8rem",
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {d.city || "Unknown city"}
                          </div>
                          <div>Total scans: {d.total}</div>
                          <div>Verified: {d.verified}</div>
                          <div>Fake: {d.fake}</div>
                          <div>Expired: {d.expired}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="total"
                    name="Total Scans"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 8, fontSize: "0.8rem", opacity: 0.8 }}>
              Hover bars to see exact city name & breakdown.
            </div>
          </section>

          {/* 3. Device / Retailer behavior via fingerprint */}
          <section
            style={{
              marginTop: 24,
              background: "rgba(15,23,42,0.9)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginBottom: 12 }}>
              Top Devices / Shops (via fingerprint)
            </h2>
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
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Device (Fingerprint)
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Total</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>First</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Repeat
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Approx Location
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deviceData.map((d) => (
                    <tr key={d.fingerprint}>
                      <td style={{ padding: "8px" }}>
                        {d.fingerprint === "unknown"
                          ? "Unknown"
                          : d.fingerprint.slice(0, 10) + "…"}
                      </td>
                      <td style={{ padding: "8px" }}>{d.total}</td>
                      <td style={{ padding: "8px" }}>{d.first}</td>
                      <td style={{ padding: "8px" }}>{d.repeat}</td>
                      <td style={{ padding: "8px" }}>
                        {d.city || d.state
                          ? `${d.city ?? "-"}, ${d.state ?? "-"}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Batch performance table – early bad batch detection */}
          <section
            style={{
              marginTop: 24,
              marginBottom: 40,
              background: "rgba(15,23,42,0.9)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginBottom: 12 }}>
              Batch Performance (Top 20 by scans)
            </h2>
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
                    <th style={{ textAlign: "left", padding: "8px" }}>Batch</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Total</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Verified
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Fake</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Expired
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Fake % (flag)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batchData.map((b) => {
                    const fakePct =
                      b.total > 0 ? Math.round((b.fake / b.total) * 100) : 0;
                    const flag = fakePct >= 20 ? "⚠️" : "";
                    return (
                      <tr key={b.batch}>
                        <td style={{ padding: "8px" }}>{b.batch}</td>
                        <td style={{ padding: "8px" }}>{b.total}</td>
                        <td style={{ padding: "8px" }}>{b.verified}</td>
                        <td style={{ padding: "8px" }}>{b.fake}</td>
                        <td style={{ padding: "8px" }}>{b.expired}</td>
                        <td
                          style={{
                            padding: "8px",
                            color: fakePct >= 20 ? "#f97316" : "white",
                          }}
                        >
                          {fakePct}% {flag}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 8, fontSize: "0.8rem", opacity: 0.8 }}>
              Any batch with Fake% ≥ 20% is a candidate for investigation or
              recall.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
