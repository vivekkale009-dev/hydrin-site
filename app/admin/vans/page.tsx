"use client";

import { useEffect, useState, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function VanListPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [vans, setVans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // Search State

  useEffect(() => {
    fetchVans();
  }, []);

  async function fetchVans() {
    try {
      const { data, error } = await supabase
        .from("vans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVans(data || []);
    } catch (err) {
      console.error("Error fetching fleet:", err);
    } finally {
      setLoading(false);
    }
  }

  // Multi-field filtration logic
  const filteredVans = useMemo(() => {
    return vans.filter((van) => {
      const search = searchQuery.toLowerCase();
      return (
        van.vehicle_number?.toLowerCase().includes(search) ||
        van.driver_name?.toLowerCase().includes(search) ||
        van.driver_phone?.includes(search)
      );
    });
  }, [vans, searchQuery]);

  return (
    <div style={ui.container}>
      <header style={ui.header}>
        <div>
          <h1 style={ui.title}>Fleet Management</h1>
          <p style={ui.subtitle}>{filteredVans.length} Vehicles Found</p>
        </div>
        <button 
          onClick={() => router.push("/admin/vans/create")} 
          style={ui.addBtn}
        >
          + Register New Van
        </button>
      </header>

      {/* SEARCH BAR SECTION */}
      <div style={ui.searchContainer}>
        <input 
          type="text"
          placeholder="Search by Van No, Name, or Mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={ui.searchInput}
        />
      </div>

      {loading ? (
        <div style={ui.loader}>Scanning Fleet...</div>
      ) : (
        <div style={ui.grid}>
          {filteredVans.map((van) => (
            <div 
              key={van.id} 
              style={ui.card} 
             // Inside app/admin/vans/page.tsx
onClick={() => router.push(`/admin/vans/view/${van.id}`)}
            >
              <div style={ui.cardHeader}>
                <span style={ui.regNumber}>{van.vehicle_number}</span>
                <span style={{ 
                  ...ui.badge, 
                  backgroundColor: van.is_active ? "#dcfce7" : "#fee2e2",
                  color: van.is_active ? "#166534" : "#991b1b"
                }}>
                  {van.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div style={ui.cardBody}>
                <h3 style={ui.driverName}>{van.driver_name}</h3>
                <p style={ui.modelText}>{van.vehicle_model || "Standard Model"}</p>
                
                <div style={ui.detailsRow}>
                  <span style={ui.detailItem}>📞 {van.driver_phone}</span>
                  <span style={ui.detailItem}>💰 ₹{van.rate_per_km}/km</span>
                </div>

                <div style={{ ...ui.ownerBadge, backgroundColor: van.is_owned_by_firm ? "#eff6ff" : "#f1f5f9" }}>
                  {van.is_owned_by_firm ? "🏢 Firm Owned Asset" : "🤝 3rd Party Contract"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && filteredVans.length === 0 && (
        <div style={ui.emptyState}>No vans match your search criteria.</div>
      )}
    </div>
  );
}

const ui: any = {
  container: { padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui", background: "#f8fafc", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { fontSize: "28px", fontWeight: "900", color: "#0f172a", margin: 0 },
  subtitle: { color: "#64748b", margin: "5px 0 0 0" },
  addBtn: { padding: "12px 24px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" },
  
  // Search Styles
  searchContainer: { marginBottom: "30px" },
  searchInput: { 
    width: "100%", 
    padding: "15px 20px", 
    borderRadius: "12px", 
    border: "2px solid #e2e8f0", 
    fontSize: "16px", 
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
  },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },
  card: { 
    background: "#fff", 
    borderRadius: "20px", 
    border: "1px solid #e2e8f0", 
    overflow: "hidden", 
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
  },
  cardHeader: { padding: "15px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" },
  regNumber: { fontWeight: "900", color: "#1e293b", letterSpacing: "1px", fontSize: "16px" },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" },
  cardBody: { padding: "20px" },
  driverName: { margin: "0 0 5px 0", fontSize: "18px", color: "#0f172a", fontWeight: "700" },
  modelText: { margin: "0 0 15px 0", color: "#64748b", fontSize: "14px" },
  detailsRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", marginBottom: "15px" },
  detailItem: { background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px" },
  ownerBadge: { padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", textAlign: "center", color: "#1e40af" },
  loader: { textAlign: "center", padding: "100px", fontSize: "18px", fontWeight: "700", color: "#94a3b8" },
  emptyState: { textAlign: "center", padding: "40px", color: "#64748b", fontWeight: "600" }
};