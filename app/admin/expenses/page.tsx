"use client";
import { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// --- LOCKED UI CONFIGURATION ---
const BUSINESS_MAP: any = {
  "Raw Materials": { items: ["Bottle Cap", "Preform", "PVC Sheet", "Boxes", "Stickers", "Labels"], color: "#3b82f6", bg: "#eff6ff", icon: "📦" },
  "Utilities": { items: ["Electricity", "Water", "Internet"], color: "#10b981", bg: "#ecfdf5", icon: "⚡" },
  "Operations": { items: ["Rent", "Maintenance", "Repairs"], color: "#f59e0b", bg: "#fffbeb", icon: "⚙️" },
  "Logistics": { items: ["Transport", "Shipping", "Fuel"], color: "#8b5cf6", bg: "#f5f3ff", icon: "🚛" },
  "Miscellaneous": { items: ["Other"], color: "#64748b", bg: "#f8fafc", icon: "📎" }
};

export default function FinalExpenseDashboard() {
  const supabase = createClientComponentClient();
  
  // Data States
  const [expenses, setExpenses] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [fCat, setFCat] = useState("All");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  // Form States
  const [mainCat, setMainCat] = useState("Raw Materials");
  const [subItem, setSubItem] = useState("Bottle Cap");
  const [customName, setCustomName] = useState("");
  const [amt, setAmt] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  // --- API: FETCH DATA ---
  const refreshData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  // --- LOGIC: SYNCED DROPDOWNS ---
  const handleMainCatChange = (val: string) => {
    setMainCat(val);
    setSubItem(BUSINESS_MAP[val].items[0]);
  };

  // --- LOGIC: FILTERS & CHART ---
  const filteredRows = useMemo(() => {
    return expenses.filter(x => {
      const matchCat = fCat === "All" || x.category.includes(fCat);
      const matchStart = !fStart || x.expense_date >= fStart;
      const matchEnd = !fEnd || x.expense_date <= fEnd;
      return matchCat && matchStart && matchEnd;
    });
  }, [expenses, fCat, fStart, fEnd]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const stats = months.map(m => ({ month: m, total: 0 }));
    expenses.forEach(ex => {
      const mIdx = new Date(ex.expense_date).getMonth();
      if (mIdx >= 0 && mIdx < 12) stats[mIdx].total += Number(ex.amount);
    });
    const maxVal = Math.max(...stats.map(s => s.total), 1);
    return { stats, maxVal };
  }, [expenses]);

  const totalSpent = filteredRows.reduce((acc, curr) => acc + Number(curr.amount), 0);

  // --- API: SAVE / UPDATE ---
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isMisc = mainCat === "Miscellaneous";
    const payload = {
      expense_date: entryDate,
      category: isMisc ? `Misc: ${customName}` : mainCat,
      item_name: isMisc ? customName : subItem,
      amount: parseFloat(amt)
    };

    try {
      if (editingId) {
        await supabase.from('business_expenses').update(payload).eq('id', editingId);
      } else {
        await supabase.from('business_expenses').insert([payload]);
      }
      // Reset Form
      setEditingId(null); setAmt(""); setCustomName("");
      refreshData();
    } catch (err) {
      alert("Error saving data. Check console.");
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setAmt(row.amount.toString());
    setEntryDate(row.expense_date);
    if (row.category.startsWith("Misc:")) {
      setMainCat("Miscellaneous");
      setCustomName(row.item_name);
    } else {
      setMainCat(row.category);
      setSubItem(row.item_name);
    }
  };

  return (
    <div style={ui.wrapper}>
      {/* 1. TOP ANALYTICS STRIP */}
      <header style={ui.header}>
        <div style={ui.statCard}>
          <label style={ui.capsLabel}>Active Filter Burn</label>
          <div style={ui.statVal}>₹{totalSpent.toLocaleString('en-IN')}</div>
        </div>
        
        <div style={{...ui.statCard, flex: 2}}>
          <label style={ui.capsLabel}>Annual Expenditure Trend</label>
          <div style={ui.chartArea}>
            {chartData.stats.map(s => (
              <div key={s.month} style={ui.chartCol}>
                <div style={ui.barTrack}>
                  <div style={{...ui.barFill, height: `${(s.total / chartData.maxVal) * 100}%`}}>
                    {s.total > 0 && <span style={ui.barTip}>₹{(s.total/1000).toFixed(0)}k</span>}
                  </div>
                </div>
                <span style={ui.chartMonth}>{s.month}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 2. PERSISTENT FILTER BAR */}
      <section style={ui.filterBar}>
        <div style={ui.fGroup}>
          <label style={ui.fLabel}>Category View</label>
          <select value={fCat} onChange={e => setFCat(e.target.value)} style={ui.fInput}>
            <option value="All">All Categories</option>
            {Object.keys(BUSINESS_MAP).map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div style={ui.fGroup}>
          <label style={ui.fLabel}>Date Range</label>
          <div style={{display:'flex', gap:'10px'}}>
            <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} style={ui.fInput} />
            <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} style={ui.fInput} />
          </div>
        </div>
        <button onClick={() => {setFCat("All"); setFStart(""); setFEnd("");}} style={ui.resetBtn}>Clear Filters</button>
      </section>

      {/* 3. CORE INTERFACE */}
      <div style={ui.mainGrid}>
        <aside style={ui.sideCard}>
          <h3 style={{margin: '0 0 20px 0'}}>{editingId ? "📝 Edit Record" : "➕ Log Expense"}</h3>
          <form onSubmit={onSave} style={ui.form}>
            <label style={ui.fLabel}>Main Category</label>
            <select value={mainCat} onChange={e => handleMainCatChange(e.target.value)} style={ui.input}>
              {Object.keys(BUSINESS_MAP).map(k => <option key={k}>{k}</option>)}
            </select>

            <label style={ui.fLabel}>Specific Item</label>
            {mainCat === "Miscellaneous" ? (
              <input placeholder="Item description..." value={customName} onChange={e => setCustomName(e.target.value)} style={ui.input} required />
            ) : (
              <select value={subItem} onChange={e => setSubItem(e.target.value)} style={ui.input}>
                {BUSINESS_MAP[mainCat].items.map((item: string) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}

            <label style={ui.fLabel}>Amount (INR)</label>
            <input type="number" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} style={ui.input} required />
            
            <label style={ui.fLabel}>Expense Date</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={ui.input} />

            <button type="submit" style={ui.saveBtn}>{editingId ? "Save Changes" : "Log Transaction"}</button>
            {editingId && <button type="button" onClick={() => setEditingId(null)} style={{...ui.saveBtn, background:'#94a3b8', marginTop:'-5px'}}>Cancel</button>}
          </form>
        </aside>

        <main style={ui.tableCard}>
          <table style={ui.table}>
            <thead style={ui.thRow}>
              <tr>
                <th style={ui.th}>DATE</th>
                <th style={ui.th}>CATEGORY</th>
                <th style={ui.th}>DESCRIPTION</th>
                <th style={ui.th}>AMOUNT</th>
                <th style={ui.th}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const base = row.category.includes('Misc:') ? "Miscellaneous" : row.category;
                const set = BUSINESS_MAP[base] || BUSINESS_MAP["Miscellaneous"];
                return (
                  <tr key={row.id} style={ui.tr}>
                    <td style={ui.td}>{new Date(row.expense_date).toLocaleDateString('en-IN')}</td>
                    <td style={ui.td}>
                      <span style={{...ui.badge, color: set.color, backgroundColor: set.bg}}>
                        {set.icon} {row.category}
                      </span>
                    </td>
                    <td style={ui.td}>{row.item_name}</td>
                    <td style={ui.tdAmt}>₹{Number(row.amount).toLocaleString('en-IN')}</td>
                    <td style={ui.td}>
                      <button onClick={() => handleEdit(row)} style={ui.editBtn}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredRows.length === 0 && <p style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>No expenses found.</p>}
        </main>
      </div>
    </div>
  );
}

// --- FINAL STYLING ---
const ui: any = {
  wrapper: { padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', gap: '20px', marginBottom: '30px' },
  statCard: { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1 },
  capsLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '10px' },
  statVal: { fontSize: '34px', fontWeight: '900', color: '#0f172a' },
  chartArea: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  barTrack: { width: '100%', background: '#f1f5f9', borderRadius: '4px', flex: 1, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', background: '#1e293b', position: 'relative', transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)' },
  barTip: { position: 'absolute', top: '-18px', width: '100%', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#1e293b' },
  chartMonth: { fontSize: '10px', marginTop: '6px', color: '#64748b', fontWeight: '700' },
  filterBar: { background: '#0f172a', color: '#fff', padding: '20px 30px', borderRadius: '20px', display: 'flex', gap: '40px', marginBottom: '30px', alignItems: 'flex-end' },
  fGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  fLabel: { fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' },
  fInput: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '13px' },
  resetBtn: { padding: '10px 20px', background: '#334155', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  mainGrid: { display: 'flex', gap: '30px' },
  sideCard: { width: '320px', background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 20px rgba(0,0,0,0.03)' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: '600' },
  saveBtn: { padding: '16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 5px 15px rgba(59,130,246,0.3)' },
  tableCard: { flex: 1, background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', textAlign: 'left' },
  th: { padding: '20px', fontSize: '11px', color: '#94a3b8', fontWeight: '800' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '18px 20px', fontSize: '14px', fontWeight: '600', color: '#475569' },
  tdAmt: { padding: '18px 20px', fontWeight: '800', color: '#0f172a', fontSize: '15px' },
  badge: { padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#475569', fontSize: '12px' }
};