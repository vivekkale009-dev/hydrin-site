"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Product = { id: string; name: string; volume_ml: number; };

type Batch = {
  id: number; batch_code: string; production_date: string;
  status: 'PASSED' | 'FAILED' | 'PENDING'; expiry_date: string;
  net_quantity: string; product_name?: string; report_url?: string;
  ph_value?: number; tds_value?: number;
};

export default function BatchManager() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Batch>>({});
  const [newBatchForm, setNewBatchForm] = useState<Partial<Batch>>({ 
    status: 'PASSED', 
    production_date: new Date().toISOString().split('T')[0],
    net_quantity: ""
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'available' | 'taken'>('idle');
  const [isUploading, setIsUploading] = useState<number | null>(null);

  // Filtration States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");

  useEffect(() => { fetchBatches(); fetchProducts(); }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const code = newBatchForm.batch_code?.trim();
      if (!code || code.length < 3) { setCodeStatus('idle'); return; }
      setIsChecking(true);
      const res = await fetch(`/api/admin/batches?checkCode=${code}`);
      const { exists } = await res.json();
      setCodeStatus(exists ? 'taken' : 'available');
      setIsChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [newBatchForm.batch_code]);

  const calculateExpiry = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  };

const generateCode = () => {
    const now = new Date();
    
    // 1. Get last 2 digits of year (e.g., 2026 -> 26)
    const year = now.getFullYear().toString().slice(-2);

    // 2. Calculate Julian Day (Day of the year)
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay).toString().padStart(3, '0');

    // 3. Determine the Suffix (A, B, C...) based on existing batches today
    const todayPrefix = `${year}${dayOfYear}`;
    
    // Look at current batches to see how many exist for today
    const batchesToday = batches.filter(b => b.batch_code.startsWith(todayPrefix));
    
    // Convert count to Alphabet (0 = A, 1 = B, etc.)
    // charCode 65 is 'A'
    const suffix = String.fromCharCode(65 + batchesToday.length);

    const finalCode = `${todayPrefix}${suffix}`;
    
    setNewBatchForm({ ...newBatchForm, batch_code: finalCode });
  };

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("id, name, volume_ml").eq("is_active", true);
    setProducts(data || []);
  }

  async function fetchBatches() {
    setLoading(true);
    const { data } = await supabase.from("batches").select("*").order("id", { ascending: false });
    setBatches(data || []);
    setLoading(false);
  }

  const handleProductChange = (productId: string, isEdit: boolean = false) => {
    const selectedProd = products.find(p => p.id === productId);
    if (selectedProd) {
      const updates = { product_name: selectedProd.name, net_quantity: `${selectedProd.volume_ml} ML` };
      isEdit ? setEditForm({ ...editForm, ...updates }) : setNewBatchForm({ ...newBatchForm, ...updates });
    }
  };

  async function uploadReport(e: React.ChangeEvent<HTMLInputElement>, batch: Batch) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(batch.id);
    try {
      const fileName = `${batch.batch_code}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("water-reports")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const res = await fetch('/api/admin/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: batch.id, report_url: uploadData.path })
      });

      if (!res.ok) throw new Error("Database update failed");
      fetchBatches();
      alert("Report saved internally.");
    } catch (err: any) {
      alert("Upload Error: " + err.message);
    } finally { setIsUploading(null); }
  }

  async function handleViewReport(path: string) {
    if (!path) return;
    if (path.startsWith('http')) {
      window.open(path, '_blank');
      return;
    }
    const res = await fetch(`/api/admin/batches?path=${path}`);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
    else alert("Could not generate secure link");
  }

  async function handleCreateBatch() {
    if(!newBatchForm.batch_code || codeStatus === 'taken') return alert("Invalid Batch Code");
    setLoading(true);
    const payload = {
      ...newBatchForm,
      batch_code: newBatchForm.batch_code.trim().toUpperCase(),
      expiry_date: calculateExpiry(newBatchForm.production_date),
      ph_value: newBatchForm.ph_value ? parseFloat(newBatchForm.ph_value.toString()) : null,
      tds_value: newBatchForm.tds_value ? parseInt(newBatchForm.tds_value.toString()) : null,
    };
    const res = await fetch('/api/admin/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setIsCreating(false);
      setNewBatchForm({ status: 'PASSED', production_date: new Date().toISOString().split('T')[0], net_quantity: "" });
      fetchBatches();
    } else { alert("Creation failed"); }
    setLoading(false);
  }

  async function handleUpdate(id: number) {
    const payload = { 
      ...editForm, 
      id, 
      expiry_date: calculateExpiry(editForm.production_date),
      ph_value: editForm.ph_value ? parseFloat(editForm.ph_value.toString()) : null,
      tds_value: editForm.tds_value ? parseInt(editForm.tds_value.toString()) : null,
    };
    const res = await fetch('/api/admin/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) { setEditingId(null); fetchBatches(); } else { alert("Update failed"); }
  }

  // DELETE LOGIC
  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) return;
    
    const res = await fetch(`/api/admin/batches?id=${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchBatches();
    } else {
      alert("Delete failed. Ensure the API supports DELETE requests.");
    }
  }

  const stats = useMemo(() => ({
    total: batches.length,
    passed: batches.filter(b => b.status === 'PASSED').length,
    failed: batches.filter(b => b.status === 'FAILED').length,
    pending: batches.filter(b => b.status === 'PENDING').length,
  }), [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch = b.batch_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchesDate = !dateFilter || b.production_date === dateFilter;
      const matchesProduct = productFilter === "ALL" || b.product_name === productFilter;
      return matchesSearch && matchesStatus && matchesDate && matchesProduct;
    });
  }, [batches, searchQuery, statusFilter, dateFilter, productFilter]);

  return (
    <div style={{ padding: "40px", background: "#f1f5f9", minHeight: "100vh", fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={statCard}><span>Total Batches</span><strong>{stats.total}</strong></div>
          <div style={{...statCard, borderLeft: '4px solid #10b981'}}><span>Quality Passed</span><strong style={{color: '#10b981'}}>{stats.passed}</strong></div>
          <div style={{...statCard, borderLeft: '4px solid #ef4444'}}><span>Quality Failed</span><strong style={{color: '#ef4444'}}>{stats.failed}</strong></div>
          <div style={{...statCard, borderLeft: '4px solid #f59e0b'}}><span>Pending</span><strong style={{color: '#f59e0b'}}>{stats.pending}</strong></div>
        </div>

        {/* Filtration Header */}
        <div style={filterContainer}>
          <input style={filterInput} placeholder="Search Batch #" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <select style={filterInput} value={productFilter} onChange={e => setProductFilter(e.target.value)}>
            <option value="ALL">All Products</option>
            {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <input type="date" style={filterInput} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          <select style={filterInput} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>
          <button onClick={() => {setSearchQuery(""); setDateFilter(""); setStatusFilter("ALL"); setProductFilter("ALL");}} style={resetBtnStyle}>Reset</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
           <h2 style={{ margin: 0, color: '#1e293b' }}>Production Logs</h2>
           <button onClick={() => setIsCreating(true)} style={addBtnStyle}>+ New Production Batch</button>
        </div>

        {isCreating && (
          <div style={createPanelStyle}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
               <h3 style={{ margin: 0 }}>Initialize New Batch</h3>
               <button onClick={generateCode} style={magicBtnStyle}>🪄 Auto-Generate Code</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Batch Code</label>
                <input style={inputStyle} value={newBatchForm.batch_code || ""} onChange={e => setNewBatchForm({...newBatchForm, batch_code: e.target.value.toUpperCase()})} />
                {codeStatus === 'taken' && <small style={{color: 'red'}}>Code exists!</small>}
              </div>
              <div>
                <label style={labelStyle}>Product</label>
                <select style={inputStyle} onChange={(e) => handleProductChange(e.target.value)}>
                  <option value="">Select...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input style={inputStyle} value={newBatchForm.net_quantity} onChange={e => setNewBatchForm({...newBatchForm, net_quantity: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Prod. Date</label>
                <input type="date" style={inputStyle} value={newBatchForm.production_date} onChange={e => setNewBatchForm({...newBatchForm, production_date: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Expiry (6M)</label>
                <input style={{...inputStyle, background: '#e2e8f0'}} value={calculateExpiry(newBatchForm.production_date)} readOnly />
              </div>
              <div>
                <label style={labelStyle}>pH / TDS</label>
                <div style={{display: 'flex', gap: '4px'}}>
                  <input placeholder="pH" style={inputStyle} onChange={e => setNewBatchForm({...newBatchForm, ph_value: parseFloat(e.target.value)})} />
                  <input placeholder="TDS" style={inputStyle} onChange={e => setNewBatchForm({...newBatchForm, tds_value: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <button onClick={() => setIsCreating(false)} style={resetBtnStyle}>Cancel</button>
              <button onClick={handleCreateBatch} style={saveBtnStyleLocal}>Confirm & Save</button>
            </div>
          </div>
        )}

        <div style={tableWrapperStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={tHeadStyle}>Batch Details</th>
                <th style={tHeadStyle}>Product Info</th>
                <th style={tHeadStyle}>Parameters</th>
                <th style={tHeadStyle}>Dates</th>
                <th style={tHeadStyle}>Report</th>
                <th style={tHeadStyle}>Status</th>
                <th style={tHeadStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch) => (
                <tr key={batch.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tCellStyle}>
                    {editingId === batch.id ? 
                      <input style={editInputStyle} value={editForm.batch_code} onChange={e => setEditForm({...editForm, batch_code: e.target.value})} /> 
                      : <strong>{batch.batch_code}</strong>
                    }
                  </td>
                  <td style={tCellStyle}>
                    <div style={{fontSize: '0.9rem', fontWeight: 600}}>{batch.product_name || 'N/A'}</div>
                    <div style={{fontSize: '0.75rem', color: '#64748b'}}>{batch.net_quantity}</div>
                  </td>
                  <td style={tCellStyle}>
                     {editingId === batch.id ? (
                        <div style={{display:'flex', gap:'5px'}}>
                           <input type="number" step="0.1" style={editInputStyle} value={editForm.ph_value} placeholder="pH" onChange={e => setEditForm({...editForm, ph_value: parseFloat(e.target.value)})} />
                           <input type="number" style={editInputStyle} value={editForm.tds_value} placeholder="TDS" onChange={e => setEditForm({...editForm, tds_value: parseInt(e.target.value)})} />
                        </div>
                     ) : (
                       <span style={{fontSize:'0.8rem', color:'#64748b'}}>pH: {batch.ph_value || '-'} | TDS: {batch.tds_value || '-'}</span>
                     )}
                  </td>
                  <td style={tCellStyle}>
                    <div style={{fontSize: '0.85rem'}}>Prod: {batch.production_date}</div>
                    <div style={{fontSize: '0.85rem', color: '#ef4444', fontWeight: 600}}>Exp: {batch.expiry_date}</div>
                  </td>
                  
                  <td style={tCellStyle}>
                    {isUploading === batch.id ? 
                      <div className="loader-text">Saving...</div> 
                      : batch.report_url ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button onClick={() => handleViewReport(batch.report_url!)} className="report-link" style={{border:'none', cursor:'pointer', textAlign:'left'}}>📎 View Report ✅</button>
                        <label className="replace-text">
                          Replace File
                          <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => uploadReport(e, batch)} />
                        </label>
                      </div>
                    ) : (
                      <label className="upload-btn">
                        Upload Report <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => uploadReport(e, batch)} />
                      </label>
                    )}
                  </td>

                  <td style={tCellStyle}>
                    {editingId === batch.id ? (
                      <select style={editInputStyle} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
                        <option value="PASSED">PASSED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    ) : (
                      <span style={statusBadge(batch.status)}>{batch.status}</span>
                    )}
                  </td>
                  <td style={tCellStyle}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {editingId === batch.id ? (
                        <button onClick={() => handleUpdate(batch.id)} className="save-btn">Save</button>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(batch.id); setEditForm(batch); }} className="edit-btn">Edit</button>
                          <button onClick={() => handleDelete(batch.id)} className="delete-btn">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .report-link { color: #15803d; text-decoration: none; font-weight: 700; font-size: 0.8rem; background: #f0fdf4; padding: 4px 10px; border-radius: 6px; display: inline-block; }
        .replace-text { font-size: 0.65rem; color: #94a3b8; text-decoration: underline; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .upload-btn { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: #475569; border: 1px dashed #cbd5e1; display: inline-block; }
        .edit-btn { background: none; border: none; color: #0ea5e9; cursor: pointer; font-weight: 700; }
        .delete-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-weight: 700; font-size: 0.85rem; }
        .save-btn { background: #15803d; color: white; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .loader-text { color: #15803d; font-size: 0.8rem; font-weight: 700; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

// Styling Constants
const statCard = { background: "white", padding: "20px", borderRadius: "12px", display: "flex", flexDirection: "column" as const, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" };
const filterContainer = { display: 'flex', gap: '10px', background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const filterInput = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' };
const addBtnStyle = { background: "#0A6CFF", color: "white", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" };
const magicBtnStyle = { background: "#f0f9ff", color: "#0A6CFF", border: "1px solid #0A6CFF", padding: "5px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" };
const createPanelStyle = { background: "white", padding: "25px", borderRadius: "16px", marginBottom: "25px", border: "1px solid #0A6CFF", boxShadow: "0 10px 25px rgba(10,108,255,0.05)" };
const saveBtnStyleLocal = { background: "#0A6CFF", color: "white", border: "none", padding: "10px 25px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, marginLeft: '10px' };
const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", marginBottom: "5px", textTransform: "uppercase" as const };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" };
const editInputStyle = { padding: "6px", borderRadius: "6px", border: "1px solid #0ea5e9", width: "100%", fontSize: "0.85rem" };
const resetBtnStyle = { background: "none", border: "none", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: '0.9rem' };
const tableWrapperStyle = { background: "white", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" };
const tHeadStyle: React.CSSProperties = { padding: "16px 20px", textAlign: 'left', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' };
const tCellStyle: React.CSSProperties = { padding: "16px 20px" };
const statusBadge = (status: string): React.CSSProperties => ({
  padding: "4px 12px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 800,
  background: status === 'PASSED' ? '#dcfce7' : status === 'FAILED' ? '#fee2e2' : '#fef9c3',
  color: status === 'PASSED' ? '#15803d' : status === 'FAILED' ? '#b91c1c' : '#a16207'
});