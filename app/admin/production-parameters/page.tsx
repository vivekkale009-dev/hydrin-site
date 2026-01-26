"use client";
import { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SKUAndCostManager() {
  const supabase = createClientComponentClient();
  
  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // UI States
  const [loading, setLoading] = useState(true);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT">("ADD");

  // Form States
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [skuName, setSkuName] = useState("");
  const [skuVol, setSkuVol] = useState("500");
  const [skuUnits, setSkuUnits] = useState("24");

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('products').select('*').order('volume_ml', { ascending: true });
    const { data: c } = await supabase.from('product_cost_components').select('*');
    setProducts(p || []);
    setCosts(c || []);
    if (p && p.length > 0 && !selectedProductId) setSelectedProductId(p[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const activeComponents = useMemo(() => costs.filter(c => c.product_id === selectedProductId), [costs, selectedProductId]);
  const totalCost = useMemo(() => activeComponents.reduce((acc, curr) => acc + Number(curr.cost_per_unit), 0), [activeComponents]);

  // --- SKU ACTIONS ---
  const openAddModal = () => {
    setModalMode("ADD");
    setSkuName(""); setSkuVol("500"); setSkuUnits("24");
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setModalMode("EDIT");
    setEditingSkuId(p.id);
    setSkuName(p.name);
    setSkuVol(p.volume_ml.toString());
    setSkuUnits(p.units_per_box.toString());
    setShowModal(true);
  };

  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: skuName,
      volume_ml: parseInt(skuVol),
      units_per_box: parseInt(skuUnits),
      bottles_per_box: parseInt(skuUnits),
      category: 'standard'
    };

    if (modalMode === "ADD") {
      await supabase.from('products').insert([payload]);
    } else {
      await supabase.from('products').update(payload).eq('id', editingSkuId);
    }
    
    setShowModal(false);
    fetchData();
  };

  const handleDeleteSku = async (id: string) => {
    if (confirm("Delete this SKU and ALL its cost data? This cannot be undone.")) {
      // Supabase usually handles cascading deletes if configured, 
      // otherwise, delete components first.
      await supabase.from('product_cost_components').delete().eq('product_id', id);
      await supabase.from('products').delete().eq('id', id);
      setSelectedProductId("");
      fetchData();
    }
  };

  // --- COMPONENT ACTIONS ---
  const handleUpdateCost = async (id: string, val: string) => {
    await supabase.from('product_cost_components').update({ cost_per_unit: parseFloat(val) }).eq('id', id);
    fetchData();
  };

  const handleAddComponent = async () => {
    await supabase.from('product_cost_components').insert([{
      product_id: selectedProductId,
      component_key: newKey.toUpperCase(),
      cost_per_unit: parseFloat(newVal),
      is_active: true
    }]);
    setNewKey(""); setNewVal(""); setIsAddingComponent(false);
    fetchData();
  };

  return (
    <div style={ui.wrapper}>
      {/* MODAL FOR ADD/EDIT SKU */}
      {showModal && (
        <div style={ui.modalOverlay}>
          <div style={ui.modalCard}>
            <h3>{modalMode === "ADD" ? "Create New SKU" : "Modify SKU"}</h3>
            <form onSubmit={handleSkuSubmit} style={ui.form}>
              <label style={ui.fLabel}>Name</label>
              <input value={skuName} onChange={e=>setSkuName(e.target.value)} style={ui.input} required />
              <div style={{display:'flex', gap:'10px'}}>
                <input type="number" placeholder="ml" value={skuVol} onChange={e=>setSkuVol(e.target.value)} style={ui.input} />
                <input type="number" placeholder="Units/Box" value={skuUnits} onChange={e=>setSkuUnits(e.target.value)} style={ui.input} />
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <button type="submit" style={ui.saveBtn}>Save SKU</button>
                <button type="button" onClick={()=>setShowModal(false)} style={ui.cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header style={ui.header}>
        <h1 style={ui.title}>Production Master Dashboard</h1>
      </header>

      <div style={ui.mainGrid}>
        {/* SIDEBAR */}
        <aside style={ui.sidebar}>
          <button onClick={openAddModal} style={ui.addSkuBtn}>+ Create New SKU</button>
          <div style={{marginTop:'20px'}}>
            {products.map(p => (
              <div key={p.id} onClick={()=>setSelectedProductId(p.id)} style={{...ui.skuCard, borderColor: selectedProductId === p.id ? '#3b82f6' : '#e2e8f0'}}>
                <div style={ui.skuName}>{p.name}</div>
                <div style={ui.skuMeta}>{p.volume_ml}ml • {p.units_per_box} Units</div>
                <div style={ui.skuActions}>
                  <span onClick={(e)=>{e.stopPropagation(); openEditModal(p)}} style={ui.actionLink}>Edit</span>
                  <span onClick={(e)=>{e.stopPropagation(); handleDeleteSku(p.id)}} style={{...ui.actionLink, color:'#ef4444'}}>Delete</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={ui.content}>
          <div style={ui.summaryBar}>
            <div>
              <label style={ui.capsLabel}>Unit Production Cost</label>
              <div style={ui.totalAmt}>₹{totalCost.toFixed(2)}</div>
            </div>
            <button onClick={()=>setIsAddingComponent(true)} style={ui.primaryBtn}>+ Add Component</button>
          </div>

          <table style={ui.table}>
            <thead><tr style={ui.thRow}><th style={ui.th}>Component</th><th style={ui.th}>Cost</th><th style={ui.th}>Action</th></tr></thead>
            <tbody>
              {activeComponents.map(c => (
                <tr key={c.id} style={ui.tr}>
                  <td style={ui.td}><strong>{c.component_key}</strong></td>
                  <td style={ui.td}><input type="number" step="0.01" defaultValue={c.cost_per_unit} onBlur={(e)=>handleUpdateCost(c.id, e.target.value)} style={ui.inlineInput}/></td>
                  <td style={ui.td}><button onClick={async()=>{await supabase.from('product_cost_components').delete().eq('id', c.id); fetchData();}} style={ui.delBtn}>Remove</button></td>
                </tr>
              ))}
              {isAddingComponent && (
                <tr style={{background:'#f8fafc'}}>
                  <td style={ui.td}><input placeholder="Key" value={newKey} onChange={e=>setNewKey(e.target.value)} style={ui.inlineInput}/></td>
                  <td style={ui.td}><input placeholder="0.00" value={newVal} onChange={e=>setNewVal(e.target.value)} style={ui.inlineInput}/></td>
                  <td style={ui.td}><button onClick={handleAddComponent} style={ui.saveBtn}>Add</button></td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}

const ui: any = {
  wrapper: { padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { marginBottom: '20px' },
  title: { fontSize: '24px', fontWeight: '900' },
  mainGrid: { display: 'flex', gap: '30px' },
  sidebar: { width: '280px' },
  content: { flex: 1, background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  skuCard: { background: '#fff', padding: '15px', borderRadius: '12px', border: '2px solid', marginBottom: '10px', cursor: 'pointer' },
  skuName: { fontWeight: 'bold', fontSize: '14px' },
  skuMeta: { fontSize: '12px', color: '#64748b' },
  skuActions: { marginTop: '10px', display: 'flex', gap: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' },
  actionLink: { fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', color: '#3b82f6' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalCard: { background: '#fff', padding: '30px', borderRadius: '15px', width: '350px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box' },
  addSkuBtn: { width: '100%', padding: '15px', borderRadius: '12px', border: '2px dashed #3b82f6', color: '#3b82f6', fontWeight: 'bold', background: '#eff6ff', cursor: 'pointer' },
  saveBtn: { background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: 1 },
  cancelBtn: { background: '#f1f5f9', color: '#475569', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', flex: 1 },
  summaryBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  totalAmt: { fontSize: '32px', fontWeight: '900', color: '#10b981' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '15px' },
  th: { textAlign: 'left', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', padding: '15px' },
  inlineInput: { padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100px' },
  delBtn: { color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }
};