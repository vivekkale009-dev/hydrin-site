"use client";
import { useEffect, useState } from "react";

export default function CRMPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/save-to-sheet");
      const json = await res.json();
      if (json.success) {
        const sorted = json.data.sort((a: any, b: any) => {
          const parseDate = (d: string) => {
            const parts = d.split(',')[0].split('/');
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
          };
          return parseDate(b.date) - parseDate(a.date);
        });
        setLeads(sorted);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleStatusChange = async (rowId: number, status: string, tab: string) => {
    const res = await fetch("/api/save-to-sheet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowId, status, tab }),
    });
    if (res.ok) fetchLeads();
  };

  const filtered = leads.filter((l: any) => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm);
    const matchesCat = catFilter === "All" || l.category === catFilter || (catFilter === "ChatBot" && l.tab === "ChatBot");

    let matchesDate = true;
    if (dateFilter) {
      const [year, month, day] = dateFilter.split("-");
      const d = parseInt(day), m = parseInt(month);
      const f1 = `${d}/${m}/${year}`, f2 = `${day}/${month}/${year}`;
      matchesDate = l.date.startsWith(f1) || l.date.startsWith(f2);
    }
    return matchesSearch && matchesCat && matchesDate;
  });

  const stats = {
    form: filtered.filter(l => l.tab === "Responses").length,
    chat: filtered.filter(l => l.tab === "ChatBot").length,
    open: filtered.filter(l => l.status === "Open").length
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Open": return { bg: "#e6fffa", color: "#2c7a7b" };
      case "In-Progress": return { bg: "#fffaf0", color: "#975a16" };
      case "Closed": return { bg: "#fff5f5", color: "#c53030" };
      default: return { bg: "#f7fafc", color: "#4a5568" };
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#1a202c" }}>
            Earthy Source <span style={{ color: "#3182ce" }}>CRM</span>
          </h1>
          <p style={{ color: "#718096", fontSize: "14px" }}>Real-time Lead Management</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => { setSearchTerm(""); setCatFilter("All"); setDateFilter(""); }} style={clearBtn}>Reset Filters</button>
          <button onClick={fetchLeads} style={refreshBtn}>Refresh Data</button>
        </div>
      </header>

      <div style={statsContainer}>
        <div style={statCard}>
          <span style={statLabel}>Form Leads</span>
          <span style={statValue}>{stats.form}</span>
        </div>
        <div style={statCard}>
          <span style={statLabel}>ChatBot Leads</span>
          <span style={statValue}>{stats.chat}</span>
        </div>
        <div style={{...statCard, borderRight: 'none'}}>
          <span style={statLabel}>Pending (Open)</span>
          <span style={{...statValue, color: '#e53e3e'}}>{stats.open}</span>
        </div>
      </div>

      <div style={toolbarStyle}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Search</label>
          <input placeholder="Name or phone..." style={searchStyle} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Date Filter</label>
          <input type="date" style={selectStyle} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Category</label>
          <select style={selectStyle} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Inquiry">Inquiry</option>
            <option value="Complaint">Complaint</option>
            <option value="Dealership">Dealership</option>
            <option value="ChatBot">ChatBot Leads</option>
          </select>
        </div>
      </div>

      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={thStyle}>Lead Information</th>
              <th style={thStyle}>Inquiry Details</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Engagement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((lead: any) => {
              const style = getStatusStyle(lead.status);
              return (
                <tr key={`${lead.tab}-${lead.rowId}`} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <div style={{ fontWeight: 700, color: "#2d3748" }}>{lead.name}</div>
                       <span style={lead.tab === "ChatBot" ? sourceBadgeChat : sourceBadgeForm}>{lead.tab}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#4a5568" }}>{lead.phone}</div>
                    <div style={{ fontSize: "11px", color: "#a0aec0" }}>{lead.date}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle("#4a5568", "#edf2f7")}>{lead.category}</span>
                    <div style={msgStyle}>{lead.message || "No message."}</div>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.rowId, e.target.value, lead.tab)}
                      style={statusDropdown(style.color, style.bg)}
                    >
                      <option value="Open">Open</option>
                      <option value="In-Progress">In-Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <button 
                      onClick={() => {
                        const cleanPhone = lead.phone.replace(/\D/g, '');
                        const greeting = lead.status === "Open" ? "Warm greetings" : "Following up";
                        const message = encodeURIComponent(
`Hello ${lead.name}, 

${greeting} from *Earthy Source*! 💧

We have received your request regarding *${lead.category}* submitted on ${lead.date.split(',')[0]}. 

Our team is currently reviewing your details:
• *Name:* ${lead.name}
• *Inquiry:* ${lead.category}
• *Message:* ${lead.message || "General Inquiry"}

We are committed to providing you with the purest water intelligence solutions. One of our specialists will guide you further shortly.

In the meantime, feel free to reply here if you have any urgent questions.

*Stay Hydrated, Stay Healthy!*
— Team Earthy Source`
                        );
                        window.open(`https://wa.me/91${cleanPhone}?text=${message}`);
                      }}
                      style={waBtn}
                    >WhatsApp</button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#a0aec0" }}>No leads found for this criteria.</td></tr>
            )}
          </tbody>
        </table>
        {loading && <div style={loaderOverlay}>Refreshing...</div>}
      </div>
    </div>
  );
}

// STYLES
const statsContainer: any = { display: 'flex', background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' };
const statCard: any = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #edf2f7' };
const statLabel: any = { fontSize: '11px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' };
const statValue: any = { fontSize: '24px', fontWeight: '800', color: '#2d3748' };
const containerStyle: any = { padding: "40px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" };
const headerStyle: any = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "35px" };
const toolbarStyle: any = { display: "flex", gap: "20px", marginBottom: "25px", alignItems: "flex-end" };
const labelStyle: any = { display: "block", fontSize: "12px", fontWeight: "700", color: "#718096", marginBottom: "5px", textTransform: "uppercase" };
const searchStyle: any = { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px" };
const selectStyle: any = { width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", fontSize: "14px" };
const cardStyle: any = { background: "white", borderRadius: "20px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", overflow: "hidden", position: "relative" };
const tableStyle: any = { width: "100%", borderCollapse: "collapse" };
const theadStyle: any = { background: "#f1f5f9", textAlign: "left" };
const thStyle: any = { padding: "16px 20px", fontSize: "12px", color: "#64748b", fontWeight: "700" };
const trStyle: any = { borderBottom: "1px solid #f1f5f9" };
const tdStyle: any = { padding: "20px" };
const msgStyle: any = { fontSize: "13px", color: "#64748b", marginTop: "5px", lineHeight: "1.4" };
const badgeStyle = (color: string, bg: string): any => ({ padding: "4px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "800", backgroundColor: bg, color: color });
const statusDropdown = (color: string, bg: string): any => ({ padding: "8px 12px", borderRadius: "10px", border: "none", fontSize: "13px", fontWeight: "700", backgroundColor: bg, color: color, width: "100%", cursor: "pointer" });
const refreshBtn: any = { padding: "12px 24px", background: "#3182ce", color: "white", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: "700" };
const clearBtn: any = { padding: "12px 24px", background: "transparent", color: "#718096", borderRadius: "12px", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: "600" };
const waBtn: any = { background: "#25D366", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const loaderOverlay: any = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#3182ce" };
const sourceBadgeChat: any = { fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "#ebf8ff", color: "#2b6cb0", fontWeight: "bold", border: "1px solid #bee3f8" };
const sourceBadgeForm: any = { fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "#f7fafc", color: "#4a5568", fontWeight: "bold", border: "1px solid #e2e8f0" };