"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

export default function FeeEditorPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]); // New state for history

  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [reason, setReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [orderRes, historyRes] = await Promise.all([
        fetch(`/api/admin/orders/${id}?t=${timestamp}`),
        fetch(`/api/admin/orders/${id}/history?t=${timestamp}`)
      ]);

      const oJson = await orderRes.json();
      const hJson = await historyRes.json();
      
      const o = oJson.data || oJson;
      setOrder(o);
      setHistory(Array.isArray(hJson) ? hJson : (hJson.data || []));
      
      const currentTax = (o.total_payable_amount || 0) - (o.gross_revenue || 0);
      
      setSubtotal(o.gross_revenue || 0);
      setDelivery(o.delivery_fee || 0);
      setTax(currentTax > 0 ? currentTax : 0);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) fetchData(); }, [id, fetchData]);

  const totalPayable = Number(subtotal) + Number(tax);

  const handleUpdateFees = async () => {
    if (!reason) return alert("Please provide a reason for the history trail.");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/update-fees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossRevenue: subtotal,
          taxAmount: tax,
          deliveryFee: delivery,
          totalPayable: totalPayable,
          reason: reason
        })
      });
      if (res.ok) {
        alert("Fees updated successfully!");
        fetchData(); // Refresh history and data
        setReason(""); // Clear reason
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading Financials...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <button onClick={() => router.back()} style={styles.backBtn}>← Back</button>
          <h2 style={{ color: '#fff' }}>Financial Overrides</h2>
        </div>

        <div style={styles.card}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Product Subtotal</label>
            <input type="number" style={styles.input} value={subtotal} onChange={e => setSubtotal(Number(e.target.value))} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Tax Amount</label>
            <input type="number" style={styles.input} value={tax} onChange={e => setTax(Number(e.target.value))} />
          </div>

          <div style={{...styles.totalRow, borderBottom: '1px solid #eee', paddingBottom: '15px'}}>
            <span>Bill Total (GST Applicable):</span>
            <span style={{ fontSize: '24px', color: '#28a745' }}>₹{totalPayable.toFixed(2)}</span>
          </div>

          <div style={{...styles.inputGroup, marginTop: '20px'}}>
            <label style={{...styles.label, color: '#dc3545'}}>Delivery Fees (Excluded from Bill Total)</label>
            <input type="number" style={{...styles.input, borderColor: '#ffcccc'}} value={delivery} onChange={e => setDelivery(Number(e.target.value))} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Reason for Change</label>
            <textarea style={{...styles.input, height: '60px'}} value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <button onClick={handleUpdateFees} disabled={saving} style={styles.updateBtn}>
            {saving ? "Processing..." : "Save Financials"}
          </button>

          {/* --- HISTORY TRAIL SECTION --- */}
          <div style={styles.historySection}>
            <h4 style={styles.historyTitle}>📜 Previous Adjustments</h4>
            <div style={styles.historyList}>
              {history.length > 0 ? history.map((log, i) => (
                <div key={i} style={styles.historyItem}>
                  <div style={styles.historyMeta}>
                    <span style={styles.historyDate}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p style={styles.historyText}>{log.details}</p>
                </div>
              )) : (
                <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>No previous adjustments found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", padding: "40px 20px", position: "relative" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)" },
  container: { position: "relative", zIndex: 1, maxWidth: "450px", margin: "0 auto" },
  headerRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  card: { background: "#fff", borderRadius: "12px", padding: "25px", display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' },
  updateBtn: { width: '100%', padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' },
  backBtn: { background: "#444", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" },
  loading: { color: '#fff', textAlign: 'center', paddingTop: '100px' },
  
  // History Styles
  historySection: { borderTop: '2px dashed #eee', paddingTop: '15px' },
  historyTitle: { fontSize: '14px', color: '#666', marginBottom: '10px' },
  historyList: { maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  historyItem: { background: '#f9f9f9', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #6c757d' },
  historyMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  historyDate: { fontSize: '10px', color: '#999' },
  historyText: { fontSize: '12px', color: '#444', margin: 0, lineHeight: '1.4' }
};