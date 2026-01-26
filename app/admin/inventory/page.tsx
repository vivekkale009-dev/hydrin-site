"use client";
import { useEffect, useState, useMemo } from "react";

const LOW_STOCK_THRESHOLD = 500; // Change this value to adjust the alert

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
  const [movementStats, setMovementStats] = useState({ produced: 0, sold: 0 });

  async function fetchInventory(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/admin/inventory?v=${Date.now()}`);
      const json = await res.json();
      if (json.data) setItems(json.data);

      const params = new URLSearchParams();
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);
      const movRes = await fetch(`/api/admin/inventory/movements?${params.toString()}`);
      const movJson = await movRes.json();
      
      if (movJson.data) {
        setMovements(movJson.data);
        const stats = movJson.data.reduce((acc: any, m: any) => {
          if (m.movement_type === 'release') acc.produced += Number(m.qty_boxes || 0);
          if (m.movement_type === 'deduct') acc.sold += Number(m.qty_boxes || 0);
          return acc;
        }, { produced: 0, sold: 0 });
        setMovementStats(stats);
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchInventory(); }, [startDate, endDate]);

  const totalStockSummary = useMemo(() => {
    return items.reduce((acc, item) => {
      acc.totalAvailable += Number(item.available_boxes || 0);
      return acc;
    }, { totalAvailable: 0 });
  }, [items]);

  // NEW: SKU Wise Detailed Summary Calculation
  const skuSummary = useMemo(() => {
    return items.map(item => {
      const skuMovements = movements.filter(m => m.product_id === item.product_id);
      const boxesSold = skuMovements
        .filter(m => m.movement_type === 'deduct')
        .reduce((sum, m) => sum + Number(m.qty_boxes || 0), 0);

      return {
        name: item.product_name,
        availableBoxes: item.available_boxes,
        availableBottles: item.available_boxes * item.units_per_box,
        soldBoxes: boxesSold,
        soldBottles: boxesSold * item.units_per_box
      };
    });
  }, [items, movements]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.product_name?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [items, productSearch]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const prod = items.find(i => i.product_id === m.product_id);
      const productName = prod?.product_name || "";
      const matchesProduct = productName.toLowerCase().includes(productSearch.toLowerCase());
      const matchesType = typeFilter === "" || m.movement_type === typeFilter;
      const matchesRef = (m.order_number || m.notes || "").toLowerCase().includes(refSearch.toLowerCase());
      return matchesProduct && matchesType && matchesRef;
    });
  }, [movements, productSearch, typeFilter, refSearch, items]);

  const submitProduction = async (productId: string) => {
    const qty = parseInt(inputValues[productId]);
    if (!qty || qty <= 0) return alert("Enter a valid number");
    try {
      const res = await fetch("/api/admin/inventory/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qtyAdded: qty }),
      });
      if (!res.ok) throw new Error("Failed to update");
      alert("Production Logged Successfully");
      setInputValues(prev => ({ ...prev, [productId]: "" }));
      await fetchInventory(true); 
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  if (loading) return <div style={styles.loading}>Loading Dashboard...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        
        <h1 style={{ color: "#fff", marginBottom: "20px" }}>📦 Inventory Dashboard</h1>

     {/* TOP SUMMARY CARDS */}
<div style={styles.summaryRow}>
  <div style={styles.summaryCard}>
    <span style={styles.sumLabel}>Period Production</span>
    <span style={{...styles.sumVal, color: '#2ecc71'}}>+ {movementStats.produced} Boxes</span>
    <span style={{fontSize: '11px', color: '#64748b'}}>Total boxes added to stock</span>
  </div>

  <div style={styles.summaryCard}>
    <span style={styles.sumLabel}>Period Sold (Exited)</span>
    <span style={{...styles.sumVal, color: '#e74c3c'}}>- {movementStats.sold} Boxes</span>
    <span style={{fontSize: '11px', color: '#64748b'}}>Total boxes confirmed out</span>
  </div>

  <div style={styles.summaryCard}>
    <span style={styles.sumLabel}>Period Net Change</span>
    <span style={{
      ...styles.sumVal, 
      color: (movementStats.produced - movementStats.sold) >= 0 ? '#2ecc71' : '#e74c3c'
    }}>
      {(movementStats.produced - movementStats.sold) >= 0 ? '📈 +' : '📉 '}
      {movementStats.produced - movementStats.sold} Boxes
    </span>
    <span style={{fontSize: '11px', color: '#64748b'}}>Inflow vs Outflow balance</span>
  </div>

  <div style={{...styles.summaryCard, background: '#1e293b', color: '#fff'}}>
    <span style={{...styles.sumLabel, color: '#94a3b8'}}>Live Available Stock</span>
    <span style={{...styles.sumVal, color: '#38bdf8'}}>{totalStockSummary.totalAvailable} Boxes</span>
    <span style={{fontSize: '11px', color: '#94a3b8'}}>Current warehouse total</span>
  </div>
</div>

        {/* NEW: SKU WISE DETAIL DASHBOARD */}
        <div style={{...styles.logContainer, marginBottom: '30px', border: '2px solid #2563eb'}}>
          <div style={{padding: '15px', background: '#2563eb', color: '#fff', fontWeight: 'bold'}}>SKU Level Summary (Live)</div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Product SKU</th>
                <th style={styles.th}>Sold (Boxes)</th>
                <th style={styles.th}>Sold (Bottles)</th>
                <th style={styles.th}>Stock (Boxes)</th>
                <th style={styles.th}>Stock (Bottles)</th>
              </tr>
            </thead>
            <tbody>
              {skuSummary.map((sku, idx) => (
                <tr key={idx} style={styles.tr}>
                  <td style={{...styles.td, fontWeight: 'bold'}}>{sku.name}</td>
                  <td style={{...styles.td, color: '#dc3545'}}>{sku.soldBoxes}</td>
                  <td style={{...styles.td, color: '#dc3545'}}>{sku.soldBottles}</td>
                  <td style={{...styles.td, color: '#28a745', fontWeight: 'bold'}}>{sku.availableBoxes}</td>
                  <td style={{...styles.td, color: '#28a745', fontWeight: 'bold'}}>{sku.availableBottles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.filterBar}>
          <input 
            style={{...styles.filterInput, flex: 2}} 
            placeholder="🔍 Search Product SKU..." 
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <input type="date" style={styles.filterInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" style={styles.filterInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={() => {setStartDate(""); setEndDate("");}} style={styles.resetBtn}>Reset Dates</button>
        </div>

{/* PRODUCT CARDS WITH ALERT LOGIC */}
<div style={styles.grid}>
  {filteredItems.map((item) => {
    const isNegative = item.available_boxes < 0;
    const isLowStock = item.available_boxes < LOW_STOCK_THRESHOLD;

    return (
      <div 
        key={item.product_id} 
        style={{
          ...styles.card, 
          // RED for negative, ORANGE for low, WHITE for normal
          backgroundColor: isNegative ? '#fef2f2' : (isLowStock ? '#fff7ed' : '#fff'),
          border: isNegative ? '2px dashed #dc2626' : (isLowStock ? '2px solid #f97316' : 'none'),
        }}
      >
        <div>
          <h3 style={{...styles.prodName, color: isNegative ? '#dc2626' : '#1e293b'}}>
            {item.product_name} 
            {isNegative ? (
              <span style={{color: '#dc2626', fontSize: '12px', marginLeft: '10px', fontWeight: 'bold'}}>🚨 STOCK DEFICIT</span>
            ) : isLowStock && (
              <span style={{color: '#f97316', fontSize: '12px', marginLeft: '10px'}}>⚠️ LOW STOCK</span>
            )}
          </h3>
          <div style={{display: 'flex', gap: '10px'}}>
              <span style={{...styles.badge, color: isNegative ? '#dc2626' : '#475569'}}>
                Boxes: <strong>{item.available_boxes}</strong>
              </span>
              <span style={{...styles.badge, color: '#6366f1'}}>
                Bottles: <strong>{item.available_boxes * item.units_per_box}</strong>
              </span>
              <span style={{...styles.badge, color: '#f59e0b', fontWeight: 'bold'}}>
                Reserved: {item.reserved_boxes}
              </span>
          </div>
        </div>
        <div style={styles.actionGroup}>
          <input 
            type="number" 
            style={styles.prodInput} 
            value={inputValues[item.product_id] || ""}
            placeholder="Qty"
            onChange={(e) => setInputValues({...inputValues, [item.product_id]: e.target.value})}
          />
          <button onClick={() => submitProduction(item.product_id)} style={styles.addBtn}>+ Production</button>
        </div>
      </div>
    );
  })}
</div>

        {/* ACTIVITY LOG TABLE */}
        <div style={{marginTop: '40px'}}>
          <h2 style={{color: '#fff', marginBottom: '15px'}}>📜 Inventory Activity Log</h2>
          <div style={{...styles.filterBar, marginBottom: '10px'}}>
             <select 
               style={{...styles.filterInput, flex: 1}} 
               value={typeFilter} 
               onChange={(e) => setTypeFilter(e.target.value)}
             >
                <option value="">All Movement Types</option>
                <option value="release">RELEASE (Production)</option>
                <option value="reserve">RESERVE (Order Created)</option>
                <option value="deduct">DEDUCT (Vehicle Exited)</option>
             </select>
             <input 
               style={{...styles.filterInput, flex: 2}} 
               placeholder="🔍 Search Order Reference or Notes..." 
               value={refSearch}
               onChange={(e) => setRefSearch(e.target.value)}
             />
          </div>

          <div style={styles.logContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Qty (Boxes)</th>
                  <th style={styles.th}>Qty (Bottles)</th>
                  <th style={styles.th}>Order Reference / Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length > 0 ? filteredMovements.map((m) => {
                  const product = items.find(i => i.product_id === m.product_id);
                  const bottleQty = Number(m.qty_boxes || 0) * (product?.units_per_box || 0);
                  return (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(m.created_at).toLocaleString()}</td>
                      <td style={styles.td}>{product?.product_name || '...'}</td>
                      <td style={styles.td}>
                          <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                              background: 
                                  m.movement_type === 'release' ? '#dcfce7' : 
                                  m.movement_type === 'reserve' ? '#fef3c7' : '#fee2e2',
                              color: 
                                  m.movement_type === 'release' ? '#166534' : 
                                  m.movement_type === 'reserve' ? '#92400e' : '#991b1b'
                          }}>
                              {m.movement_type.toUpperCase()}
                          </span>
                      </td>
                      <td style={styles.td}>{m.qty_boxes}</td>
                      <td style={{...styles.td, color: '#6366f1'}}>{bottleQty}</td>
                      <td style={{...styles.td, color: '#2563eb', fontWeight: 'bold'}}>
                          {m.order_number || m.notes || "—"}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} style={{textAlign: 'center', padding: '30px', color: '#666'}}>No matching movements found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep your existing styles object exactly as is, it will work with the new elements.
const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", position: "relative", padding: "40px 20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.9)" },
  container: { position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto" },
  summaryRow: { 
  display: 'grid', 
  gridTemplateColumns: 'repeat(4, 1fr)', // Changed from 3 to 4
  gap: '15px', 
  marginBottom: '20px' 
},
  summaryCard: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  sumLabel: { fontSize: '12px', color: '#64748b', fontWeight: 'bold' },
  sumVal: { fontSize: '24px', fontWeight: 'bold', display: 'block', marginTop: '5px' },
  filterBar: { display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' },
  filterInput: { padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px' },
  resetBtn: { padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#334155', color: '#fff' },
  grid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { background: '#fff', borderRadius: '15px', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s ease' },
  prodName: { margin: 0, fontSize: '18px', color: '#1e293b' },
  badge: { fontSize: '13px', color: '#475569' },
  actionGroup: { display: 'flex', gap: '10px' },
  prodInput: { width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' },
  addBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  logContainer: { background: '#fff', borderRadius: '15px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  th: { padding: '15px', textAlign: 'left', fontSize: '12px', color: '#64748b' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '15px', fontSize: '14px' },
  loading: { color: '#fff', textAlign: 'center', marginTop: '100px' }
};