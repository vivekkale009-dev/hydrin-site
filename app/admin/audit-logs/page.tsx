"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterAction, setFilterAction] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_logs")
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(100);

    if (!error) setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const tableString = Array.isArray(log.affected_tables) 
      ? log.affected_tables.join(", ") 
      : (log.affected_tables || "");
    
    const matchesAction = filterAction === "" || log.action === filterAction;
    const matchesTable = filterTable === "" || tableString.toLowerCase().includes(filterTable.toLowerCase());
    const matchesDate = filterDate === "" || new Date(log.performed_at).toLocaleDateString().includes(new Date(filterDate).toLocaleDateString());

    return matchesAction && matchesTable && matchesDate;
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "40px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <header style={{ marginBottom: "30px" }}>
          <Link href="/admin/database-health" style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.9rem", fontWeight: "600" }}>
            ← Back to Infrastructure Health
          </Link>
          <h1 style={{ marginTop: "15px", fontSize: "2rem", color: "#0f172a", fontWeight: "800" }}>System Audit Logs</h1>
          <p style={{ color: "#64748b" }}>Track every administrative action performed on the database.</p>
        </header>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap", background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={labelStyle}>Filter by Action</label>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={inputStyle}>
              <option value="">All Actions</option>
              <option value="RESTORE">RESTORE</option>
              <option value="SHEETS_BACKUP">SHEETS_BACKUP</option>
              <option value="PURGE">PURGE</option>
              <option value="CSV_IMPORT">CSV_IMPORT</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={labelStyle}>Filter by Table Name</label>
            <input 
              type="text" 
              placeholder="e.g. user_roles" 
              value={filterTable} 
              onChange={(e) => setFilterTable(e.target.value)} 
              style={inputStyle} 
            />
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={labelStyle}>Filter by Date</label>
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
              style={inputStyle} 
            />
          </div>
          <button onClick={() => {setFilterAction(""); setFilterTable(""); setFilterDate("");}} style={resetBtnStyle}>Reset</button>
        </div>

        {/* Scrollable Table Container */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Tables Affected</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No logs match your filters.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{...tdStyle, whiteSpace: "nowrap"}}>{new Date(log.performed_at).toLocaleString()}</td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(log.action)}>{log.action}</span>
                    </td>
                    <td style={{...tdStyle, maxWidth: "300px", wordWrap: "break-word"}}>
                      {Array.isArray(log.affected_tables) 
                        ? log.affected_tables.join(", ") 
                        : log.affected_tables}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.85rem", color: "#64748b", minWidth: "250px" }}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = { padding: "15px 20px", fontSize: "0.85rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "15px 20px", fontSize: "0.9rem", color: "#1e293b", verticalAlign: "top" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", marginBottom: "5px", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" };
const resetBtnStyle: React.CSSProperties = { alignSelf: "flex-end", padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" };

const badgeStyle = (action: string) => {
  let bg = "#e2e8f0";
  let color = "#475569";
  if (action === "PURGE") { bg = "#fee2e2"; color = "#dc2626"; }
  if (action === "RESTORE") { bg = "#e0e7ff"; color = "#4338ca"; }
  if (action === "CSV_IMPORT") { bg = "#dcfce7"; color = "#15803d"; }
  if (action === "SHEETS_BACKUP") { bg = "#fef9c3"; color = "#a16207"; }

  return {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "700",
    background: bg,
    color: color,
    display: "inline-block",
    whiteSpace: "nowrap"
  };
};