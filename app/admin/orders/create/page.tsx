"use client";

import { useEffect, useState } from "react";

export default function AdminOrderCreatePage() {
  const [consumerPhone, setConsumerPhone] = useState("");
  const [orderType, setOrderType] = useState("distributor");
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<any>(null);
  
  const [vanSearch, setVanSearch] = useState("");
  const [vanResults, setVanResults] = useState<any[]>([]);
  const [selectedVan, setSelectedVan] = useState<any>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  
  const [distanceKm, setDistanceKm] = useState(0);
  const [ratePerKm, setRatePerKm] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const [gstEnabled, setGstEnabled] = useState(false);
  const [hsnList, setHsnList] = useState<any[]>([]);
  const [selectedHsn, setSelectedHsn] = useState<any>(null);
  const [states, setStates] = useState<any[]>([]);
  const [billing, setBilling] = useState({ name: "", address: "", state: "", gstin: "" });
  const [shipping, setShipping] = useState({ name: "", address: "", state: "", gstin: "" });
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products-basic").then(r => r.json()).then(setProducts);
    fetch("/api/admin/hsn-codes").then(r => r.json()).then(d => setHsnList(d.data || []));
    fetch("/api/admin/states").then(r => r.json()).then(d => setStates(d.data || []));
  }, []);

  const totalBoxes = items.reduce((sum, i) => sum + Number(i.qty_boxes || 0), 0);
  const itemsSubtotal = items.reduce((sum, i) => sum + (Number(i.qty_boxes || 0) * Number(i.price_per_box || 0)), 0);
  const deliveryFee = deliveryType === "delivery" ? (Number(distanceKm || 0) * Number(ratePerKm || 0)) : 0;
const taxableAmount = itemsSubtotal; // Tax is only on products
  const taxValue = gstEnabled ? (taxableAmount * (Number(selectedHsn?.tax_rate || 0))) / 100 : 0;
  
  // Grand Total = (Products + Tax) + Delivery Fee
  const grandTotal = taxableAmount + taxValue + deliveryFee;
  const balanceDue = grandTotal - Number(paidAmount || 0);

  function distributorBg(d: any) {
    if (d.pending_amount > 0 && !d.credit_enabled) return "#fee2e2"; 
    if (d.pending_amount > 0) return "#fef3c7"; 
    return "#f0fdf4"; 
  }

  async function searchDistributors(q: string) {
    setSearch(q);
    if (!q) return setResults([]);
    const res = await fetch(`/api/admin/distributors/search?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    setResults(d.data || []);
  }

  async function searchVans(q: string) {
    setVanSearch(q);
    if (!q) return setVanResults([]);
    const res = await fetch(`/api/admin/vans/search?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    setVanResults(d.data || []);
  }

  function addProduct(p: any) {
    if (items.find(i => i.product_id === p.id)) return;
    setItems([...items, { product_id: p.id, name: p.name, qty_boxes: 1, price_per_box: "" }]);
  }

 async function submitOrder() {
  if (isSubmitting) return;

  // 1. STOCK CHECK (Flexible Approach / Soft Warning)
  const shortages = items.filter(orderItem => {
    const originalProd = products.find(p => p.id === orderItem.product_id);
    // Assuming products-basic API includes available_boxes
    return Number(orderItem.qty_boxes) > (originalProd?.available_boxes || 0);
  });

  if (shortages.length > 0) {
    const shortageList = shortages.map(s => `- ${s.name}`).join('\n');
    const proceed = window.confirm(
      `⚠️ INSUFFICIENT STOCK!\n\nThe following items are not in stock:\n${shortageList}\n\nCreating this order will result in NEGATIVE inventory. Do you want to proceed?`
    );
    if (!proceed) return;
  }

  // 2. MANDATORY VALIDATION
  if ((orderType === "end_consumer" || orderType === "bulk_consumer") && !consumerPhone) {
    alert("Please enter a WhatsApp number for the Consumer.");
    return;
  }

    setIsSubmitting(true);

    const payload = {
      orderType,
      deliveryType,
      distributorId: selectedDistributor?.id,
      // FIX: Ensure phone is pulled from distributor or consumer field
      customerPhone: orderType === "distributor" ? selectedDistributor?.phone : consumerPhone,
      vanId: selectedVan?.id,
      items,
      distanceKm,
      ratePerKm,
      paidAmount,
      paymentMethod,
      transactionId,
      gstEnabled,
      hsnCode: selectedHsn?.hsn_code,
      taxRate: selectedHsn?.tax_rate,
      billing,
      shipping: isSameAddress ? billing : shipping,
      total_boxes: totalBoxes
    };

    try {
      const res = await fetch("/api/admin/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`Order ${data.uorn} Created Successfully!`);
        // Force refresh by redirecting to avoid stale list on UI
        window.location.href = "/admin/orders";
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create order");
        setIsSubmitting(false);
      }
    } catch (e) {
      alert("Network error");
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Create New Sales Order</h1>

          {/* 1. ENTITY & VAN */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>1. Customer & Logistics</h3>
            <div style={styles.grid2}>
              <select style={styles.input} value={orderType} onChange={e => setOrderType(e.target.value)}>
                <option value="distributor">Distributor Sale</option>
                <option value="end_consumer">Direct Consumer</option>
                <option value="bulk_consumer">Bulk Consumer</option>
              </select>
              <select style={styles.input} value={deliveryType} onChange={e => setDeliveryType(e.target.value)}>
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
              </select>
            </div>

            {/* MANDATORY PHONE FIELD FOR NON-DISTRIBUTORS */}
            {(orderType === "end_consumer" || orderType === "bulk_consumer") && (
              <div style={{ marginTop: 15 }}>
                <input 
                  style={{...styles.input, borderColor: '#10b981'}} 
                  placeholder="WhatsApp Phone Number (Mandatory) *" 
                  value={consumerPhone}
                  onChange={(e) => setConsumerPhone(e.target.value)}
                  required
                />
              </div>
            )}

            {orderType === "distributor" && (
              <div style={{ marginTop: 15 }}>
                {!selectedDistributor ? (
                  <>
                    <input style={styles.input} placeholder="🔍 Search Distributor..." value={search} onChange={e => searchDistributors(e.target.value)} />
                    {search && results.length === 0 && (
                      <a href="/admin/distributors/create" target="_blank" style={styles.regLink}>+ Register New Distributor</a>
                    )}
                    <div style={styles.dropdown}>
                      {results.map(d => (
                        <div key={d.id} style={{ ...styles.searchItem, background: distributorBg(d) }} onClick={() => { setSelectedDistributor(d); setRatePerKm(d.delivery_rate_per_km || 0); setResults([]); setSearch(""); }}>
                          <strong>{d.name}</strong> — {d.phone}
                          <div style={styles.small}>Pending: ₹{d.pending_amount} | Unpaid Orders: {d.unpaid_order_count}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ ...styles.selectionTag, background: distributorBg(selectedDistributor) }}>
                    <div><strong>👤 {selectedDistributor.name}</strong> ({selectedDistributor.phone})</div>
                    <button style={styles.changeBtn} onClick={() => setSelectedDistributor(null)}>Change</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              {!selectedVan ? (
                <>
                  <input style={styles.input} placeholder="🚛 Search VAN/Driver..." value={vanSearch} onChange={e => searchVans(e.target.value)} />
                  <div style={styles.dropdown}>
                    {vanResults.map(v => (
                      <div key={v.id} style={styles.searchItem} onClick={() => { setSelectedVan(v); setVanResults([]); setVanSearch(""); }}>
                        {v.vehicle_number} — {v.driver_name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={styles.selectionTag}>
                  <span>🚛 {selectedVan.vehicle_number} ({selectedVan.driver_name})</span>
                  <button style={styles.changeBtn} onClick={() => setSelectedVan(null)}>Change</button>
                </div>
              )}
            </div>
          </div>

          {/* 2. DELIVERY & ADDRESS */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>2. Delivery & Address</h3>
            {deliveryType === "delivery" && (
              <div style={{ ...styles.grid2, marginBottom: 15 }}>
                <input style={styles.input} type="number" placeholder="Distance (Km)" value={distanceKm || ""} onChange={e => setDistanceKm(Number(e.target.value))} />
                <input style={styles.input} type="number" placeholder="Rate / Km" value={ratePerKm || ""} onChange={e => setRatePerKm(Number(e.target.value))} />
              </div>
            )}
            <div style={styles.grid2}>
               <div style={styles.subBox}>
                  <h4 style={styles.smallHeading}>Bill To</h4>
                  <input style={styles.inputSmall} placeholder="Name" value={billing.name} onChange={e => setBilling({...billing, name: e.target.value})} />
                  <input style={styles.inputSmall} placeholder="Address" value={billing.address} onChange={e => setBilling({...billing, address: e.target.value})} />
                  <select style={styles.inputSmall} value={billing.state} onChange={e => setBilling({...billing, state: e.target.value})}>
                    <option value="">Select State</option>
                    {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
               </div>
               <div style={styles.subBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4 style={styles.smallHeading}>Ship To</h4>
                    <label style={styles.checkboxLabel}><input type="checkbox" checked={isSameAddress} onChange={e => { setIsSameAddress(e.target.checked); if(e.target.checked) setShipping({...billing}); }} /> Same</label>
                  </div>
                  {!isSameAddress && (
                    <>
                      <input style={styles.inputSmall} placeholder="Name" value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} />
                      <input style={styles.inputSmall} placeholder="Address" value={shipping.address} onChange={e => setShipping({...shipping, address: e.target.value})} />
                      <select style={styles.inputSmall} value={shipping.state} onChange={e => setShipping({...shipping, state: e.target.value})}>
                        <option value="">Select State</option>
                        {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </>
                  )}
               </div>
            </div>
          </div>

          {/* 3. ITEMS & PAYMENT */}
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
              <h3 style={styles.sectionTitle}>3. Products & Payment</h3>
              <label style={styles.checkboxLabel}><input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} /> GST</label>
            </div>
            {gstEnabled && (
              <div style={{ ...styles.grid2, marginBottom: 15 }}>
                <input style={styles.input} placeholder="GSTIN" value={billing.gstin} onChange={e => setBilling({...billing, gstin: e.target.value})} />
                <select style={styles.input} value={selectedHsn?.id || ""} onChange={e => setSelectedHsn(hsnList.find(h => h.id === e.target.value))}>
                  <option value="">Select HSN</option>
                  {hsnList.map(h => <option key={h.id} value={h.id}>{h.hsn_code} ({h.tax_rate}%)</option>)}
                </select>
              </div>
            )}
            <div style={styles.productStrip}>
              {products.map(p => <button key={p.id} type="button" style={styles.productBadge} onClick={() => addProduct(p)}>+ {p.name}</button>)}
            </div>
            {items.map(i => (
              <div key={i.product_id} style={styles.itemRow}>
                <span>{i.name}</span>
                <input style={styles.qtyInput} type="number" value={i.qty_boxes} onChange={e => setItems(items.map(it => it.product_id === i.product_id ? {...it, qty_boxes: e.target.value} : it))} />
                <input style={styles.qtyInput} placeholder="Rate" value={i.price_per_box} onChange={e => setItems(items.map(it => it.product_id === i.product_id ? {...it, price_per_box: e.target.value} : it))} />
                <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setItems(items.filter(x => x.product_id !== i.product_id))}>✕</button>
              </div>
            ))}

            <div style={{ ...styles.grid2, marginTop: 20 }}>
               <input style={styles.input} type="number" placeholder="Paid Amount" value={paidAmount || ""} onChange={e => setPaidAmount(Number(e.target.value))} />
               <select style={styles.input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="">Payment Mode</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
               </select>
            </div>
            <input style={{ ...styles.input, marginTop: 10 }} placeholder="Transaction ID (Optional)" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
          </div>

          {/* SUMMARY BOX */}
          <div style={{ ...styles.summaryBox, flexDirection: 'column', gap: '8px' }}>
            <div style={styles.summaryRow}>
              <span>Product Subtotal:</span>
              <span>₹{itemsSubtotal.toFixed(2)}</span>
            </div>
            {deliveryType === "delivery" && (
              <div style={styles.summaryRow}>
                <span>Delivery Fee ({distanceKm}km):</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {gstEnabled && (
              <div style={styles.summaryRow}>
                <span>GST ({selectedHsn?.tax_rate || 0}%):</span>
                <span>₹{taxValue.toFixed(2)}</span>
              </div>
            )}
            <div style={{ ...styles.summaryRow, borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: 10, paddingTop: 10, fontSize: '18px' }}>
              <strong>Grand Total:</strong>
              <strong>₹{grandTotal.toFixed(2)}</strong>
            </div>
          </div>
          
          <button style={styles.mainSubmit} onClick={() => setIsReviewOpen(true)}>Review & Place Order</button>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {isReviewOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: 20, borderBottom: '2px solid #eee', paddingBottom: 10 }}>Final Review</h2>
            
            <div style={styles.subBox}>
              <p><strong>Customer:</strong> {selectedDistributor?.name || "End Consumer"}</p>
              <p><strong>Phone:</strong> {orderType === "distributor" ? selectedDistributor?.phone : consumerPhone}</p>
            </div>

            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.td}>Total boxes</td>
                  <td style={styles.td}>{totalBoxes}</td>
                </tr>
                <tr style={{ fontWeight: 'bold', background: '#f0fdf4' }}>
                  <td style={styles.td}>Grand Total</td>
                  <td style={styles.td}>₹{grandTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={styles.td}>Paid</td>
                  <td style={{ ...styles.td, color: '#2563eb' }}>₹{Number(paidAmount).toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: 'bold', color: balanceDue > 0 ? '#dc2626' : '#059669' }}>
                  <td style={styles.td}>Balance</td>
                  <td style={styles.td}>₹{balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
              <button style={{ ...styles.mainSubmit, background: '#64748b' }} onClick={() => setIsReviewOpen(false)} disabled={isSubmitting}>Edit</button>
              <button 
                style={{ ...styles.mainSubmit, opacity: isSubmitting ? 0.6 : 1 }} 
                onClick={submitOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES OBJECT (Kept identical as provided)
const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", padding: "40px 20px", position: "relative" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.85)" },
  container: { position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto" },
  card: { background: "#fff", borderRadius: "20px", padding: "35px", boxShadow: "0 20px 25px rgba(0,0,0,0.3)" },
  heading: { textAlign: 'center', marginBottom: 25, fontSize: '22px', fontWeight: '800' },
  section: { marginBottom: 25, borderBottom: '1px solid #eee', paddingBottom: 20 },
  sectionTitle: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 15 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  inputSmall: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: 8, fontSize: '13px' },
  subBox: { background: '#f8fafc', padding: 15, borderRadius: 12, border: '1px solid #eee' },
  smallHeading: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 },
  selectionTag: { padding: '12px 15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ddd' },
  changeBtn: { fontSize: '11px', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, background: '#fff', border: '1px solid #ddd' },
  productStrip: { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '15px 0' },
  productBadge: { padding: '6px 12px', borderRadius: '15px', background: '#f1f5f9', border: '1px solid #ddd', fontSize: '11px', cursor: 'pointer' },
  itemRow: { display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 40px', gap: 10, alignItems: 'center', padding: 10, background: '#f8fafc', borderRadius: 10, marginBottom: 8 },
  qtyInput: { padding: 8, borderRadius: 6, border: '1px solid #ddd', textAlign: 'center', width: '100%' },
  summaryBox: { background: '#1e293b', color: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, display: 'flex', justifyContent: 'space-between' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', width: '100%' },
  mainSubmit: { width: '100%', padding: 16, borderRadius: 12, background: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { background: '#fff', width: '90%', maxWidth: '500px', borderRadius: 24, padding: 35 },
  dropdown: { background: '#fff', border: '1px solid #ddd', borderRadius: 8, marginTop: 5, overflow: 'hidden' },
  searchItem: { padding: 12, borderBottom: '1px solid #eee', cursor: 'pointer' },
  regLink: { display: 'block', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', marginTop: 5 },
  small: { fontSize: '11px', color: '#64748b' },
  th: { textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' },
  td: { padding: '10px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' },
  table: { width: '100%', borderCollapse: 'collapse' },
  checkboxLabel: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', cursor: 'pointer' }
};