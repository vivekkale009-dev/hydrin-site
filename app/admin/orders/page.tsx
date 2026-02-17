"use client";

import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [vans, setVans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all"); // Added Payment Method Filter
  const [dateFilter, setDateFilter] = useState("");
  const [vanFilter, setVanFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
    fetchVans();
  }, []);

  useEffect(() => {
    let filtered = orders;

    // 1. Fixed Search Logic: Search by UORN, Distributor Name, or Mobile Number
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((o) => 
        o.uorn?.toLowerCase().includes(q) || 
        o.distributor_name?.toLowerCase().includes(q) ||
        o.distributor_phone?.includes(q) || // Search by Mobile
        o.order_number?.toLowerCase().includes(q)
      );
    }

    // 2. Status Filter (Now includes all possibilities)
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // 3. Payment Method Filter
    if (methodFilter !== "all") {
      filtered = filtered.filter((o) => o.payment_method === methodFilter);
    }

    if (vanFilter !== "all") filtered = filtered.filter((o) => o.van_id === vanFilter);
    if (dateFilter) filtered = filtered.filter((o) => o.created_at.startsWith(dateFilter));

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, methodFilter, dateFilter, vanFilter, orders]);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch(`/api/admin/orders?t=${Date.now()}`); 
    const json = await res.json();
    if (json.data) {
      setOrders(json.data);
      setFilteredOrders(json.data);
    }
    setLoading(false);
  }

  async function fetchVans() {
    const res = await fetch("/api/admin/vans");
    const json = await res.json();
    if (json.data) setVans(json.data);
  }

  const handleRowClick = (id: string) => { window.location.href = `/admin/orders/view/${id}`; };

 

  const handleGatePass = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    if (order.exit_confirmed_at) {
      alert(`⛔ SECURITY LOCKDOWN\nVehicle already exited at ${new Date(order.exit_confirmed_at).toLocaleString()}`);
      return;
    }
    window.open(`/api/admin/orders/${order.id}/gate-pass?t=${Date.now()}`, "_blank");
    setTimeout(() => { fetchOrders(); }, 2500);
  };

  const sendWhatsappQR = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    if (order.exit_confirmed_at) {
      alert(`⛔ CANNOT SEND\n\nVehicle already exited.`);
      return;
    }
    if (!whatsappNumber || whatsappNumber.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const qrDisplayUrl = `${window.location.origin}/qr/${order.id}`;
    const message = `*EARTHY SOURCE - DIGITAL PASS*%0A%0A*Order:* ${order.uorn}%0A*Status:* Ready%0A%0A${qrDisplayUrl}`;
    window.open(`https://wa.me/91${whatsappNumber}?text=${message}`, "_blank");
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <h1 style={{ color: "#fff", margin: 0 }}>Order Management</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
             <input 
               style={{ ...styles.input, width: '180px', height: '40px' }} 
               placeholder="WhatsApp Number..." 
               value={whatsappNumber}
               onChange={(e) => setWhatsappNumber(e.target.value)}
             />
             <button onClick={() => (window.location.href = "/admin/orders/create")} style={styles.createBtn}>
               + New Order
             </button>
          </div>
        </div>

        {/* Updated Filter Grid with Payment Method and All Statuses */}
        <div style={styles.filterGrid}>
          <input style={styles.input} placeholder="Search UORN, Name, Mobile..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          
          <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
             <option value="all">All Statuses</option>
             <option value="pending_verification">Pending Verification</option>
             <option value="fully_paid">Paid</option>
             <option value="partially_paid">Partially Paid</option>
			 <option value="refunded">Refunded</option>
			 <option value="cancelled">cancelled</option>
			 <option value="delivered">Delivered</option>
          </select>

          <select style={styles.input} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
             <option value="all">All Payments</option>
             <option value="cash">Cash</option>
             <option value="upi">UPI</option>
             <option value="bank">Bank Transfer</option>
             <option value="credit">Credit</option>
          </select>

          <input type="date" style={styles.input} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Order Details</th>
                <th style={styles.th}>Distributor</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Payable</th>
                <th style={styles.th}>GST Required</th> {/* Changed from GP Tracking */}
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} style={styles.tr} onClick={() => handleRowClick(order.id)}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: "bold", color: "#007bff" }}>{order.uorn}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{order.order_number}</div>
                  </td>
                  <td style={styles.td}>
                    <div>{order.distributor_name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{order.distributor_phone}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(order.status)}>{order.status?.replace('_', ' ')}</span>
                  </td>
                  <td style={styles.td}>₹{order.total_payable_amount}</td>
                  
                  {/* New GST Required Column */}
                  <td style={styles.td}>
                    <span style={{ 
                      color: order.is_gst ? '#28a745' : '#dc3545', 
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}>
                      {order.is_gst ? "✅ YES" : "❌ NO"}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={{display: 'flex', gap: '5px'}}>
                     
                        <button 
                          onClick={(e) => handleGatePass(e, order)} 
                          disabled={!!order.exit_confirmed_at || order.status === 'cancelled' || order.status === 'delivered'}
                          style={{
                            ...styles.gatePassBtn, 
                            background: (order.exit_confirmed_at || order.status === 'cancelled' || order.status === 'delivered') ? '#ccc' : '#f39c12',
                            cursor: (order.exit_confirmed_at || order.status === 'cancelled' || order.status === 'delivered') ? 'not-allowed' : 'pointer'
                          }} 
                          title="Print GP"
                        >🚧</button>
                        <button 
                          onClick={(e) => sendWhatsappQR(e, order)} 
                          disabled={!!order.exit_confirmed_at}
                          style={{
                            ...styles.gatePassBtn, 
                            background: (order.exit_confirmed_at || order.status === 'cancelled' || order.status === 'delivered') ? '#ccc' : '#25D366',
                            cursor: (order.exit_confirmed_at || order.status === 'cancelled' || order.status === 'delivered') ? 'not-allowed' : 'pointer'
                          }} 
                          title="WhatsApp QR"
                        >📱</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", padding: "40px 20px", position: "relative", fontFamily: "sans-serif" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 0 },
  container: { position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: 'center' },
  createBtn: { padding: "10px 15px", background: "#28a745", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  filterGrid: { display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "10px", marginBottom: "20px" },
  input: { padding: "12px", borderRadius: "8px", border: "none", width: "100%" },
  tableCard: { background: "#fff", borderRadius: "12px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#eee", textAlign: "left" },
  th: { padding: "12px", fontSize: "13px" },
  tr: { borderBottom: "1px solid #eee", cursor: "pointer", transition: "background 0.2s" },
  td: { padding: "12px", fontSize: "14px" },

  gatePassBtn: { padding: "8px", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 'bold' },
};

function getStatusBadge(status: string) {
  let bg = "#eee";
  let color = "#333";
  
  if (status === "payment_verified" || status === "fully_paid") { bg = "#d4edda"; color = "#155724"; }
  if (status === "cancelled") { bg = "#f8d7da"; color = "#721c24"; }
  if (status === "refunded") { bg = "#fff3cd"; color = "#856404"; } // Yellow for Refund
  if (status === "partially_paid") { bg = "#cce5ff"; color = "#004085"; }
  
  return { 
    padding: "4px 8px", 
    borderRadius: "12px", 
    fontSize: "10px", 
    fontWeight: "bold" as "bold", 
    background: bg, 
    color: color, 
    textTransform: 'uppercase' as 'uppercase' 
  };
}