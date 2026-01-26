"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Batch = {
  id: number;
  batch_code: string;
  production_date: string;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  expiry_date: string;
  net_quantity: string;
  report_url?: string;
};

export default function BatchManager() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Batch>>({});
  const [isUploading, setIsUploading] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => { fetchBatches(); }, []);

  async function fetchBatches() {
    setLoading(true);
    const { data } = await supabase.from("batches").select("*").order("id", { ascending: false });
    setBatches(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    return {
      passed: batches.filter(b => b.status === 'PASSED').length,
      failed: batches.filter(b => b.status === 'FAILED').length,
      pending: batches.filter(b => b.status === 'PENDING').length,
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch = b.batch_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchesDate = !dateFilter || b.production_date === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [batches, searchQuery, statusFilter, dateFilter]);

  async function handleUpdate(id: number) {
    const { error } = await supabase.from("batches").update(editForm).eq("id", id);
    if (!error) { setEditingId(null); fetchBatches(); }
  }

  async function uploadReport(e: React.ChangeEvent<HTMLInputElement>, batch: Batch) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(batch.id);
    try {
      const fileName = `${batch.batch_code}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from("water-reports").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("water-reports").getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from("batches").update({ report_url: publicUrl }).eq("id", batch.id);
      if (dbError) throw dbError;

      // Update local state immediately so UI reflects the change
      setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, report_url: publicUrl } : b));
      
    } catch (err: any) {
      alert("Upload Error: " + err.message);
    } finally { setIsUploading(null); }
  }

  return (
    <div style={{ padding: "40px", background: "#f8fafc", minHeight: "100vh", fontFamily: "inherit" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        
        <div style={{ marginBottom: "30px", display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ color: "#0f172a", fontSize: "2.2rem", fontWeight: 800 }}>Production Batches</h1>
            <p style={{ color: "#64748b" }}>Control center for batch quality and reporting.</p>
          </div>
          {/* STATS SUMMARY */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-pill" style={{ borderLeft: '4px solid #16a34a' }}>{stats.passed} Passed</div>
            <div className="stat-pill" style={{ borderLeft: '4px solid #ef4444' }}>{stats.failed} Failed</div>
            <div className="stat-pill" style={{ borderLeft: '4px solid #f59e0b' }}>{stats.pending} Pending</div>
          </div>
        </div>

        <section style={{ 
          background: "white", padding: "20px", borderRadius: "16px", marginBottom: "24px",
          display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" 
        }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={labelStyle}>Search Batch No.</label>
            <input type="text" placeholder="e.g. HYD001" style={inputStyle} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status Filter</label>
            <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Production Date</label>
            <input type="date" style={inputStyle} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <button onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setDateFilter(""); }} style={resetBtnStyle}>Reset</button>
        </section>

        <div style={{ background: "white", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={tHeadStyle}>Batch Code</th>
                <th style={tHeadStyle}>Prod. Date</th>
                <th style={tHeadStyle}>Status</th>
                <th style={tHeadStyle}>Purity Report</th>
                <th style={tHeadStyle}>Actions</th>
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
                    {editingId === batch.id ? 
                      <input type="date" style={editInputStyle} value={editForm.production_date} onChange={e => setEditForm({...editForm, production_date: e.target.value})} /> 
                      : batch.production_date
                    }
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
                    {isUploading === batch.id ? 
                      <div className="loader-text">Saving...</div> 
                      : batch.report_url ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <a href={batch.report_url} target="_blank" className="report-link">📎 View Report ✅</a>
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
                      <button onClick={() => handleUpdate(batch.id)} className="save-btn">Save</button>
                    ) : (
                      <button onClick={() => { setEditingId(batch.id); setEditForm(batch); }} className="edit-btn">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBatches.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No batches found matching your filters.</div>}
        </div>
      </div>

      <style jsx>{`
        .report-link { color: #15803d; text-decoration: none; font-weight: 700; font-size: 0.8rem; background: #f0fdf4; padding: 4px 10px; border-radius: 6px; display: inline-block; }
        .replace-text { font-size: 0.65rem; color: #94a3b8; text-decoration: underline; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .upload-btn { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: #475569; border: 1px dashed #cbd5e1; }
        .edit-btn { background: none; border: none; color: #0ea5e9; cursor: pointer; font-weight: 700; }
        .save-btn { background: #15803d; color: white; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .loader-text { color: #15803d; font-size: 0.8rem; font-weight: 700; animation: pulse 1.5s infinite; }
        .stat-pill { background: white; padding: 8px 16px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 0.85rem; font-weight: 700; color: #475569; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" as const };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" };
const editInputStyle = { padding: "6px", borderRadius: "6px", border: "1px solid #0ea5e9", width: "100%", fontSize: "0.9rem" };
const resetBtnStyle = { background: "none", border: "none", color: "#ef4444", fontWeight: 600, cursor: "pointer", paddingBottom: "10px" };
const tHeadStyle: React.CSSProperties = { padding: "16px 20px" };
const tCellStyle: React.CSSProperties = { padding: "16px 20px" };
const statusBadge = (status: string): React.CSSProperties => ({
  padding: "4px 12px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 800,
  background: status === 'PASSED' ? '#dcfce7' : status === 'FAILED' ? '#fee2e2' : '#fef9c3',
  color: status === 'PASSED' ? '#15803d' : status === 'FAILED' ? '#b91c1c' : '#a16207'
});