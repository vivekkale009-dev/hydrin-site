"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase directly for maximum reliability
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- LOCKED UI CONFIGURATION ---
const BUSINESS_MAP: any = {
  "Raw Materials": { items: ["Bottle Cap", "Preform", "PVC Sheet", "Boxes", "Stickers", "Labels"], color: "#3b82f6", bg: "#eff6ff", icon: "📦" },
  "Utilities": { items: ["Electricity", "Water", "Internet"], color: "#10b981", bg: "#ecfdf5", icon: "⚡" },
  "Operations": { items: ["Rent", "Maintenance", "Repairs"], color: "#f59e0b", bg: "#fffbeb", icon: "⚙️" },
  "Logistics": { items: ["Transport", "Shipping", "Fuel"], color: "#8b5cf6", bg: "#f5f3ff", icon: "🚛" },
  "Miscellaneous": { items: ["Other"], color: "#64748b", bg: "#f8fafc", icon: "📎" }
};

export default function FinalExpenseDashboard() {
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
  const [qty, setQty] = useState(""); 
  const [rate, setRate] = useState(""); 
  const [notes, setNotes] = useState(""); 
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (qty && rate) {
      const total = parseFloat(qty) * parseFloat(rate);
      setAmt(total.toFixed(2));
    }
  }, [qty, rate]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/expenses');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch");
      setExpenses(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const handleMainCatChange = (val: string) => {
    setMainCat(val);
    if (BUSINESS_MAP[val]) {
        setSubItem(BUSINESS_MAP[val].items[0]);
    }
  };

  const filteredRows = useMemo(() => {
    return expenses.filter(x => {
      const rawCat = x.category || "";
      const categoryToMatch = rawCat.startsWith("Misc:") ? "Miscellaneous" : rawCat;
      const matchCat = fCat === "All" || categoryToMatch === fCat;
      const matchStart = !fStart || x.expense_date >= fStart;
      const matchEnd = !fEnd || x.expense_date <= fEnd;
      return matchCat && matchStart && matchEnd;
    });
  }, [expenses, fCat, fStart, fEnd]);

  // --- ANALYTICS: CATEGORY & TOP ITEM ---
  const analytics = useMemo(() => {
    const stats: Record<string, number> = {};
    const itemTotals: Record<string, number> = {};
    Object.keys(BUSINESS_MAP).forEach(k => stats[k] = 0);
    
    filteredRows.forEach(ex => {
      const rawCat = ex.category || "";
      const base = rawCat.startsWith("Misc:") ? "Miscellaneous" : rawCat;
      const val = Number(ex.amount || 0);
      if (stats[base] !== undefined) stats[base] += val;
      
      const key = `${ex.item_name} (${base})`;
      itemTotals[key] = (itemTotals[key] || 0) + val;
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const sortedItems = Object.entries(itemTotals).sort((a, b) => b[1] - a[1]);
    const topItemEntry = sortedItems[0];
    
    return { 
      stats, 
      total, 
      topItem: topItemEntry ? { name: topItemEntry[0], amt: Number(topItemEntry[1]) } : null 
    };
  }, [filteredRows]);

  const totalSpent = filteredRows.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isMisc = mainCat === "Miscellaneous";
    const payload = {
      expense_date: entryDate,
      category: isMisc ? `Misc: ${customName}` : mainCat,
      item_name: isMisc ? customName : subItem,
      amount: parseFloat(amt),
      quantity: qty ? parseFloat(qty) : null,
      rate_per_unit: rate ? parseFloat(rate) : null,
      notes: notes,
      ...(editingId && { id: editingId })
    };

    try {
      const method = editingId ? 'PATCH' : 'POST';
      const response = await fetch('/api/admin/expenses', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Save failed");
      setEditingId(null); setAmt(""); setQty(""); setRate(""); setNotes(""); setCustomName("");
      refreshData();
    } catch (err) {
      alert("Error saving data.");
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setAmt(row.amount.toString());
    setQty(row.quantity?.toString() || "");
    setRate(row.rate_per_unit?.toString() || "");
    setNotes(row.notes || "");
    setEntryDate(row.expense_date);
    if (row.category && row.category.startsWith("Misc:")) {
      setMainCat("Miscellaneous");
      setCustomName(row.item_name);
    } else {
      setMainCat(row.category);
      setSubItem(row.item_name);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const response = await fetch(`/api/admin/expenses?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Delete failed");
      refreshData();
    } catch (err) {
      alert("Error deleting record.");
    }
  };

  return (
    <div style={ui.wrapper}>
      {/* 1. SMART ANALYTICS STRIP */}
      <header style={ui.header}>
        <div style={ui.statCard}>
          <label style={ui.capsLabel}>Total Filtered Burn</label>
          <div style={ui.statVal}>₹{totalSpent.toLocaleString('en-IN')}</div>
          <div style={ui.miniSub}>Across {filteredRows.length} entries</div>
        </div>

        <div style={ui.statCard}>
          <label style={ui.capsLabel}>🚩 Highest Expense Leak</label>
          {analytics.topItem ? (
            <>
              <div style={{...ui.statVal, fontSize: '20px', marginTop: '10px'}}>{analytics.topItem.name}</div>
              {/* Fix: Explicitly ensuring amt is treated as a number */}
              <div style={{...ui.statVal, color: '#ef4444', fontSize: '24px'}}>₹{(analytics.topItem.amt as number).toLocaleString('en-IN')}</div>
            </>
          ) : <div style={ui.miniSub}>No data yet</div>}
        </div>
        
        <div style={{...ui.statCard, flex: 2}}>
          <label style={ui.capsLabel}>Category Allocation (Click to filter)</label>
          <div style={ui.burnBarContainer}>
            {Object.entries(analytics.stats).map(([cat, val]: any) => {
              const percentage = analytics.total > 0 ? (val / analytics.total) * 100 : 0;
              if (percentage === 0) return null;
              return (
                <div 
                  key={cat} 
                  onClick={() => setFCat(cat)}
                  style={{
                    width: `${percentage}%`, 
                    background: BUSINESS_MAP[cat].color, 
                    height: '100%',
                    cursor: 'pointer'
                  }} 
                  title={`${cat}: ₹${val}`}
                />
              );
            })}
          </div>
          <div style={ui.legendGrid}>
             {Object.entries(analytics.stats).map(([cat, val]: any) => (
                <div key={cat} onClick={() => setFCat(cat)} style={{...ui.legendItem, cursor: 'pointer', opacity: fCat === "All" || fCat === cat ? 1 : 0.4}}>
                   <div style={{...ui.dot, background: BUSINESS_MAP[cat].color}} />
                   <span style={ui.legendText}>{cat}</span>
                   <span style={ui.legendVal}>₹{(val/1000).toFixed(1)}k</span>
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
            {Object.keys(BUSINESS_MAP).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={ui.fGroup}>
          <label style={ui.fLabel}>Date Range</label>
          <div style={{display:'flex', gap:'10px'}}>
            <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} style={ui.fInput} />
            <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} style={ui.fInput} />
          </div>
        </div>
        <button onClick={() => {setFCat("All"); setFStart(""); setFEnd("");}} style={ui.resetBtn}>Reset Dashboard</button>
      </section>

      {/* 3. CORE INTERFACE */}
      <div style={ui.mainGrid}>
        <aside style={ui.sideCard}>
          <h3 style={{margin: '0 0 20px 0'}}>{editingId ? "📝 Edit Record" : "➕ Log Expense"}</h3>
          <form onSubmit={onSave} style={ui.form}>
            <label style={ui.fLabel}>Main Category</label>
            <select value={mainCat} onChange={e => handleMainCatChange(e.target.value)} style={ui.input}>
              {Object.keys(BUSINESS_MAP).map(k => <option key={k} value={k}>{k}</option>)}
            </select>

            <label style={ui.fLabel}>Specific Item</label>
            {mainCat === "Miscellaneous" ? (
              <input placeholder="Item description..." value={customName} onChange={e => setCustomName(e.target.value)} style={ui.input} required />
            ) : (
              <select value={subItem} onChange={e => setSubItem(e.target.value)} style={ui.input}>
                {BUSINESS_MAP[mainCat]?.items.map((item: string) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}

            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex: 1}}>
                <label style={ui.fLabel}>Qty</label>
                <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} style={ui.input} placeholder="0" />
              </div>
              <div style={{flex: 1}}>
                <label style={ui.fLabel}>Rate</label>
                <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={ui.input} placeholder="0.00" />
              </div>
            </div>

            <label style={ui.fLabel}>Total Amount (INR)</label>
            <input type="number" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} style={{...ui.input, background: '#eef2ff', borderColor: '#3b82f6'}} required />
            
            <label style={ui.fLabel}>Notes</label>
            <textarea placeholder="Add any details..." value={notes} onChange={e => setNotes(e.target.value)} style={{...ui.input, height: '60px', resize: 'none'}} />

            <label style={ui.fLabel}>Expense Date</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={ui.input} />

            <button type="submit" style={ui.saveBtn}>{editingId ? "Save Changes" : "Log Transaction"}</button>
            {editingId && <button type="button" onClick={() => setEditingId(null)} style={{...ui.saveBtn, background:'#94a3b8', marginTop:'-5px'}}>Cancel</button>}
          </form>
        </aside>

        <main style={ui.tableCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={ui.table}>
              <thead style={ui.thRow}>
                <tr>
                  <th style={ui.th}>DATE</th>
                  <th style={ui.th}>CATEGORY</th>
                  <th style={ui.th}>DESCRIPTION</th>
                  <th style={ui.th}>QTY / RATE</th>
                  <th style={ui.th}>AMOUNT</th>
                  <th style={ui.th}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => {
                  const base = (row.category || "").includes('Misc:') ? "Miscellaneous" : row.category;
                  const set = BUSINESS_MAP[base] || BUSINESS_MAP["Miscellaneous"];
                  return (
                    <tr key={row.id} style={ui.tr}>
                      <td style={ui.td}>{new Date(row.expense_date).toLocaleDateString('en-IN')}</td>
                      <td style={ui.td}>
                        <span style={{...ui.badge, color: set.color, backgroundColor: set.bg}}>
                          {set.icon} {row.category}
                        </span>
                      </td>
                      <td style={ui.td}>
                        <div>{row.item_name}</div>
                        {row.notes && <div style={{fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginTop: '4px'}}>Note: {row.notes}</div>}
                      </td>
                      <td style={ui.td}>
                        {row.quantity ? `${row.quantity} x ₹${row.rate_per_unit}` : '--'}
                      </td>
                      <td style={ui.tdAmt}>₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={ui.td}>
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button onClick={() => handleEdit(row)} style={ui.editBtn}>Edit</button>
                            <button onClick={() => handleDelete(row.id)} style={ui.delBtn}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading ? (
            <p style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Fetching latest records...</p>
          ) : filteredRows.length === 0 && (
            <p style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>No expenses found.</p>
          )}
        </main>
      </div>
    </div>
  );
}

// --- STYLING ---
const ui: any = {
  wrapper: { padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  statCard: { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  capsLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '10px' },
  statVal: { fontSize: '34px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2' },
  miniSub: { fontSize: '12px', color: '#64748b', marginTop: '5px', fontWeight: '600' },
  
  burnBarContainer: { height: '14px', width: '100%', background: '#f1f5f9', borderRadius: '10px', display: 'flex', overflow: 'hidden', marginBottom: '20px' },
  legendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  legendText: { fontSize: '11px', fontWeight: '700', color: '#64748b', flex: 1 },
  legendVal: { fontSize: '11px', fontWeight: '800', color: '#1e293b' },

  filterBar: { background: '#0f172a', color: '#fff', padding: '20px 30px', borderRadius: '20px', display: 'flex', gap: '40px', marginBottom: '30px', alignItems: 'flex-end', flexWrap: 'wrap' },
  fGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  fLabel: { fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' },
  fInput: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '13px' },
  resetBtn: { padding: '10px 20px', background: '#334155', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  mainGrid: { display: 'flex', gap: '30px', flexWrap: 'wrap' },
  sideCard: { width: '320px', background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 20px rgba(0,0,0,0.03)', height: 'fit-content' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: '600', width: '100%', boxSizing: 'border-box' },
  saveBtn: { padding: '16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 5px 15px rgba(59,130,246,0.3)' },
  tableCard: { flex: 1, background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minWidth: '350px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', textAlign: 'left' },
  th: { padding: '20px', fontSize: '11px', color: '#94a3b8', fontWeight: '800' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '18px 20px', fontSize: '14px', fontWeight: '600', color: '#475569' },
  tdAmt: { padding: '18px 20px', fontWeight: '800', color: '#0f172a', fontSize: '15px' },
  badge: { padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#475569', fontSize: '12px' },
  delBtn: { background: '#fee2e2', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#ef4444', fontSize: '12px' }
};