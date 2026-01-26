"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DistributorListPage() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchData(q?: string) {
    setLoading(true);
    try {
      const url = q ? `/api/admin/distributors/list?q=${encodeURIComponent(q)}` : `/api/admin/distributors/list`;
      const res = await fetch(url);
      const data = await res.json();
      setList(data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // --- ACTIONS ---
  
  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Stops the row click (navigation) from firing
    if (!confirm(`Are you sure you want to permanently delete ${name}?`)) return;
    
    try {
      const res = await fetch(`/api/admin/distributors/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (res.ok) {
        // Remove the item from the local state so the UI updates immediately
        setList(prev => prev.filter(item => item.id !== id));
      } else {
        alert("Failed to delete distributor.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleBlock = async (e: React.MouseEvent, distributor: any) => {
    e.stopPropagation(); // Stops the row click (navigation) from firing
    const newStatus = !distributor.is_active;
    let reason = "";
    
    if (distributor.is_active) {
      reason = window.prompt("Enter reason for blocking:") || "";
      if (reason === "") return; // If they cancel the prompt
    }

    try {
      const res = await fetch(`/api/admin/distributors/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: distributor.id, 
          is_active: newStatus, 
          blocked_reason: reason 
        }),
      });

      if (res.ok) {
        // Update the local state to reflect the block/unblock immediately
        setList(prev => prev.map(item => 
          item.id === distributor.id 
          ? { ...item, is_active: newStatus, blocked_reason: reason } 
          : item
        ));
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Stops the row click (navigation) from firing
    router.push(`/admin/distributors/edit/${id}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Distributor Network</h1>
            <p style={styles.subHeading}>Click any distributor to view assigned orders and dues.</p>
          </div>
          <button onClick={() => router.push("/admin/distributors/create")} style={styles.registerBtn}>
            + Register Distributor
          </button>
        </div>

        <div style={styles.card}>
          <form onSubmit={(e) => { e.preventDefault(); fetchData(search); }} style={styles.searchBar}>
            <input
              placeholder="Search by name, phone or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            <button style={styles.searchButton}>Search</button>
          </form>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Distributor Info</th>
                  <th style={styles.th}>City</th>
                  <th style={styles.th}>Rate/KM</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={styles.loader}>Syncing with database...</td></tr>
                ) : list.map((d) => (
                  <tr 
                    key={d.id} 
                    style={styles.tr} 
                    onClick={() => router.push(`/admin/distributors/view/${d.id}`)}
                  >
                    <td style={styles.td}>
                      <div style={styles.nameLabel}>{d.name}</div>
                      <div style={styles.phoneLabel}>{d.phone}</div>
                    </td>
                    <td style={styles.td}>{d.city || "—"}</td>
                    <td style={styles.td}>₹{d.delivery_rate_per_km}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                            ...styles.status,
                            background: d.is_active ? "#dcfce7" : "#fee2e2",
                            color: d.is_active ? "#15803d" : "#b91c1c"
                        }}>
                          {d.is_active ? "● Active" : "● Blocked"}
                        </span>
                        {!d.is_active && d.blocked_reason && (
                          <small style={{ color: '#ef4444', fontSize: '10px', fontWeight: 'bold' }}>
                            {d.blocked_reason}
                          </small>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button style={styles.editBtn} onClick={(e) => handleEdit(e, d.id)}>✏️</button>
                        <button style={styles.blockBtn} onClick={(e) => handleBlock(e, d)}>🚫</button>
                        <button style={styles.deleteBtn} onClick={(e) => handleDelete(e, d.id, d.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", backgroundPosition: "center", position: "relative", fontFamily: "'Inter', sans-serif" },
  overlay: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)" },
  container: { position: "relative", zIndex: 1, padding: "40px", maxWidth: "1200px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" },
  heading: { color: "#fff", fontSize: "28px", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" },
  subHeading: { color: "#94a3b8", fontSize: "14px", margin: "5px 0 0 0" },
  registerBtn: { background: "#3b82f6", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", transition: "0.2s", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)" },
  card: { background: "rgba(255, 255, 255, 0.98)", borderRadius: "20px", padding: "24px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", overflow: "hidden" },
  searchBar: { display: "flex", gap: "12px", marginBottom: "24px" },
  searchInput: { flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "15px", outline: "none", background: "#f8fafc" },
  searchButton: { background: "#1e293b", color: "#fff", border: "none", padding: "0 30px", borderRadius: "12px", fontWeight: "600", cursor: "pointer" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" },
  th: { textAlign: "left", padding: "12px 16px", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700" },
  tr: { background: "#fff", transition: "0.2s", cursor: "pointer" },
  td: { padding: "16px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#334155" },
  nameLabel: { fontWeight: "700", color: "#1e293b", fontSize: "15px" },
  phoneLabel: { color: "#64748b", fontSize: "12px", marginTop: "2px" },
  status: { padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", display: "inline-block" },
  actionGroup: { display: "flex", gap: "8px" },
  editBtn: { background: "#f1f5f9", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" },
  blockBtn: { background: "#fff1f2", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" },
  deleteBtn: { background: "#fef2f2", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" },
  loader: { textAlign: "center", padding: "40px", color: "#64748b", fontWeight: "600" }
};