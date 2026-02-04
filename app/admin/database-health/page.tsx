"use client";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for CSV export
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DatabaseHealth() {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastBackup, setLastBackup] = useState<string>("Never");
  const [stats, setStats] = useState({ used: 0, limit: 524288000, tableCount: 0 });

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/sync");
      const data = await res.json();
      if (res.ok) {
        setStats({ used: data.usedBytes, limit: data.limitBytes, tableCount: data.tableCount });
        setTables(data.availableTables || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data");
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const savedTime = localStorage.getItem("last_backup_time");
    if (savedTime) setLastBackup(savedTime);
  }, []);

  const toggleTable = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const selectAll = () => setSelected(tables);

  // SEARCH LOGIC
  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  // 📥 BULLETPROOF CSV DOWNLOAD LOGIC
  const downloadCSV = async () => {
    if (selected.length === 0) return Swal.fire("Selection Required", "Select a table first", "info");
    
    setLoading(true);
    Swal.fire({ title: 'Preparing Exports...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      for (const tableName of selected) {
        const { data, error } = await supabase.from(tableName).select('*');
        
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          const headers = Object.keys(data[0]).join(",");
          const rows = data.map(row => 
            Object.values(row).map(val => {
              let str = String(val === null ? "" : val);
              return `"${str.replace(/"/g, '""')}"`;
            }).join(",")
          ).join("\n");
          
          const csvContent = headers + "\n" + rows;
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Small pause to prevent browser from blocking multiple files
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
      Swal.fire("Export Complete", `Processed ${selected.length} table(s).`, "success");
    } catch (e: any) {
      Swal.fire("Export Failed", e.message, "error");
    }
    setLoading(false);
  };

  // ⚙️ SYSTEM ACTIONS (SYNC, RESTORE, PURGE)
  const triggerAction = async (method: string, title: string) => {
    if (selected.length === 0) return Swal.fire("Selection Required", "Please select at least one table.", "info");

    const { value: password } = await Swal.fire({
      title: 'Security Verification',
      text: `Confirm ${title} for ${selected.length} tables?`,
      input: 'password',
      showCancelButton: true,
      confirmButtonColor: method === 'DELETE' ? '#ef4444' : '#0f172a'
    });

    if (password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
       if(password) Swal.fire("Error", "Incorrect Password", "error");
       return;
    }

    setLoading(true);
    Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch("/api/admin/sync", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedTables: selected })
      });
      const data = await res.json();
      
      if (res.ok) {
        Swal.fire("Operation Successful", data.message, "success");
        if (data.timestamp) {
            setLastBackup(data.timestamp);
            localStorage.setItem("last_backup_time", data.timestamp);
        }
        fetchDashboardData();
      } else throw new Error(data.error);
    } catch (e: any) { 
        Swal.fire("Error", e.message, "error"); 
    } finally {
        setLoading(false);
    }
  };

  const usagePercent = Number(((stats.used / stats.limit) * 100).toFixed(2));

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "40px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div>
            <Link href="/admin/scan-dashboard" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem" }}>← Back to Manager</Link>
            <h1 style={{ margin: "10px 0 0", fontSize: "2.2rem", fontWeight: "800", color: "#0f172a" }}>Infrastructure Health</h1>
            <p style={{ color: "#64748b", margin: 0 }}>System Logs: Last Synced on <strong>{lastBackup}</strong></p>
          </div>
          <button onClick={fetchDashboardData} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: "600" }}>🔄 Refresh Stats</button>
        </header>

        {/* STORAGE GRAPH CARD */}
        <div style={{ background: "#fff", padding: "30px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "15px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Database Capacity</span>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#0f172a" }}>{usagePercent}% <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: "400" }}>Used</span></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{stats.tableCount} Tables</div>
              <div style={{ fontSize: "0.9rem", color: "#64748b" }}>{(stats.used / 1024 / 1024).toFixed(2)} MB of 500 MB</div>
            </div>
          </div>
          <div style={{ width: "100%", height: "14px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ 
                width: `${usagePercent}%`, 
                height: "100%", 
                background: usagePercent > 80 ? "#ef4444" : "#0f172a", 
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" 
            }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "30px", alignItems: "start" }}>
          
          {/* LEFT: TABLE SELECTION (SCROLLABLE) */}
          <div style={{ background: "#fff", padding: "25px", borderRadius: "20px", border: "1px solid #e2e8f0", position: "sticky", top: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0 }}>Select Tables</h3>
              <button onClick={selectAll} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}>Select All</button>
            </div>

            <input 
              type="text" 
              placeholder="Filter tables..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "15px", boxSizing: "border-box" }}
            />
            
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
              {filteredTables.length > 0 ? filteredTables.map(table => (
                <label key={table} style={tableRowStyle(selected.includes(table))}>
                  <input 
                    type="checkbox" 
                    checked={selected.includes(table)} 
                    onChange={() => toggleTable(table)} 
                  />
                  <span style={{ fontWeight: "500", fontSize: "0.9rem" }}>{table}</span>
                </label>
              )) : <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "20px" }}>No tables found</p>}
            </div>
          </div>

          {/* RIGHT: ACTIONS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <ActionCard 
               title="Cloud Synchronization" 
               desc="Push selected tables to Google Sheets. Automatically creates missing tabs."
               btn="Push to Sheets" 
               color="#0f172a"
               onClick={() => triggerAction("POST", "Backup")} 
            />
            <ActionCard 
               title="Database Restore" 
               desc="Pull data from Google Sheets to overwrite local Supabase tables."
               btn="Restore from Sheets" 
               color="#0f172a"
               outline
               onClick={() => triggerAction("PUT", "Restore")} 
            />
            <ActionCard 
               title="Local CSV Export" 
               desc="Download selected tables directly to your computer as .csv files."
               btn="Download CSV" 
               color="#2563eb"
               onClick={downloadCSV} 
            />
            <ActionCard 
               title="Emergency Purge" 
               desc="Wipe records from selected tables. This action is irreversible!"
               btn="Purge Selected" 
               color="#ef4444"
               onClick={() => triggerAction("DELETE", "Purge")} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}

// UI Components
function ActionCard({ title, desc, btn, onClick, color, outline }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "25px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: "0 0 5px 0", fontSize: "1.1rem" }}>{title}</h4>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b", maxWidth: "400px" }}>{desc}</p>
      </div>
      <button onClick={onClick} style={{
        background: outline ? "transparent" : color,
        color: outline ? color : "#fff",
        border: `2px solid ${color}`,
        padding: "12px 24px",
        borderRadius: "10px",
        fontWeight: "700",
        cursor: "pointer",
        minWidth: "160px",
        transition: "0.2s"
      }}>{btn}</button>
    </div>
  );
}

const tableRowStyle = (active: boolean) => ({
  display: "flex", 
  alignItems: "center", 
  gap: "12px", 
  padding: "10px 12px", 
  borderRadius: "10px",
  background: active ? "#f1f5f9" : "transparent",
  cursor: "pointer",
  transition: "0.1s",
  border: active ? "1px solid #e2e8f0" : "1px solid transparent"
});