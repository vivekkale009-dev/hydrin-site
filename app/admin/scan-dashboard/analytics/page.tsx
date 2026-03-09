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
  AreaChart,
  Area,
} from "recharts";

// --- TYPES ---
type DailyPoint = { date: string; verified: number; fake: number; expired: number; total: number; };
type CityPoint = { city: string; total: number; verified: number; fake: number; expired: number; };
type DevicePoint = { fingerprint: string; total: number; first: number; repeat: number; city: string | null; state: string | null; };
type BatchPoint = { batch: string; total: number; verified: number; fake: number; expired: number; };
type InsightsResponse = {
  summary: { verified: number; fake: number; expired: number };
  daily: DailyPoint[];
  byCity: CityPoint[];
  byDevice: DevicePoint[];
  byBatch: BatchPoint[];
};

// --- SUB-COMPONENTS ---
function KPICard({ label, value, trend, color }: any) {
  return (
    <div style={{ background: "white", padding: "24px", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <p style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "2rem", fontWeight: 900, color: color }}>{value}</span>
        <span style={{ fontSize: "12px", color: color === "#ef4444" ? "#ef4444" : "#10b981", fontWeight: 700 }}>{trend}</span>
      </div>
    </div>
  );
}

export default function ScanAnalytics() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setFrom(fromStr);
    setTo(toStr);
  }, []);

  useEffect(() => {
    if (from && to) fetchData();
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
      setError("Failed to sync analytics engine.");
    } finally {
      setLoading(false);
    }
  }

  const dailyData = data?.daily ?? [];
  const cityData = data?.byCity ?? [];
  const deviceData = data?.byDevice ?? [];
  const batchData = data?.byBatch ?? [];

  // Table Styles
  const TableContainerStyle = { background: "white", borderRadius: "24px", padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" };
  const TableTitleStyle = { fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", color: "#0f172a" };
  const TableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
  const TableHeaderStyle = { color: "#94a3b8", fontSize: "10px", textTransform: "uppercase" as const, fontWeight: 800 };
  const TableCellStyle = { padding: "12px 8px", fontSize: "13px" };

  return (
    <main style={{ minHeight: "100vh", padding: "30px", background: "#f1f5f9", color: "#1e293b", fontFamily: "Inter, system-ui, sans-serif" }}>
      
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px", maxWidth: "1400px", margin: "0 auto 30px auto" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            Scan <span style={{ color: "#10b981" }}>Intelligence</span> Portal
          </h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>Forensics & Batch Tracking</p>
        </div>
        <a href="/admin/scan-dashboard" style={{ textDecoration: "none", color: "#6366f1", fontWeight: 600 }}>← Back</a>
      </header>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <section style={{ background: "white", borderRadius: "20px", padding: "24px", display: "flex", gap: "24px", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "32px", border: "1px solid #e2e8f0" }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          <button onClick={fetchData} style={{ padding: "10px 20px", borderRadius: "10px", background: "#0f172a", color: "white", cursor: "pointer" }}>Sync Engine</button>
        </section>

        {!data ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading Forensics...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
              <KPICard label="Total Scans" value={data.summary.verified + data.summary.fake + data.summary.expired} trend="Live" color="#0f172a" />
              <KPICard label="Verified" value={data.summary.verified} trend="Secure" color="#10b981" />
              <KPICard label="Fake" value={data.summary.fake} trend="Critical" color="#ef4444" />
              <KPICard label="Expired" value={data.summary.expired} trend="Alert" color="#f59e0b" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "32px" }}>
              <div style={TableContainerStyle}>
                <h3 style={TableTitleStyle}>Timeline Forensic Analysis</h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <AreaChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Area type="monotone" dataKey="verified" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                      <Line type="monotone" dataKey="fake" stroke="#ef4444" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={TableContainerStyle}>
                <h3 style={TableTitleStyle}>Top Cities</h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={cityData.slice(0, 8)} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="city" type="category" fontSize={10} width={70} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={TableContainerStyle}>
                    <h3 style={TableTitleStyle}>Device Identity</h3>
                    <table style={TableStyle}>
                        <thead>
                            <tr style={TableHeaderStyle}>
                                <th style={TableCellStyle}>Fingerprint</th>
                                <th style={TableCellStyle}>Scans</th>
                                <th style={TableCellStyle}>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deviceData.slice(0, 10).map((d) => (
                                <tr key={d.fingerprint} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={TableCellStyle}>{d.fingerprint.slice(0, 10)}...</td>
                                    <td style={TableCellStyle}>{d.total}</td>
                                    <td style={TableCellStyle}>{d.city || "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={TableContainerStyle}>
                    <h3 style={TableTitleStyle}>Batch Integrity</h3>
                    <table style={TableStyle}>
                        <thead>
                            <tr style={TableHeaderStyle}>
                                <th style={TableCellStyle}>Batch</th>
                                <th style={TableCellStyle}>Total</th>
                                <th style={TableCellStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batchData.slice(0, 10).map((b) => {
                                const fakePct = b.total > 0 ? (b.fake / b.total) * 100 : 0;
                                return (
                                    <tr key={b.batch} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={TableCellStyle}>{b.batch}</td>
                                        <td style={TableCellStyle}>{b.total}</td>
                                        <td style={TableCellStyle}>
                                            <span style={{ color: fakePct > 20 ? "#ef4444" : "#10b981", fontWeight: 800 }}>
                                                {fakePct > 20 ? "ALERT" : "SAFE"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}