"use client";
import { useState, useEffect } from "react";

export default function RecipeConfig() {
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // Form State
  const [selectedProduct, setSelectedProduct] = useState("");
  const [matId, setMatId] = useState("");
  const [qty, setQty] = useState("");

  // Quick Add Modal State
  const [showModal, setShowModal] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("grams");
  const [newMatGrammage, setNewMatGrammage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matRes, configRes] = await Promise.all([
        fetch('/api/admin/raw-materials'),
        fetch('/api/admin/raw-materials/recipe')
      ]);

      const materialsData = await matRes.json();
      const configData = await configRes.json();
      
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setProducts(configData.products || []);
      setRecipes(configData.recipes || []);
    } catch (err) {
      console.error("Data Load Error:", err);
    }
  };

  const saveRecipeItem = async () => {
    if (!selectedProduct || !matId || !qty) return alert("Please fill all configuration fields.");
    
    const response = await fetch('/api/admin/raw-materials/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selectedProduct,
        material_id: matId,
        quantity_per_box: Number(qty)
      }),
    });

    if (response.ok) {
      setMatId("");
      setQty("");
      loadData(); 
      alert("Configuration saved successfully.");
    } else {
      const result = await response.json();
      alert("Save Error: " + result.error);
    }
  };

  // --- NEW: DELETE RECIPE ITEM ---
  const handleDeleteRecipe = async (id: string) => {
    if (!confirm("Remove this material from the recipe?")) return;
    
    const response = await fetch(`/api/admin/raw-materials/recipe?id=${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      loadData();
    } else {
      alert("Delete failed.");
    }
  };

  // --- NEW: EDIT RECIPE ITEM ---
  const handleEditRecipe = async (recipeItem: any) => {
    const newQty = prompt(`Update quantity for ${recipeItem.raw_materials?.name}:`, recipeItem.quantity_per_box);
    
    if (newQty === null || newQty === "" || Number(newQty) === recipeItem.quantity_per_box) return;

    const response = await fetch('/api/admin/raw-materials/recipe', {
      method: 'POST', // Re-using existing POST to upsert the update
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: recipeItem.product_id,
        material_id: recipeItem.material_id,
        quantity_per_box: Number(newQty)
      }),
    });

    if (response.ok) loadData();
    else alert("Update failed.");
  };

  const handleQuickAdd = async () => {
    if (!newMatName) return alert("Name is required");

    const response = await fetch('/api/admin/raw-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newMatName,
        unit: newMatUnit,
        grammage: newMatGrammage,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      setShowModal(false);
      setNewMatName("");
      setNewMatGrammage("");
      loadData();
    } else {
      alert("API Error: " + result.error);
    }
  };

  return (
    <div style={ui.pageWrapper}>
      <div style={ui.header}>
        <div>
          <h2 style={ui.title}>Bill of Materials (BOM) Engine</h2>
          <p style={ui.subtitle}>Configure precise raw material requirements for your production lines.</p>
        </div>
        <button style={ui.outlineBtn} onClick={() => setShowModal(true)}>
          + Quick Add Raw Material
        </button>
      </div>

      <div style={ui.controlPanel}>
        <div style={ui.inputGroup}>
          <label style={ui.label}>Target SKU</label>
          <select style={ui.select} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">-- Select Product --</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={ui.inputGroup}>
          <label style={ui.label}>Required Material</label>
          <select style={ui.select} value={matId} onChange={(e) => setMatId(e.target.value)}>
            <option value="">-- Select Material --</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
          </select>
        </div>

        <div style={ui.inputGroup}>
          <label style={ui.label}>Consumption (Per Box)</label>
          <input 
            type="number" 
            placeholder="e.g., 24" 
            style={ui.input} 
            value={qty} 
            onChange={(e) => setQty(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={saveRecipeItem} style={ui.primaryBtn}>Save Configuration</button>
        </div>
      </div>

      <div style={ui.grid}>
        {products.map(p => {
          const productRecipes = recipes.filter(r => r.product_id === p.id);
          return (
            <div key={p.id} style={ui.card}>
              <div style={ui.cardHeader}>
                <h3 style={ui.cardTitle}>{p.name}</h3>
                <span style={ui.badge}>{productRecipes.length} Items</span>
              </div>
              <div style={ui.cardBody}>
                {productRecipes.length === 0 ? (
                  <p style={ui.emptyText}>No materials configured.</p>
                ) : (
                  productRecipes.map(r => (
                    <div key={r.id} style={ui.recipeRow}>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={ui.materialName}>{r.raw_materials?.name || 'Unknown'}</span>
                        <div style={{display: 'flex', gap: '10px', marginTop: '4px'}}>
                           <button onClick={() => handleEditRecipe(r)} style={ui.actionLinkEdit}>Edit</button>
                           <button onClick={() => handleDeleteRecipe(r.id)} style={ui.actionLinkDelete}>Remove</button>
                        </div>
                      </div>
                      <span style={ui.materialQty}>{r.quantity_per_box} {r.raw_materials?.unit}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={ui.modalOverlay}>
          <div style={ui.modal}>
            <h3 style={ui.modalTitle}>Add New Raw Material</h3>
            <p style={ui.modalSubtitle}>Instantly add a material to your database.</p>
            
            <label style={ui.label}>Material Name</label>
            <input 
              type="text" 
              placeholder="e.g., 28mm Caps" 
              style={{...ui.input, width: '100%', marginBottom: '15px'}} 
              value={newMatName}
              onChange={(e) => setNewMatName(e.target.value)}
            />

            <label style={ui.label}>Measurement Unit</label>
            <select 
              style={{...ui.select, width: '100%', marginBottom: '15px'}}
              value={newMatUnit}
              onChange={(e) => setNewMatUnit(e.target.value)}
            >
              <option value="grams">Grams (g)</option>
              <option value="pieces">Pieces</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="liters">Liters (L)</option>
              <option value="rolls">Rolls</option>
            </select>
            
            <label style={ui.label}>Grammage / Weight (Optional)</label>
            <input 
              type="number" step="0.1"
              placeholder="e.g., 17.5" 
              style={{...ui.input, width: '100%', marginBottom: '25px'}} 
              value={newMatGrammage}
              onChange={(e) => setNewMatGrammage(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={ui.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={ui.primaryBtn} onClick={handleQuickAdd}>Save Material</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ui: any = {
  // Existing styles kept exactly as provided
  pageWrapper: { padding: '40px', background: '#F4F7F6', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { fontSize: '15px', color: '#64748B', marginTop: '5px' },
  controlPanel: { background: '#FFFFFF', padding: '25px', borderRadius: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #E2E8F0' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '15px', color: '#1E293B', background: '#F8FAFC', outline: 'none' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '15px', color: '#1E293B', background: '#F8FAFC', outline: 'none' },
  primaryBtn: { background: '#2C5E3B', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', height: '47px' },
  outlineBtn: { background: 'transparent', color: '#2C5E3B', border: '2px solid #2C5E3B', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#F1F5F9', color: '#475569', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardHeader: { background: '#2C5E3B', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#FFFFFF' },
  badge: { background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  cardBody: { padding: '20px', flex: 1, background: '#FFFFFF' },
  emptyText: { color: '#94A3B8', fontSize: '14px', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '20px 0' },
  recipeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F1F5F9' },
  materialName: { fontSize: '15px', color: '#334155', fontWeight: '500' },
  materialQty: { fontSize: '15px', color: '#0F172A', fontWeight: '700', background: '#F8FAFC', padding: '4px 10px', borderRadius: '6px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#FFFFFF', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  modalTitle: { margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700', color: '#1E293B' },
  modalSubtitle: { margin: '0 0 20px 0', fontSize: '14px', color: '#64748B' },
  
  // New Styles for Edit/Remove links
  actionLinkEdit: { background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 },
  actionLinkDelete: { background: 'none', border: 'none', color: '#DC2626', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }
};