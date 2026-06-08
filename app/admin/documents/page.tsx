"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DOCUMENT_MAP: any = {
  "Compliance & Licenses": { items: ["FSSAI License", "Water Test Report", "Factory License", "Pollution Certificate", "Fire NOC"], color: "#3b82f6", bg: "#eff6ff", icon: "📜" },
  "Corporate & Legal": { items: ["Company Registration", "MOA & AOA", "PAN Card", "Trademark Certificate", "Partnership Deed"], color: "#10b981", bg: "#ecfdf5", icon: "⚖️" },
  "Tax Registrations": { items: ["GST Registration", "Professional Tax", "Shop Act License"], color: "#f59e0b", bg: "#fffbeb", icon: "📊" },
  "Vendor & Operations": { items: ["Lease Agreement", "Vendor Contract", "Insurance Policy", "Machinery Warranty"], color: "#8b5cf6", bg: "#f5f3ff", icon: "🤝" },
  "Miscellaneous": { items: ["Other Document"], color: "#64748b", bg: "#f8fafc", icon: "📎" }
};

const DOC_STATUS: { id: string; label: string; color: string }[] = [
  { id: "active", label: "🟢 Active / Valid", color: "#10b981" },
  { id: "expiring_soon", label: "🟡 Expiring Soon", color: "#f59e0b" },
  { id: "expired", label: "🔴 Expired", color: "#ef4444" },
  { id: "pending", label: "⚪ Pending Review", color: "#64748b" }
];

export default function DocumentDashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modal Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const [fCat, setFCat] = useState("All");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [mainCat, setMainCat] = useState("Compliance & Licenses");
  const [subItem, setSubItem] = useState("FSSAI License");
  const [customName, setCustomName] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [notes, setNotes] = useState(""); 
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T'));
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("active");

  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const validityCalc = useMemo(() => {
    if (!expiryDate) return { daysLeft: "N/A", statusText: "Permanent" };
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      daysLeft: diffDays,
      statusText: diffDays < 0 ? "Expired" : `${diffDays} Days Left`
    };
  }, [expiryDate]);

  useEffect(() => {
    if (validityCalc.daysLeft !== "N/A") {
      const days = validityCalc.daysLeft as number;
      if (days < 0) setStatus("expired");
      else if (days <= 60) setStatus("expiring_soon");
      else setStatus("active");
    }
  }, [validityCalc]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/documents');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch");
      setDocuments(data || []);
    } catch (err) { console.error("Fetch Error:", err); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const handleMainCatChange = (val: string) => {
    setMainCat(val);
    if (DOCUMENT_MAP[val]) setSubItem(DOCUMENT_MAP[val].items);
  };

  const filteredRows = useMemo(() => {
    return documents.filter(x => {
      const rawCat = x.category || "";
      const categoryToMatch = rawCat.startsWith("Misc:") ? "Miscellaneous" : rawCat;
      const matchCat = fCat === "All" || categoryToMatch === fCat;
      const matchStart = !fStart || x.issue_date >= fStart;
      const matchEnd = !fEnd || x.issue_date <= fEnd;
      
      const s = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        (x.document_type?.toLowerCase().includes(s)) ||
        (x.category?.toLowerCase().includes(s)) ||
        (x.notes?.toLowerCase().includes(s)) ||
        (x.document_no?.toLowerCase().includes(s)) ||
        (x.issuing_authority?.toLowerCase().includes(s));
        
      return matchCat && matchStart && matchEnd && matchSearch;
    });
  }, [documents, fCat, fStart, fEnd, searchTerm]);

  const analytics = useMemo(() => {
    const stats: Record<string, number> = {};
    Object.keys(DOCUMENT_MAP).forEach(k => stats[k] = 0);
    
    let expiredCount = 0;
    let expiringSoonCount = 0;

    filteredRows.forEach(doc => {
      const rawCat = doc.category || "";
      const base = rawCat.startsWith("Misc:") ? "Miscellaneous" : rawCat;
      if (stats[base] !== undefined) stats[base] += 1;
      
      if (doc.status === "expired") expiredCount++;
      if (doc.status === "expiring_soon") expiringSoonCount++;
    });

    return { 
      stats, 
      totalDocs: filteredRows.length, 
      expiredCount,
      expiringSoonCount
    };
  }, [filteredRows]);

  const handleExportCSV = () => {
    const headers = ["Document Number", "Document Type", "Category", "Issuing Authority", "Issue Date", "Expiry Date", "Status", "Notes", "Document URL"];
    
    const csvData = filteredRows.map(r => {
      const fullFileUrl = r.attachment_url 
        ? `https://xyyirkwiredufamtnqdu.supabase.co/storage/v1/object/public/company-documents/${r.attachment_url}`
        : "No Attachment";

      return [
        r.document_no || "N/A", 
        r.document_type, 
        r.category, 
        r.issuing_authority || "N/A", 
        r.issue_date, 
        r.expiry_date || "Permanent", 
        r.status, 
        r.notes || "-",
        fullFileUrl
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvData].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Documents_Report_${new Date().toISOString().split('T')}.csv`;
    link.click();
  };

const onSave = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Log to see if this even triggers
  console.log("Submit initiated, file state:", file);

  if (!documentNo) {
     alert("Document Number is required!");
     return;
  }

  setUploading(true);

  try {
    const formData = new FormData();
    const isMisc = mainCat === "Miscellaneous";
    
    formData.append("issue_date", issueDate);
    formData.append("expiry_date", expiryDate);
    formData.append("category", isMisc ? `Misc: ${customName}` : mainCat);
    formData.append("document_type", isMisc ? customName : subItem);
    formData.append("document_no", documentNo);
    formData.append("issuing_authority", issuingAuthority);
    formData.append("status", status);
    formData.append("notes", notes);

    if (editingId) formData.append("id", editingId);
    
    // 2. The surgical fix for the file append
if (file) {
  // Now 'file' is guaranteed to be a File object (not a FileList)
  formData.append("file", file);
}

    const method = editingId ? 'PATCH' : 'POST';
    
    // 3. LOG the fetch call attempt
    console.log("Attempting fetch to /api/admin/documents...");
    
    const response = await fetch('/api/admin/documents', { 
      method, 
      body: formData 
    });

    // 4. LOG the response status
    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Server error:", errorData);
      throw new Error(errorData.error || "Save failed");
    }

    // Success path...
    setEditingId(null); 
    setDocumentNo(""); 
    // ... rest of your reset code
    refreshData();
  } catch (err) { 
    console.error("Final catch block error:", err);
    alert("Error saving document. Check console for details."); 
  } finally { 
    setUploading(false); 
  }
};

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setDocumentNo(row.document_no || "");
    setIssuingAuthority(row.issuing_authority || "");
    setNotes(row.notes || "");
    setIssueDate(row.issue_date);
    setExpiryDate(row.expiry_date || "");
    setStatus(row.status || "active");
    setExistingFileUrl(row.attachment_url || null);
    
    if (row.category && row.category.startsWith("Misc:")) {
      setMainCat("Miscellaneous");
      setCustomName(row.document_type);
    } else {
      setMainCat(row.category);
      setSubItem(row.document_type);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const response = await fetch(`/api/admin/documents?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Delete failed");
      refreshData();
    } catch (err) { alert("Error deleting record."); }
  };

 const handleViewDocument = (fileName: string, typeName: string, docNo: string) => {
  // Use the bucket name 'company-documents' and the filename
  const { data } = supabase.storage
    .from('company-documents')
    .getPublicUrl(fileName);
    
  setPreviewUrl(data.publicUrl);
  setPreviewTitle(`${typeName} (${docNo})`);
};

  return (
    <div style={ui.wrapper}>
      <header style={ui.header}>
        <div style={ui.statCard}>
          <label style={ui.capsLabel}>Total Documents</label>
          <div style={ui.statVal}>{analytics.totalDocs} Docs</div>
          <button onClick={handleExportCSV} style={{...ui.resetBtn, background: '#0f172a', width: '100%', marginTop: '10px'}}>📥 Export CSV Records</button>
        </div>

        <div style={{...ui.statCard, borderLeft: '5px solid #ef4444'}}>
          <label style={ui.capsLabel}>Action Required</label>
          <div style={{...ui.statVal, color: '#ef4444'}}>{analytics.expiredCount + analytics.expiringSoonCount} Critical</div>
          <div style={ui.miniSub}>{analytics.expiredCount} Expired | {analytics.expiringSoonCount} Expiring Soon</div>
        </div>
        
        <div style={{...ui.statCard, flex: 2}}>
          <label style={ui.capsLabel}>Category Split (Click to filter)</label>
          <div style={ui.burnBarContainer}>
            {Object.entries(analytics.stats).map(([cat, val]: any) => {
              const percentage = analytics.totalDocs > 0 ? (val / analytics.totalDocs) * 100 : 0;
              if (percentage === 0) return null;
              return (
                <div key={cat} onClick={() => setFCat(cat)}
                  style={{ width: `${percentage}%`, background: DOCUMENT_MAP[cat].color, height: '100%', cursor: 'pointer' }} 
                  title={`${cat}: ${val} Items`}
                />
              );
            })}
          </div>
          <div style={ui.legendGrid}>
             {Object.entries(analytics.stats).map(([cat, val]: any) => (
                <div key={cat} onClick={() => setFCat(cat)} style={{...ui.legendItem, cursor: 'pointer', opacity: fCat === "All" || fCat === cat ? 1 : 0.4}}>
                   <div style={{...ui.dot, background: DOCUMENT_MAP[cat].color}} />
                   <span style={ui.legendText}>{cat}</span>
                   <span style={ui.legendVal}>{val} Items</span>
                </div>
             ))}
          </div>
        </div>
      </header>

      <section style={ui.filterBar}>
        <div style={ui.fGroup}><label style={ui.fLabel}>Category Filter</label>
          <select value={fCat} onChange={e => setFCat(e.target.value)} style={ui.fInput}>
            <option value="All">All Categories</option>
            {Object.keys(DOCUMENT_MAP).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={ui.fGroup}><label style={ui.fLabel}>Issue Date Range</label>
          <div style={{display:'flex', gap:'10px'}}>
            <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} style={ui.fInput} />
            <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} style={ui.fInput} />
          </div>
        </div>
        
        <div style={ui.fGroup}>
          <label style={ui.fLabel}>Search</label>
          <input 
            type="text" 
            placeholder="Search details, numbers..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{...ui.fInput, width: '220px'}} 
          />
        </div>
        <button 
          onClick={() => { setFCat("All"); setFStart(""); setFEnd(""); setSearchTerm(""); }} 
          style={ui.resetBtn}
        >
          Reset Filter
        </button>
      </section>

      <div style={ui.mainGrid}>
        <aside style={ui.sideCard}>
          <h3 style={{margin: '0 0 20px 0'}}>{editingId ? "📝 Edit Document" : "➕ Upload New Document"}</h3>
          <form onSubmit={onSave} style={ui.form}>
          
            <label style={ui.fLabel}>Document / License Number</label>
            <input placeholder="Enter Document Identification No" value={documentNo} onChange={e => setDocumentNo(e.target.value.toUpperCase())} style={ui.input} required />
            
            <label style={ui.fLabel}>Issuing Authority</label>
            <input placeholder="e.g. FSSAI, Govt of India" value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)} style={ui.input} />

            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex: 1}}><label style={ui.fLabel}>Main Group</label>
                <select value={mainCat} onChange={e => handleMainCatChange(e.target.value)} style={ui.input}>
                  {Object.keys(DOCUMENT_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{flex: 1}}><label style={ui.fLabel}>Current Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{...ui.input, borderColor: DOC_STATUS.find(s=>s.id===status)?.color}}>
                  {DOC_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <label style={ui.fLabel}>Specific Document Name</label>
            {mainCat === "Miscellaneous" ? (
              <input 
                placeholder="Enter doc type name..." 
                value={customName} 
                onChange={e => setCustomName(e.target.value)} 
                style={ui.input} 
                required 
              />
            ) : (
              <select value={subItem} onChange={e => setSubItem(e.target.value)} style={ui.input}>
                {DOCUMENT_MAP[mainCat]?.items.map((item: string) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}

            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex: 1}}><label style={ui.fLabel}>Issue Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={ui.input} required />
              </div>
              <div style={{flex: 1}}><label style={ui.fLabel}>Expiry Date</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={ui.input} placeholder="Leave blank if permanent" />
              </div>
            </div>

            <div style={{background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '11px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between'}}>
               <span>Validity Tracker:</span>
               <span style={{color: validityCalc.daysLeft < 0 || validityCalc.daysLeft <= 60 ? '#ef4444' : '#10b981', fontWeight: 'bold'}}>{validityCalc.statusText}</span>
            </div>
            
            <label style={ui.fLabel}>Internal Remarks</label>
            <input 
              placeholder="Notes or renewal requirements..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              style={ui.input} 
            />

            <label style={ui.fLabel}>Upload Digital File (PDF/Image)</label>
            <input 
              id="doc-file-input"
              type="file" 
        onChange={(e) => {
// SURGICAL FIX: Select the first file from the FileList
    const files = e.target.files;
    setFile(files && files.length > 0 ? files[0] : null);
}}
              style={{...ui.input, fontSize: '12px'}} 
            />

            <button type="submit" disabled={uploading} style={ui.saveBtn}>{uploading ? "Uploading File..." : editingId ? "Update System" : "Save Record"}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setFile(null); setExistingFileUrl(null); }} style={{...ui.saveBtn, background:'#94a3b8', marginTop:'-5px'}}>Cancel</button>}
          </form>
        </aside>

        <main style={ui.tableCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={ui.table}>
              <thead style={ui.thRow}>
                <tr>
                  <th style={ui.th}>ISSUE DATE</th>
                  <th style={ui.th}>DOCUMENT ID</th>
                  <th style={ui.th}>CATEGORY CLASS</th>
                  <th style={ui.th}>DOCUMENT TYPE / STATUS</th>
                  <th style={ui.th}>EXPIRY</th>
                  <th style={ui.th}>AUTHORITY</th>
                  <th style={ui.th}>REMARKS</th>
                  <th style={ui.th}>FILE</th>
                  <th style={ui.th}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => {
                  const statusObj = (DOC_STATUS.find(s => s.id === row.status) || DOC_STATUS) as { id: string; label: string; color: string };
                  
                  return (
                    <tr key={row.id} style={ui.tr}>
                      <td style={ui.td}>{new Date(row.issue_date).toLocaleDateString('en-IN')}</td>
                      <td style={{...ui.td, fontSize: '12px', fontWeight: 'bold'}}>{row.document_no || '-'}</td>
                      <td style={{...ui.td, fontSize: '12px', color: '#64748b'}}>{row.category}</td>
                      <td style={ui.td}>
                        <div style={{fontWeight: 'bold'}}>{row.document_type}</div>
                        <div style={{fontSize: '10px', color: statusObj.color, fontWeight: '800'}}>{statusObj.label}</div>
                      </td>
                      <td style={{...ui.td, fontWeight: '700', color: row.status === 'expired' ? '#ef4444' : '#475569'}}>
                        {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('en-IN') : '♾️ Permanent'}
                      </td>
                      <td style={{...ui.td, fontSize: '12px'}}>{row.issuing_authority || '--'}</td>
                      <td style={{...ui.td, fontSize: '11px', color: '#64748b', maxWidth: '150px'}}>{row.notes || '-'}</td>
                      <td style={ui.td}>
                        {row.file_path ? (
                          <button 
                            onClick={() => handleViewDocument(row.file_path, row.document_type, row.document_no)} 
                            style={{...ui.editBtn, background: '#e0f2fe', color: '#0369a1'}}
                          >
                            👁️ View Doc
                          </button>
                        ) : <span style={{fontSize: '11px', color: '#cbd5e1'}}>None</span>}
                      </td>
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

      {/* EXPENSE-PAGE STYLE SCREEN MODAL OVERLAY PREVIEW */}
      {previewUrl && (
        <div style={ui.modalOverlay}>
          <div style={ui.modalContent}>
            <div style={ui.modalHeader}>
              <h3 style={{margin: 0, color: '#0f172a'}}>{previewTitle}</h3>
              <button onClick={() => setPreviewUrl(null)} style={ui.closeModalBtn}>✕ Close Preview</button>
            </div>
            <div style={ui.modalBody}>
              {previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={previewUrl} style={{width: '100%', height: '100%', border: 'none', borderRadius: '12px'}} title="Document Viewer" />
              ) : (
                <img src={previewUrl} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px'}} alt="Document Attached Asset" />
              )}
            </div>
            <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end'}}>
              <button onClick={() => window.open(previewUrl, '_blank')} style={{...ui.editBtn, background: '#0f172a', color: '#fff'}}>Open Document in New Tab ↗</button>
            </div>
          </div>
        </div>
      )}
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
  editBtn: { background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#475569', fontSize: '12px' },
  delBtn: { background: '#fee2e2', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#ef4444', fontSize: '12px' },
  
  // Clean, centered blur background overlay just like an expense preview sheet drawer
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalContent: { background: '#fff', width: '75vw', height: '85vh', borderRadius: '24px', padding: '30px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' },
  modalBody: { flex: 1, background: '#f8fafc', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: '10px', border: '1px solid #e2e8f0' },
  closeModalBtn: { background: '#fee2e2', border: 'none', color: '#ef4444', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' }
};