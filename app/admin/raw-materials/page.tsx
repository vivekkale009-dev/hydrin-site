"use client";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function RawMaterialDashboard() {
  const supabase = createClientComponentClient();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch('/api/admin/raw-materials'); 
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API returned HTML instead of JSON. Check if the API route path is correct.");
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id: string, newVal: number) => {
    const res = await fetch('/api/admin/raw-materials/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, current_stock: newVal })
    });
    if (!res.ok) alert("Update failed. Check API logs.");
    else fetchMaterials();
  };

  // --- UPDATED: Update Threshold Function ---
  const handleUpdateThreshold = async (id: string, newVal: number) => {
    const res = await fetch('/api/admin/raw-materials/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, low_stock_threshold: newVal })
    });
    if (!res.ok) alert("Threshold update failed.");
    else fetchMaterials();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/admin/raw-materials?id=${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchMaterials();
    } else {
      const err = await res.json();
      alert("Delete failed: " + err.error);
    }
  };

  const handleEditPrompt = async (item: any) => {
    const newName = prompt("Enter new name for the material:", item.name);
    const newThreshold = prompt("Enter new Min. Threshold:", item.low_stock_threshold || 100);
    
    if (!newName && !newThreshold) return;

    const res = await fetch('/api/admin/raw-materials/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: item.id, 
        name: newName || item.name,
        low_stock_threshold: Number(newThreshold) || item.low_stock_threshold 
      })
    });

    if (res.ok) fetchMaterials();
    else alert("Edit failed.");
  };

  const criticalItems = materials.filter(m => m.current_stock <= (m.low_stock_threshold || 100));

  return (
    <div style={ui.pageWrapper}>
      <div style={ui.header}>
        <div>
          <h2 style={ui.title}>Raw Material Inventory</h2>
          <p style={ui.subtitle}>Tracking packaging components and supply levels.</p>
        </div>
        <a href="/admin/raw-materials/recipe" style={ui.primaryBtn}>Manage BOM Recipes</a>
      </div>

      {error && (
        <div style={ui.errorBanner}>
          <strong>Database Sync Error:</strong> {error}
        </div>
      )}

      {criticalItems.length > 0 && (
        <div style={ui.alertContainer}>
          <div style={ui.alertHeader}>⚠️ Low Stock Warning</div>
          <div style={ui.alertGrid}>
            {criticalItems.map(m => (
              <div key={m.id} style={ui.alertCard}>
                <strong>{m.name}</strong>: {m.current_stock} remaining
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={ui.tableCard}>
        <table style={ui.table}>
          <thead>
            <tr style={ui.thRow}>
              <th style={ui.th}>Material Name</th>
              <th style={ui.th}>Spec (Weight)</th>
              <th style={ui.th}>Current Stock</th>
              <th style={ui.th}>Min. Threshold</th>
              <th style={ui.th}>Status</th>
              <th style={ui.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => {
              const isLow = m.current_stock <= (m.low_stock_threshold || 100);
              return (
                <tr key={m.id} style={ui.tr}>
                  <td style={ui.tdName}>{m.name}</td>
                  <td style={ui.td}>{m.grammage ? `${m.grammage}g` : '--'}</td>
                  <td style={ui.td}>
                    <div style={ui.inputFlex}>
                      <input 
                        type="number" 
                        defaultValue={m.current_stock} 
                        style={ui.numberInput}
                        onBlur={(e) => handleUpdateStock(m.id, Number(e.target.value))}
                      />
                      <span style={ui.unitText}>{m.unit}</span>
                    </div>
                  </td>
                  {/* --- UPDATED: Editable Threshold Cell --- */}
                  <td style={ui.td}>
                    <input 
                      type="number" 
                      defaultValue={m.low_stock_threshold || 100} 
                      style={ui.numberInput}
                      onBlur={(e) => handleUpdateThreshold(m.id, Number(e.target.value))}
                    />
                  </td>
                  <td style={ui.td}>
                    <span style={{ 
                      ...ui.badge, 
                      background: isLow ? '#FEE2E2' : '#D1FAE5', 
                      color: isLow ? '#B91C1C' : '#065F46' 
                    }}>
                      {isLow ? 'REORDER' : 'HEALTHY'}
                    </span>
                  </td>
                  <td style={ui.td}>
                    <div style={ui.actionFlex}>
                      <button onClick={() => handleEditPrompt(m)} style={ui.editBtn}>Edit</button>
                      <button onClick={() => handleDelete(m.id, m.name)} style={ui.deleteBtn}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {materials.length === 0 && !loading && (
          <div style={ui.emptyState}>No materials found in database.</div>
        )}
      </div>
    </div>
  );
}

const ui: any = {
  pageWrapper: { padding: '40px', background: '#F8FAFC', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748B', marginTop: '4px' },
  primaryBtn: { background: '#2C5E3B', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' },
  errorBanner: { padding: '15px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', marginBottom: '20px' },
  alertContainer: { background: '#FFFBEB', border: '1px solid #FDE68A', padding: '20px', borderRadius: '12px', marginBottom: '30px' },
  alertHeader: { color: '#92400E', fontWeight: '700', marginBottom: '10px' },
  alertGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  alertCard: { background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '13px' },
  tableCard: { background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: '#F1F5F9' },
  th: { padding: '15px 20px', fontSize: '12px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '15px 20px', color: '#475569', fontSize: '14px' },
  tdName: { padding: '15px 20px', color: '#1E293B', fontWeight: '600', fontSize: '14px' },
  inputFlex: { display: 'flex', alignItems: 'center', gap: '8px' },
  numberInput: { width: '80px', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', textAlign: 'center' },
  unitText: { fontSize: '12px', color: '#94A3B8' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  emptyState: { padding: '40px', textAlign: 'center', color: '#94A3B8' },
  actionFlex: { display: 'flex', gap: '10px' },
  editBtn: { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  deleteBtn: { background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }
};