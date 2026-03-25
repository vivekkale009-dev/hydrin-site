"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUSINESS_MAP: any = {
  "Raw Materials": { items: ["Bottle Cap", "Preform", "PVC Sheet", "Boxes", "Stickers", "Labels"], color: "#3b82f6", bg: "#eff6ff", icon: "📦" },
  "Utilities": { items: ["Electricity", "Water", "Internet"], color: "#10b981", bg: "#ecfdf5", icon: "⚡" },
  "Operations": { items: ["Rent", "Maintenance", "Repairs"], color: "#f59e0b", bg: "#fffbeb", icon: "⚙️" },
  "Logistics": { items: ["Transport", "Shipping", "Fuel"], color: "#8b5cf6", bg: "#f5f3ff", icon: "🚛" },
  "Miscellaneous": { items: ["Other"], color: "#64748b", bg: "#f8fafc", icon: "📎" }
};

// NEW CONSTANTS FOR GST
const GST_ITC_CATEGORIES = [
  { id: "inputs", label: "Inputs (Raw Materials)" },
  { id: "capital_goods", label: "Capital Goods (Machinery)" },
  { id: "input_services", label: "Input Services (Rent/Bills)" },
  { id: "ineligible", label: "Ineligible (Blocked)" }
];

const RECO_STATUS: { id: string; label: string; color: string }[] = [
  { id: "pending", label: "🟡 Pending", color: "#f59e0b" },
  { id: "matched", label: "🟢 Matched in 2B", color: "#10b981" },
  { id: "mismatch", label: "🔴 Mismatch", color: "#ef4444" }
];

export default function FinalExpenseDashboard() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [fCat, setFCat] = useState("All");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [mainCat, setMainCat] = useState("Raw Materials");
  const [subItem, setSubItem] = useState("Bottle Cap");
  const [customName, setCustomName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amt, setAmt] = useState("");
  const [qty, setQty] = useState(""); 
  const [rate, setRate] = useState(""); 
  const [notes, setNotes] = useState(""); 
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  // NEW STATES
  const [gstCategory, setGstCategory] = useState("inputs");
  const [recoStatus, setRecoStatus] = useState("pending");

  const [supplierGstin, setSupplierGstin] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [isInterstate, setIsInterstate] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const taxCalc = useMemo(() => {
    const total = parseFloat(amt) || 0;
    const gRate = parseFloat(gstRate) || 0;
    const taxable = total / (1 + gRate / 100);
    const totalTax = total - taxable;
    return {
      taxable: taxable.toFixed(2),
      cgst: isInterstate ? 0 : (totalTax / 2).toFixed(2),
      sgst: isInterstate ? 0 : (totalTax / 2).toFixed(2),
      igst: isInterstate ? totalTax.toFixed(2) : 0
    };
  }, [amt, gstRate, isInterstate]);

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
    } catch (err) { console.error("Fetch Error:", err); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const handleMainCatChange = (val: string) => {
    setMainCat(val);
    if (BUSINESS_MAP[val]) setSubItem(BUSINESS_MAP[val].items[0]);
  };

  const filteredRows = useMemo(() => {
    return expenses.filter(x => {
      const rawCat = x.category || "";
      const categoryToMatch = rawCat.startsWith("Misc:") ? "Miscellaneous" : rawCat;
      const matchCat = fCat === "All" || categoryToMatch === fCat;
      const matchStart = !fStart || x.expense_date >= fStart;
      const matchEnd = !fEnd || x.expense_date <= fEnd
	  const s = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
      (x.item_name?.toLowerCase().includes(s)) ||
      (x.category?.toLowerCase().includes(s)) ||
      (x.notes?.toLowerCase().includes(s)) ||
      (x.invoice_no?.toLowerCase().includes(s)) ||
      (x.supplier_gstin?.toLowerCase().includes(s))
      return matchCat && matchStart && matchEnd && matchSearch;
    });
  }, [expenses, fCat, fStart, fEnd, searchTerm]);

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
    const itcTotal = filteredRows.reduce((a, b) => a + (Number(b.cgst_amount || 0) + Number(b.sgst_amount || 0) + Number(b.igst_amount || 0)), 0);
    
    return { 
      stats, total, itcTotal,
      topItem: sortedItems[0] ? { name: sortedItems[0][0], amt: Number(sortedItems[0][1]) } : null 
    };
  }, [filteredRows]);

  const totalSpent = analytics.total;

  const handleExportGSTR2 = () => {
    const headers = ["GSTIN of Supplier", "Invoice date", "Total Invoice Value", "Taxable Value", "IGST", "CGST", "SGST", "ITC Category", "Status", "RCM"];
    const csvData = filteredRows.map(r => [
      r.supplier_gstin || "N/A", r.expense_date, r.amount, r.taxable_value, r.igst_amount, r.cgst_amount, r.sgst_amount, r.gst_category, r.reco_status, r.is_rcm
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvData].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `GSTR2_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

const onSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setUploading(true);

  try {
    const formData = new FormData();
    const isMisc = mainCat === "Miscellaneous";
    
    formData.append("expense_date", entryDate);
    formData.append("category", isMisc ? `Misc: ${customName}` : mainCat);
    formData.append("item_name", isMisc ? customName : subItem);
    formData.append("amount", amt);
    formData.append("quantity", qty || "");
    formData.append("rate_per_unit", rate || "");
    formData.append("notes", notes);
    formData.append("supplier_gstin", supplierGstin);
    formData.append("gst_rate", gstRate);
    formData.append("gst_category", gstCategory); // Added
    formData.append("reco_status", recoStatus);   // Added
    formData.append("taxable_value", taxCalc.taxable);
    formData.append("cgst_amount", taxCalc.cgst.toString());
    formData.append("sgst_amount", taxCalc.sgst.toString());
    formData.append("igst_amount", taxCalc.igst.toString());
    formData.append("is_interstate", String(isInterstate));
	// Inside onSave function
formData.append("invoice_no", invoiceNo); // Use the column name from your DB

    if (editingId) formData.append("id", editingId);
    if (file) formData.append("file", file); 
    if (existingFileUrl && !file) formData.append("attachment_url", existingFileUrl);

    const method = editingId ? 'PATCH' : 'POST';
    const response = await fetch('/api/admin/expenses', {
      method,
      body: formData,
    });

    if (!response.ok) throw new Error("Save failed");

    setEditingId(null); setAmt(""); setQty(""); setRate(""); setNotes(""); setInvoiceNo("");
    setCustomName(""); setFile(null); setSupplierGstin(""); setExistingFileUrl(null);
    refreshData();
  } catch (err) { 
    alert("Error saving data."); 
  } finally { 
    setUploading(false); 
  }
};

  const handleEdit = (row: any) => {
  setInvoiceNo(row.invoice_no || "");
    setEditingId(row.id);
    setAmt(row.amount.toString());
    setQty(row.quantity?.toString() || "");
    setRate(row.rate_per_unit?.toString() || "");
    setNotes(row.notes || "");
    setEntryDate(row.expense_date);
    setSupplierGstin(row.supplier_gstin || "");
    setGstRate(row.gst_rate?.toString() || "18");
    setGstCategory(row.gst_category || "inputs"); // Added
    setRecoStatus(row.reco_status || "pending");   // Added
    setIsInterstate(row.is_interstate || false);
    setExistingFileUrl(row.attachment_url || null);
    if (row.category && row.category.startsWith("Misc:")) {
      setMainCat("Miscellaneous");
      setCustomName(row.item_name);
    } else {
      setMainCat(row.category);
      setSubItem(row.item_name);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const response = await fetch(`/api/admin/expenses?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Delete failed");
      refreshData();
    } catch (err) { alert("Error deleting record."); }
  };

  return (
    <div style={ui.wrapper}>
      <header style={ui.header}>
        <div style={ui.statCard}>
          <label style={ui.capsLabel}>Total Filtered Burn</label>
          <div style={ui.statVal}>₹{totalSpent.toLocaleString('en-IN')}</div>
          <button onClick={handleExportGSTR2} style={{...ui.resetBtn, background: '#0f172a', width: '100%', marginTop: '10px'}}>📥 Export CSV File</button>
        </div>

        <div style={{...ui.statCard, borderLeft: '5px solid #10b981'}}>
          <label style={ui.capsLabel}>Total ITC Summary</label>
          <div style={{...ui.statVal, color: '#10b981'}}>₹{analytics.itcTotal.toLocaleString('en-IN')}</div>
          <div style={ui.miniSub}>Claimable Input Tax Credit</div>
        </div>
        
        <div style={{...ui.statCard, flex: 2}}>
          <label style={ui.capsLabel}>Category Allocation (Click to filter)</label>
          <div style={ui.burnBarContainer}>
            {Object.entries(analytics.stats).map(([cat, val]: any) => {
              const percentage = analytics.total > 0 ? (val / analytics.total) * 100 : 0;
              if (percentage === 0) return null;
              return (
                <div key={cat} onClick={() => setFCat(cat)}
                  style={{ width: `${percentage}%`, background: BUSINESS_MAP[cat].color, height: '100%', cursor: 'pointer' }} 
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

      <section style={ui.filterBar}>
        <div style={ui.fGroup}><label style={ui.fLabel}>Category View</label>
          <select value={fCat} onChange={e => setFCat(e.target.value)} style={ui.fInput}>
            <option value="All">All Categories</option>
            {Object.keys(BUSINESS_MAP).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={ui.fGroup}><label style={ui.fLabel}>Date Range</label>
          <div style={{display:'flex', gap:'10px'}}>
            <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} style={ui.fInput} />
            <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} style={ui.fInput} />
          </div>
		  
		  </div>
		  
		  <div style={ui.fGroup}>
  <label style={ui.fLabel}>Search</label>
  <input 
    type="text" 
    placeholder="Search items, notes, or GSTIN..." 
    value={searchTerm} 
    onChange={e => setSearchTerm(e.target.value)} 
    style={{...ui.fInput, width: '220px'}} 
  />
</div>
        <button 
  onClick={() => { setFCat("All"); setFStart(""); setFEnd(""); setSearchTerm(""); }} 
  style={ui.resetBtn}
>
  Reset Dashboard
</button>
      </section>

      <div style={ui.mainGrid}>
        <aside style={ui.sideCard}>
          <h3 style={{margin: '0 0 20px 0'}}>{editingId ? "📝 Edit Record" : "➕ Log Expense"}</h3>
          <form onSubmit={onSave} style={ui.form}>
		  
		  {/* ADDED: Date Input so you can enter it manually */}
		  
		   <label style={ui.fLabel}>Invoice No</label>
            <input placeholder="Enter Invoice Number" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value.toUpperCase())} style={ui.input} />
			
            <label style={ui.fLabel}>Bill / Invoice Date</label>
            <input 
              type="date" 
              value={entryDate} 
              onChange={e => setEntryDate(e.target.value)} 
              style={ui.input} 
              required 
            />
		  
            <label style={ui.fLabel}>Supplier GSTIN</label>
            <input placeholder="27XXXXX..." value={supplierGstin} onChange={e => setSupplierGstin(e.target.value.toUpperCase())} style={ui.input} />

            {/* NEW: ITC AND STATUS SELECTORS */}
            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex: 1}}><label style={ui.fLabel}>ITC Category</label>
                <select value={gstCategory} onChange={e => setGstCategory(e.target.value)} style={ui.input}>
                  {GST_ITC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div style={{flex: 1}}><label style={ui.fLabel}>Reco Status</label>
                <select value={recoStatus} onChange={e => setRecoStatus(e.target.value)} style={{...ui.input, borderColor: RECO_STATUS.find(s=>s.id===recoStatus)?.color}}>
                  {RECO_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex: 1}}><label style={ui.fLabel}>Main Category</label>
                <select value={mainCat} onChange={e => handleMainCatChange(e.target.value)} style={ui.input}>
                  {Object.keys(BUSINESS_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{flex: 1}}><label style={ui.fLabel}>GST %</label>
                <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={ui.input}>
                  <option value="18">18%</option><option value="12">12%</option><option value="5">5%</option><option value="0">0%</option>
                </select>
              </div>
            </div>

            <label style={ui.fLabel}>Specific Item</label>
            {mainCat === "Miscellaneous" ? (
              <input 
                placeholder="Enter item name..." 
                value={customName} 
                onChange={e => setCustomName(e.target.value)} 
                style={ui.input} 
                required 
              />
            ) : (
              <select value={subItem} onChange={e => setSubItem(e.target.value)} style={ui.input}>
                {BUSINESS_MAP[mainCat]?.items.map((item: string) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}

            <div style={{background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '11px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between'}}>
               <span>Taxable: ₹{taxCalc.taxable}</span>
               <span style={{color: '#10b981', fontWeight: 'bold'}}>GST: ₹{(parseFloat(taxCalc.cgst as any) + parseFloat(taxCalc.sgst as any) + parseFloat(taxCalc.igst as any)).toFixed(2)}</span>
            </div>

            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold'}}>
              <input type="checkbox" checked={isInterstate} onChange={e => setIsInterstate(e.target.checked)} /> Interstate (IGST)
            </label>

            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex: 1}}><label style={ui.fLabel}>Qty</label>
                <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} style={ui.input} />
              </div>
              <div style={{flex: 1}}><label style={ui.fLabel}>Rate</label>
                <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={ui.input} />
              </div>
            </div>

            <label style={ui.fLabel}>Total Bill Amount</label>
            <input type="number" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} style={{...ui.input, background: '#eef2ff', borderColor: '#3b82f6'}} required />
            
            <label style={ui.fLabel}>Notes</label>
            <input 
              placeholder="Any remarks..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              style={ui.input} 
            />

            <label style={ui.fLabel}>Upload Invoice</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{...ui.input, fontSize: '12px'}} />

            <button type="submit" disabled={uploading} style={ui.saveBtn}>{uploading ? "Uploading..." : editingId ? "Save Changes" : "Log Transaction"}</button>
            {editingId && <button type="button" onClick={() => setEditingId(null)} style={{...ui.saveBtn, background:'#94a3b8', marginTop:'-5px'}}>Cancel</button>}
          </form>
        </aside>

        <main style={ui.tableCard}>
          <div style={{ overflowX: 'auto' }}>
<table style={ui.table}>
  <thead style={ui.thRow}>
    <tr>
      <th style={ui.th}>DATE</th>
      <th style={ui.th}>INVOICE NO</th>
      <th style={ui.th}>EXPENSE TYPE</th>
      <th style={ui.th}>ITEM / STATUS</th>
      <th style={ui.th}>NOTES</th>
      <th style={ui.th}>TAXABLE</th>
      <th style={ui.th}>GST</th>
      <th style={ui.th}>TOTAL</th>
      <th style={ui.th}>VIEW</th>
      <th style={ui.th}>ACTION</th>
    </tr>
  </thead>
  <tbody>
    {filteredRows.map(row => {
      const gstTotal = (row.cgst_amount || 0) + (row.sgst_amount || 0) + (row.igst_amount || 0);
      const statusObj = RECO_STATUS.find(s => s.id === row.reco_status) || RECO_STATUS;
      
      return (
        <tr key={row.id} style={ui.tr}>
          {/* 1. DATE */}
          <td style={ui.td}>{new Date(row.expense_date).toLocaleDateString('en-IN')}</td>
          
          {/* 2. INVOICE NO (Matches Header) */}
          <td style={{...ui.td, fontSize: '12px', fontWeight: 'bold'}}>{row.invoice_no || '-'}</td>
          
          {/* 3. EXPENSE TYPE (Category) */}
          <td style={{...ui.td, fontSize: '12px', color: '#64748b'}}>
            {row.category}
            <div style={{fontSize: '9px', color: '#94a3b8'}}>{row.gst_category}</div>
          </td>

          {/* 4. ITEM / STATUS */}
          <td style={ui.td}>
            <div style={{fontWeight: 'bold'}}>{row.item_name}</div>
            <div style={{fontSize: '10px', color: (statusObj as any).color, fontWeight: '800'}}>{statusObj.label}</div>
          </td>

          {/* 5. NOTES */}
          <td style={{...ui.td, fontSize: '11px', color: '#64748b', maxWidth: '150px'}}>{row.notes || '-'}</td>

          {/* 6. TAXABLE */}
          <td style={ui.td}>₹{row.taxable_value || '--'}</td>

          {/* 7. GST */}
          <td style={{...ui.td, color: '#10b981'}}>₹{gstTotal.toFixed(2)}</td>

          {/* 8. TOTAL */}
          <td style={ui.tdAmt}>₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>

          {/* 9. VIEW */}
          <td style={ui.td}>
            {row.attachment_url ? (
              <button 
                onClick={() => window.open(supabase.storage.from('expense-attachments').getPublicUrl(row.attachment_url).data.publicUrl)} 
                style={{...ui.editBtn, background: '#e0f2fe', color: '#0369a1'}}
              >
                📄 Open
              </button>
            ) : <span style={{fontSize: '11px', color: '#cbd5e1'}}>None</span>}
          </td>

          {/* 10. ACTION */}
          <td style={ui.td}>
            <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={() => handleEdit(row)} style={ui.editBtn}>Edit</button>
                <button onClick={() => handleDelete(row.id)} style={ui.delBtn}>Del</button>
            </div>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
          </div>
        </main>
      </div>
    </div>
  );
}

const ui: any = {
  wrapper: { padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  statCard: { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  capsLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '10px' },
  statVal: { fontSize: '34px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2' },
  miniSub: { fontSize: '12px', color: '#64748b', marginTop: '5px', fontWeight: '600' },
  burnBarContainer: { height: '14px', width: '100%', background: '#f1f5f9', borderRadius: '10px', display: 'flex', overflow: 'hidden', marginBottom: '20px' },
  legendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px' },
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
  editBtn: { background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#475569', fontSize: '12px' },
  delBtn: { background: '#fee2e2', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#ef4444', fontSize: '12px' }
};