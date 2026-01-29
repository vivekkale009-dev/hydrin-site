"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

export default function OrderViewPage() {
  const params = useParams();
  const id = params?.id;

  const [order, setOrder] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [vans, setVans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false); 
  
  const [editPaid, setEditPaid] = useState(0);
  const [editMethod, setEditMethod] = useState("cash");
  const [editRef, setEditRef] = useState(""); 
  const [editVan, setEditVan] = useState("");
// Add this calculation block before the return statement
  const productSubtotal = order?.gross_revenue || 0;
  const taxAmount = (order?.total_payable_amount || 0) - (order?.delivery_fee || 0) - productSubtotal;
  
  const refreshData = useCallback(async () => {
    if (!id) return;
    try {
      const timestamp = Date.now();
      const [oRes, pRes, vRes] = await Promise.all([
        fetch(`/api/admin/orders/${id}?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/orders/${id}/payments?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/vans?t=${timestamp}`, { cache: 'no-store' })
      ]);
      const oJson = await oRes.json();
      const pJson = await pRes.json();
      const vJson = await vRes.json();

      const orderData = oJson.data || oJson;
      setOrder(orderData);
      setPayments(Array.isArray(pJson) ? pJson : (pJson.data || []));
      setVans(vJson.data || []);
      if (orderData?.van_id) setEditVan(orderData.van_id);
    } catch (err) { console.error("Refresh error", err); }
  }, [id]);

  useEffect(() => {
    refreshData().then(() => setLoading(false));
  }, [refreshData]);

  // FIXED: Unified WhatsApp function with the correct finalUrl logic
  const triggerWhatsApp = (msgType: "invoice" | "details", invoiceUrl: string | null = null) => {
    const phoneNumber = order?.shipping_phone || order?.phone || order?.distributor_phone;
    if (!phoneNumber) return alert("Phone number not found.");

    // Determine the URL to use
    let finalUrl = invoiceUrl;
    if (!finalUrl && order?.invoice_generated && order?.invoice_url) {
      const bucket = order.is_gst ? 'tax-invoices' : 'non-tax-invoices';
      finalUrl = `https://xyyirkwiredufamtnqdu.supabase.co/storage/v1/object/public/${bucket}/${order.invoice_url}`;
    }

    const financialSummary = `*Order Summary: ${order?.uorn}*\nTotal Bill: ₹${order?.total_payable_amount}\nTotal Paid: ₹${order?.amount_paid || 0}\nPending Balance: ₹${order?.pending_amount || 0}\n--------------------------`;

    let productList = "";
    if (order?.items && order.items.length > 0) {
      productList = `\n*Products Ordered:* \n` + order.items
        .map((item: any) => `📦 ${item.product_name}: ${item.qty_boxes} Nos`)
        .join('\n');
    } else {
      productList = "\n_No product details found_";
    }

    // CHECKING finalUrl instead of invoiceUrl
    const invoiceLink = finalUrl ? `\n\n📄 *Download Invoice:* \n${finalUrl}` : "";

    const finalMsg = msgType === "invoice" 
      ? `Hello ${order?.customer_name || 'Customer'}, your invoice for order *${order?.uorn}* is ready.\n${financialSummary}${invoiceLink}\n\nThank you for choosing Earthy Source!`
      : `Hello ${order?.customer_name || 'Customer'}, here are your order details:\n${financialSummary}${productList}\n\nThank you for choosing Earthy Source!`;

    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
  };

  const handleGenerateInvoice = async () => {
    if (!id || !order) return;
    
    if (order.invoice_generated) {
      const bucket = order.is_gst ? 'tax-invoices' : 'non-tax-invoices';
      const url = `https://xyyirkwiredufamtnqdu.supabase.co/storage/v1/object/public/${bucket}/${order.invoice_url}`;
      window.open(url, '_blank');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/orders/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        triggerWhatsApp("invoice", result.url);
        await refreshData(); 
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Connection failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid: editPaid, paymentMethod: editMethod, transactionRef: editRef, vanId: editVan })
      });
      if (res.ok) {
        setEditPaid(0); setEditRef("");
        await refreshData();
        alert("Order Updated!");
      }
    } finally { setSaving(false); }
  };

  if (loading) return <div style={styles.loading}>Loading Order...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={() => window.history.back()} style={styles.backBtn}>← Back</button>
            <h2 style={{ color: '#fff', margin: 0 }}>Order: {order?.uorn}</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleGenerateInvoice} 
              disabled={generating} 
              style={{
                ...styles.invoiceBtn, 
                opacity: generating ? 0.7 : 1,
                background: order?.invoice_generated ? '#2F4F4F' : '#007bff'
              }}
            >
              {generating ? "⏳ Processing..." : order?.invoice_generated ? "👁️ View Invoice" : "📄 Generate Invoice"}
            </button>
            <button onClick={refreshData} style={styles.refreshBtn}>🔄 Refresh</button>
          </div>
        </div>

        <div style={styles.mainGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>Financial Summary</h4>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}><label>Total Bill</label><p>₹{order?.total_payable_amount}</p></div>
                <div style={{ ...styles.summaryItem, color: '#28a745' }}><label>Total Paid</label><p>₹{order?.amount_paid || 0}</p></div>
                <div style={{ ...styles.summaryItem, color: '#dc3545' }}><label>Pending</label><p>₹{order?.pending_amount || 0}</p></div>
               
				{/* Row 2 - New Highlighted Areas */}
  <div style={styles.summaryItem}>
    <label>Product Subtotal</label>
    <p>₹{productSubtotal.toFixed(2)}</p>
  </div>
  <div style={styles.summaryItem}>
    <label>Tax Amount</label>
    <p>₹{Math.max(0, taxAmount).toFixed(2)}</p>
  </div>
  <div style={{ ...styles.summaryItem, color: '#dc3545' }}>
    <label>Delivery Fees</label>
    <p>₹{order?.delivery_fee || 0}</p>
  </div>
              </div>

              <div style={{ marginTop: '25px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Transaction History</p>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Mode</th>
                        <th style={{...styles.th, textAlign:'right'}}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={styles.td}>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td style={styles.td}>{p.payment_method?.toUpperCase()}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>₹{p.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>Products Ordered</h4>
              {order?.items && order.items.length > 0 ? (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product Name</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Box Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={styles.td}>{item.product_name}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{item.qty_boxes} Nos</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>No items found for this order.</p>
              )}
            </div>

            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>Communication</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={styles.waBtn} onClick={() => triggerWhatsApp("invoice")}>💬 Send Invoice WA</button>
                <button style={styles.waBtnUpdate} onClick={() => triggerWhatsApp("details")}>📩 Send Order Details</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>Update Order</h4>
              <label style={styles.label}>New Payment Received</label>
              <input type="number" style={styles.input} value={editPaid} onChange={e => setEditPaid(Number(e.target.value))} />
              <label style={styles.label}>Payment Method</label>
              <select style={styles.input} value={editMethod} onChange={e => setEditMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
              </select>
              {(editMethod === 'upi' || editMethod === 'bank') && (
                <><label style={styles.label}>Transaction Ref (Optional)</label><input type="text" style={styles.input} value={editRef} onChange={e => setEditRef(e.target.value)} placeholder="Ref No / UTR" /></>
              )}
              <label style={styles.label}>Assign Van</label>
              <select style={styles.input} value={editVan} onChange={e => setEditVan(e.target.value)}>
                <option value="">Select Van</option>
                {vans.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
              </select>
              <button onClick={handleUpdate} disabled={saving} style={styles.updateBtn}>{saving ? "Processing..." : "Confirm & Save"}</button>
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
  container: { position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto" },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '25px' },
  card: { background: "#fff", borderRadius: "12px", padding: "25px" },
  sectionTitle: { color: "#2F4F4F", margin: "0 0 15px 0", borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', textAlign: 'center' },
  summaryItem: { background: '#f8f9fa', padding: '10px', borderRadius: '8px' },
  label: { fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px' },
  updateBtn: { width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  waBtn: { flex: 1, background: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  waBtnUpdate: { flex: 1, background: '#075E54', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  invoiceBtn: { background: '#007bff', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  refreshBtn: { background: "#fff", border: "none", padding: "10px 15px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  backBtn: { background: "#444", color: "#fff", border: "none", padding: "10px 15px", borderRadius: "8px", cursor: "pointer" },
  tableWrapper: { border: '1px solid #eee', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f8f9fa', padding: '12px', textAlign: 'left' },
  td: { padding: '12px' },
  loading: { color: '#fff', textAlign: 'center', paddingTop: '150px' }
};