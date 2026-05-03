"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function EarthyMachinery() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [extraFiles, setExtraFiles] = useState<any[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [newLog, setNewLog] = useState({ issue_description: "", cost: "", status: "Fixed" });

  const [form, setForm] = useState({
    machine_name: "", model_number: "", install_date: "",
    status: "Operating", criticality: "Medium", next_maintenance: "", vendor_contact: "",
    video_url: "" 
  });
  
  const [manualFile, setManualFile] = useState<File | null>(null);

  const getPublicUrl = (path: string) => {
    if (!path) return "";
    if (path.includes('youtube.com') || path.includes('youtu.be')) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/machinery-assets/${path}`;
  };

  const isUrgent = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  };

  const fetchMachines = async () => {
    try {
      const res = await fetch('/api/admin/machinery');
      if (res.ok) {
        const data = await res.json();
        setMachines(data || []);
      }
    } catch (err) {
      console.error("Fetch Machines Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (machineId: string) => {
    try {
      const res = await fetch(`/api/admin/machinery/logs?machineId=${machineId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (err) {
      console.error("Fetch Logs Error:", err);
    }
  };

  const fetchExtraFiles = async (machineId: string) => {
    try {
      const res = await fetch(`/api/admin/machinery/files?machineId=${machineId}`);
      if (res.ok) {
        const data = await res.json();
        setExtraFiles(data || []);
      }
    } catch (err) {
      console.error("Fetch Files Error:", err);
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    if (!confirm("Delete this technical file?")) return;
    try {
      await supabase.storage.from('machinery-assets').remove([filePath]);
      const res = await fetch(`/api/admin/machinery/files?id=${fileId}`, { method: 'DELETE' });
      if (res.ok) fetchExtraFiles(selectedMachine.id);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  useEffect(() => { fetchMachines(); }, []);

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setForm({ ...m, video_url: m.video_url || "" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Confirm deletion of this asset?")) return;
    const res = await fetch(`/api/admin/machinery?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchMachines();
  };

  const handleSaveLog = async () => {
    if (!newLog.issue_description) return alert("Please describe the issue");
    const res = await fetch('/api/admin/machinery/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newLog, machine_id: selectedMachine.id })
    });
    
    if (res.ok) {
      setNewLog({ issue_description: "", cost: "", status: "Fixed" });
      fetchLogs(selectedMachine.id);
    }
  };

  const handleUploadAdditional = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingExtra(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('machineId', selectedMachine.id);
        const res = await fetch('/api/admin/machinery/files', { method: 'POST', body: fd });
        if (!res.ok) throw new Error("Upload failed");
      }
      fetchExtraFiles(selectedMachine.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingExtra(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v as string));
    if (manualFile) fd.append('manual', manualFile);
    if (editingId) fd.append('id', editingId);

    const res = await fetch('/api/admin/machinery', { 
      method: editingId ? 'PUT' : 'POST', 
      body: fd 
    });

    if (res.ok) {
      alert(editingId ? "Asset Updated" : "Asset Saved");
      setEditingId(null);
      setForm({ machine_name: "", model_number: "", install_date: "", status: "Operating", criticality: "Medium", next_maintenance: "", vendor_contact: "", video_url: "" });
      setManualFile(null);
      fetchMachines();
    }
    setSubmitting(false);
  };

  return (
    <div style={ui.container}>
      <aside style={ui.sidebar}>
        <div style={ui.logoSection}>
          <img src="/EarthyLogo.JPG" alt="Earthy Source" style={ui.logoImg} />
          <div style={ui.brandName}>EARTHY SOURCE</div>
          <div style={ui.brandSub}>ASSET MANAGEMENT</div>
        </div>

        <form onSubmit={handleSave} style={ui.form}>
          <h3 style={ui.formTitle}>{editingId ? "Edit Asset" : "Register New Asset"}</h3>
          <div style={ui.inputGrp}>
            <label style={ui.label}>Machine Name</label>
            <input placeholder="Name" style={ui.input} value={form.machine_name} onChange={e => setForm({...form, machine_name: e.target.value})} required />
          </div>
          <div style={ui.inputGrp}>
            <label style={ui.label}>Model / Serial No</label>
            <input placeholder="Model" style={ui.input} value={form.model_number} onChange={e => setForm({...form, model_number: e.target.value})} />
          </div>
          <div style={ui.row}>
            <div style={{flex:1}}><label style={ui.label}>Install Date</label>
              <input type="date" style={ui.input} value={form.install_date} onChange={e => setForm({...form, install_date: e.target.value})} />
            </div>
            <div style={{flex:1}}><label style={ui.label}>Next Service</label>
              <input type="date" style={ui.input} value={form.next_maintenance} onChange={e => setForm({...form, next_maintenance: e.target.value})} />
            </div>
          </div>
          <div style={ui.inputGrp}>
            <label style={ui.label}>Criticality Level</label>
            <select style={ui.input} value={form.criticality} onChange={e => setForm({...form, criticality: e.target.value})}>
              <option value="High">🔴 High</option><option value="Medium">🟡 Medium</option><option value="Low">🟢 Low</option>
            </select>
          </div>
          <div style={ui.fileBox}><label style={ui.label}>📄 Manual (PDF)</label>
            <input type="file" accept=".pdf" onChange={e => setManualFile(e.target.files?.[0] || null)} />
          </div>
          
          <div style={ui.fileBox}>
            <label style={ui.label}>📽️ YouTube Training Links</label>
            <textarea 
              placeholder="Paste links here. Separate multiple links with a comma." 
              style={{...ui.input, width: '100%', marginTop: '5px', height: '60px', resize: 'none'}} 
              value={form.video_url} 
              onChange={e => setForm({...form, video_url: e.target.value})} 
            />
          </div>

          <button type="submit" disabled={submitting} style={ui.btn}>{submitting ? "Saving..." : editingId ? "UPDATE ASSET" : "DEPLOY ASSET"}</button>
          {editingId && <button onClick={() => setEditingId(null)} style={{...ui.btn, background:'#555', marginTop:'5px'}}>Cancel</button>}
        </form>
      </aside>

      <main style={ui.main}>
        <header style={ui.header}>
          <h1 style={ui.title}>Plant Machinery Repository</h1>
          <div style={ui.statsRow}>
            <div style={ui.statCard}><b>{machines.length}</b> <br/> Total Assets</div>
            <div style={ui.statCard}><b>{machines.filter(m => m.criticality === 'High').length}</b> <br/> Critical</div>
            <div style={{...ui.statCard, color: '#cf1322', border: '1px solid #ffccc7'}}>
              <b>{machines.filter(m => isUrgent(m.next_maintenance)).length}</b> <br/> Due Soon
            </div>
          </div>
        </header>

        {loading ? (
          <p>Loading Assets...</p>
        ) : (
          <div style={ui.grid}>
            {machines.map(m => {
              const urgent = isUrgent(m.next_maintenance);
              const videoLinks = m.video_url ? m.video_url.split(',').map((url: string) => url.trim()).filter((url: string) => url !== "") : [];
              
              return (
                <div key={m.id} style={{
                  ...ui.card,
                  border: urgent ? '2px solid #ff4d4f' : ui.card.border,
                  background: urgent ? '#fff1f0' : '#fff'
                }}>
                  <div style={ui.cardHeader}>
                    <span style={{...ui.status, background: m.status === 'Operating' ? '#e6f4ea' : '#fce8e6'}}>{m.status}</span>
                    {urgent && <span style={{fontSize: '10px', color: '#cf1322', fontWeight: 'bold'}}>⚠️ DUE SOON</span>}
                    <div style={{display:'flex', gap:'8px'}}>
                      <button onClick={() => handleEdit(m)} style={ui.iconBtn}>✏️</button>
                      <button onClick={() => handleDelete(m.id)} style={{...ui.iconBtn, color:'red'}}>🗑️</button>
                    </div>
                  </div>
                  <h2 style={ui.mName}>{m.machine_name}</h2>
                  <div style={ui.mDetails}>
                    <p>SN: {m.model_number}</p>
                    <p>🔧 Next Service: <b style={{color: urgent ? '#cf1322' : 'inherit'}}>{m.next_maintenance}</b></p>
                  </div>
                  <div style={{...ui.actions, flexWrap: 'wrap'}}>
                    <button disabled={!m.manual_url} onClick={() => window.open(getPublicUrl(m.manual_url))} style={ui.actionBtn}>Manual</button>
                    
                    {videoLinks.map((link: string, idx: number) => (
                      <button 
                        key={idx}
                        onClick={() => window.open(link.startsWith('http') ? link : `https://www.youtube.com/watch?v=${link}`)} 
                        style={{...ui.actionBtn, borderColor: '#ff0000', color: '#ff0000'}}
                      >
                        Video {videoLinks.length > 1 ? idx + 1 : ""}
                      </button>
                    ))}
                    
                    <button onClick={() => { setSelectedMachine(m); fetchLogs(m.id); fetchExtraFiles(m.id); }} style={{...ui.actionBtn, background:'#1e3a3a', color:'#fff'}}>History</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedMachine && (
        <div style={ui.modalOverlay}>
          <div style={ui.modal}>
            <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', paddingBottom:'15px'}}>
              <h2>{selectedMachine.machine_name} - Repository</h2>
              <button onClick={() => setSelectedMachine(null)} style={{border:'none', background:'none', fontSize:'24px', cursor:'pointer'}}>×</button>
            </div>
            <div style={{display:'flex', gap:'30px', marginTop:'20px'}}>
              <div style={{flex:1.5}}>
                <h3>🛠️ Maintenance History</h3>
                <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '8px', marginBottom: '15px'}}>
                  {logs.length === 0 ? <p style={{fontSize: '12px', color: '#999'}}>No history found.</p> : logs.map(log => (
                    <div key={log.id} style={{fontSize: '12px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', marginBottom: '10px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}><b>{log.log_date}</b><span>{log.status}</span></div>
                      <div>{log.issue_description}</div>
                      <div style={{color: '#666'}}>Cost: ₹{log.cost}</div>
                    </div>
                  ))}
                </div>

                <h3>📂 Extra Technical Files</h3>
                <div style={{maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '8px'}}>
                  {extraFiles.length === 0 ? <p style={{fontSize: '12px', color: '#999'}}>No extra files.</p> : extraFiles.map(f => (
                    <div key={f.id} style={{fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0', alignItems: 'center'}}>
                      <span style={{cursor:'pointer', color:'#4caf50', textDecoration: 'underline'}} onClick={() => window.open(getPublicUrl(f.file_url))}>📄 {f.file_name}</span>
                      <button onClick={() => handleDeleteFile(f.id, f.file_url)} style={{background:'none', border:'none', cursor:'pointer', fontSize: '14px'}}>🗑️</button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    extraFiles.forEach(f => {
                      const link = document.createElement('a');
                      link.href = getPublicUrl(f.file_url);
                      link.download = f.file_name;
                      link.target = "_blank";
                      link.click();
                    });
                  }}
                  style={{...ui.btn, background: '#666', marginTop: '10px', fontSize: '12px', width: '100%'}}
                >
                  📥 DOWNLOAD ALL ASSETS
                </button>
              </div>

              <div style={{flex:1, background: '#f9f9f9', padding: '15px', borderRadius: '8px'}}>
                <h3 style={{marginTop:0}}>+ Add Record</h3>
                <input placeholder="Issue" style={{...ui.input, background: '#fff', color: '#333', marginBottom: '5px', width: '100%'}} value={newLog.issue_description} onChange={e => setNewLog({...newLog, issue_description: e.target.value})} />
                <input placeholder="Cost" type="number" style={{...ui.input, background: '#fff', color: '#333', marginBottom: '5px', width: '100%'}} value={newLog.cost} onChange={e => setNewLog({...newLog, cost: e.target.value})} />
                <select style={{...ui.input, background: '#fff', color: '#333', marginBottom: '10px', width: '100%'}} value={newLog.status} onChange={e => setNewLog({...newLog, status: e.target.value})}>
                  <option value="Fixed">Fixed</option><option value="In Progress">In Progress</option><option value="Pending">Pending</option>
                </select>
                <button onClick={handleSaveLog} style={{...ui.btn, width: '100%', marginBottom:'15px'}}>Save Log</button>
                
                <h3 style={{borderTop:'1px solid #ddd', paddingTop:'15px'}}>+ Upload Files</h3>
                <label style={{...ui.btn, display:'block', textAlign:'center', background:'#1e3a3a', cursor: 'pointer'}}>
                  {uploadingExtra ? "Uploading..." : "Select Files"}
                  <input type="file" multiple hidden onChange={handleUploadAdditional} disabled={uploadingExtra} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const ui: any = {
  container: { display: 'flex', minHeight: '100vh', background: '#f9fbf9' },
  sidebar: { width: '380px', background: '#1e3a3a', padding: '40px', color: '#fff', position:'sticky', top:0, height:'100vh' },
  logoSection: { textAlign: 'center', marginBottom: '30px' },
  logoImg: { width: '80px', marginBottom: '10px', borderRadius:'8px' },
  brandName: { fontWeight: '900', fontSize: '18px', letterSpacing: '1px' },
  brandSub: { fontSize: '10px', opacity: 0.7 },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  formTitle: { fontSize: '18px', borderBottom: '1px solid #2d5a5a', paddingBottom: '10px', color:'#4caf50' },
  inputGrp: { display:'flex', flexDirection:'column', gap:'4px' },
  label: { fontSize: '11px', color: '#8fbaba', fontWeight: 'bold' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #2d5a5a', background: '#264d4d', color: '#fff', fontSize:'13px' },
  fileBox: { background: '#264d4d', padding: '8px', borderRadius: '6px' },
  btn: { padding: '12px', background: '#4caf50', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  main: { flex: 1, padding: '50px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' },
  title: { fontSize: '28px', color: '#1e3a3a', margin: 0 },
  statsRow: { display: 'flex', gap: '15px', marginBottom: '10px', position: 'relative', zIndex: 1 },
  statCard: { background: '#fff', padding: '12px 20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', color: '#1e3a3a', fontSize:'13px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' },
  card: { background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #e0eadd', boxShadow:'0 4px 12px rgba(0,0,0,0.03)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '10px' },
  status: { fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' },
  iconBtn: { background:'none', border:'none', cursor:'pointer', fontSize:'14px' },
  mName: { fontSize: '18px', color: '#1e3a3a', margin: '0' },
  mDetails: { fontSize: '12px', color: '#666', margin: '10px 0', borderTop:'1px solid #f0f0f0', paddingTop:'10px' },
  actions: { display: 'flex', gap: '8px', marginTop:'15px' },
  actionBtn: { flex: 1, padding: '8px', border: '1px solid #1e3a3a', background: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  modalOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:100 },
  modal: { background:'#fff', width:'750px', padding:'30px', borderRadius:'15px', boxShadow:'0 20px 40px rgba(0,0,0,0.2)' }
};