"use client";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for metadata & CSV template generation
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

  // 📥 DOWNLOAD BLANK TEMPLATE (Kept original logic)
  const downloadTemplate = async () => {
    if (selected.length !== 1) return Swal.fire("Selection Required", "Select one table to generate a template.", "info");
    setLoading(true);
    try {
      const { data: columnData, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name_input: selected[0] });

      let headers = "";
      if (!schemaError && columnData && columnData.length > 0) {
        headers = columnData.map((c: any) => c.column_name).join(",");
      } else {
        const { data: rowData } = await supabase.from(selected[0]).select('*').limit(1);
        if (rowData && rowData.length > 0) headers = Object.keys(rowData[0]).join(",");
        else headers = "id,created_at"; 
      }

      const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${selected[0]}_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      Swal.fire("Template Error", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 📤 SECURE CSV IMPORT
  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selected.length !== 1) {
      Swal.fire("Error", "Please select exactly ONE table to import into.", "warning");
      return;
    }

    const { value: password } = await Swal.fire({
      title: 'Admin Verification',
      text: `Confirm CSV import for ${selected[0]}`,
      input: 'password',
      showCancelButton: true,
    });
    if (!password) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const text = event.target?.result as string;
        const [headerLine, ...rows] = text.split("\n").filter(line => line.trim() !== "");
        const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ''));

        const formattedData = rows.map(row => {
          const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          const obj: any = {};
          headers.forEach((h, i) => {
            const val = values[i];
            if (val === "true") obj[h] = true;
            else if (val === "false") obj[h] = false;
            else if (!isNaN(Number(val)) && val !== "") obj[h] = Number(val);
            else obj[h] = val === "" ? null : val;
          });
          return obj;
        });

        // Use Secure API for Import
        const res = await fetch("/api/admin/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            action: "IMPORT", 
            tableName: selected[0], 
            data: formattedData, 
            password 
          })
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error);

        Swal.fire("Success", `Imported ${formattedData.length} rows into ${selected[0]}`, "success");
        fetchDashboardData();
      } catch (err: any) {
        Swal.fire("Import Failed", err.message, "error");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/db-metadata"); 
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
  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  // 💾 LOCAL CSV EXPORT (Kept original logic - read only)
  const downloadCSV = async () => {
    if (selected.length === 0) return Swal.fire("Selection Required", "Select a table first", "info");
    setLoading(true);
    Swal.fire({ title: 'Preparing Exports...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      for (const tableName of selected) {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) continue;
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
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
      Swal.fire("Export Complete", `Processed ${selected.length} table(s).`, "success");
    } catch (e: any) {
      Swal.fire("Export Failed", e.message, "error");
    }
    setLoading(false);
  };

  // ⚡ SECURE TRIGGER (BACKUP, RESTORE, PURGE)
// ⚡ SECURE TRIGGER (BACKUP, RESTORE, PURGE)
  const triggerAction = async (method: string, title: string) => {
    if (selected.length === 0) return Swal.fire("Selection Required", "Please select at least one table.", "info");

    let isDryRun = false;
    if (method === 'PUT') {
      const result = await Swal.fire({
        title: 'Restore Mode',
        text: "Choose between a test run or actual data sync.",
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Actual Restore',
        denyButtonText: 'Dry Run (Test)',
        cancelButtonText: 'Abort',
        confirmButtonColor: '#0f172a',
        denyButtonColor: '#6366f1',
      });
      if (result.isDismissed) return;
      isDryRun = result.isDenied;
    }

    const { value: password } = await Swal.fire({
      title: 'Security Verification',
      text: `Confirm ${isDryRun ? 'DRY RUN' : title} for ${selected.length} tables?`,
      input: 'password',
      showCancelButton: true,
    });

    // We only check if the user provided a password string at all
    if (!password) return;

    setLoading(true);
    Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch("/api/admin/sync", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          selectedTables: selected, 
          dryRun: isDryRun, 
          password: password // Send directly to server to verify
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // If password is wrong, server returns 401/500 which is caught here
        throw new Error(data.error || "Action failed");
      }

      if (data.isDryRun) {
        if (!data.details || data.details.length === 0) {
          return Swal.fire("Dry Run Empty", "The server returned no details for the selected tables.", "warning");
        }

        const summaryHtml = data.details.map((d: any) => {
          const hasKey = d.keysUsed && d.keysUsed !== "None" && d.keysUsed !== "";
          return `
          <div style="text-align: left; margin-bottom: 12px; padding: 12px; background: ${hasKey ? '#f8fafc' : '#fef2f2'}; border-radius: 8px; border: 1px solid ${hasKey ? '#e2e8f0' : '#fecaca'};">
            <strong style="color: ${hasKey ? '#0f172a' : '#991b1b'};">${d.table}</strong><br/>
            <span style="font-size: 0.9rem;">Rows detected: <strong>${d.rowsToSync ?? 0}</strong></span><br/>
            <small style="color: ${hasKey ? '#6366f1' : '#dc2626'}; font-weight: ${hasKey ? '400' : '700'};">
              ${hasKey ? `Primary Key Target: ${d.keysUsed}` : '⚠️ NO PRIMARY KEY DETECTED'}
            </small>
          </div>`;
        }).join('');

        Swal.fire({
          title: "Dry Run Results",
          width: '550px',
          html: `
            <div style="background: #fff4e5; border: 1px solid #ff9800; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
              <h5 style="margin: 0 0 8px 0; color: #b45309;">⚠️ Why Primary Keys Matter</h5>
              <p style="margin: 0; font-size: 0.85rem; color: #92400e; line-height: 1.4;">
                The <strong>Primary Key</strong> is the unique fingerprint for your data.
                <br/><br/>
                • <strong>Prevents Duplicates:</strong> Without it, every restore would create double rows.<br/>
                • <strong>Updates Data:</strong> It tells the system: "If this row exists, update it. If not, create it."
              </p>
            </div>
            <div style="max-height: 300px; overflow-y: auto; padding-right: 5px; border-top: 1px dashed #cbd5e1; pt: 15px;">
              <p style="text-align: left; font-size: 0.8rem; color: #64748b; margin-bottom: 10px; font-weight: 600;">TABLE ANALYSIS:</p>
              ${summaryHtml}
            </div>
          `,
          icon: "info",
          confirmButtonText: "I Understand",
          confirmButtonColor: "#0f172a"
        });
      } else {
        Swal.fire("Success", data.message, "success");
        fetchDashboardData();
      }
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
    <div style={{ display: "flex", gap: "15px", alignItems: "center", marginTop: "5px" }}>
       <p style={{ color: "#64748b", margin: 0 }}>Last Synced: <strong>{lastBackup}</strong></p>
       <span style={{ color: "#e2e8f0" }}>|</span>
       <Link href="/admin/audit-logs" style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.9rem", fontWeight: "600" }}>View Audit Logs →</Link>
    </div>
  </div>
  <button onClick={fetchDashboardData} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: "600" }}>🔄 Refresh Stats</button>
</header>

        {/* Usage Card */}
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
          {/* Sidebar */}
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

          {/* Action Cards */}
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
              desc="Pull from Google Sheets. Supports Dry Run tests and Composite Keys."
              btn="Restore from Sheets"
              color="#0f172a"
              outline
              onClick={() => triggerAction("PUT", "Restore")}
            />
            <ActionCard
              title="CSV Template"
              desc="Download a blank CSV with correct headers for the selected table."
              btn="Download Template"
              color="#6366f1"
              onClick={downloadTemplate}
            />
            <input type="file" id="csvImport" accept=".csv" hidden onChange={importCSV} />
            <ActionCard
              title="Local CSV Import"
              desc="Upload a .csv file from your computer to sync into the selected table."
              btn="Upload CSV"
              color="#16a34a"
              onClick={() => {
                if (selected.length !== 1) return Swal.fire("Select Table", "Select exactly one table first", "info");
                document.getElementById('csvImport')?.click();
              }}
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