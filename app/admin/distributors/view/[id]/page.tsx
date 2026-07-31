"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DistributorViewPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const loadDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/distributors/${id}/details`);
      const json = await res.json();
      
      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load data");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  // Extract unique months available in orders for the filter dropdown
  const availableMonths = useMemo(() => {
    if (!data?.orders) return [];
    const monthsSet = new Set<string>();
    data.orders.forEach((o: any) => {
      if (o.created_at) {
        const date = new Date(o.created_at);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(yearMonth);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [data]);

  // Filter orders based on selected month
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];
    if (selectedMonth === "all") return data.orders;
    return data.orders.filter((o: any) => {
      if (!o.created_at) return false;
      const date = new Date(o.created_at);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return yearMonth === selectedMonth;
    });
  }, [data, selectedMonth]);

  // Calculate total sales from 'total_payable_amount' based on filtered view
  const totalSalesFiltered = useMemo(() => {
    return filteredOrders.reduce((sum: number, o: any) => sum + (Number(o.total_payable_amount || o.total || 0)), 0);
  }, [filteredOrders]);

  const totalSalesAllTime = useMemo(() => {
    if (!data?.orders) return 0;
    return data.orders.reduce((sum: number, o: any) => sum + (Number(o.total_payable_amount || o.total || 0)), 0);
  }, [data]);

  const sendWhatsAppReminder = () => {
    const phone = data.profile.phone;
    const pendingOrders = data.orders
      .filter((o: any) => Number(o.pending_amount) > 0)
      .map((o: any) => o.uorn || o.id.slice(0, 8))
      .slice(0, 5)
      .join(", ");

    const message = `*PAYMENT REMINDER FROM EARTHY SOURCE*%0a%0aHello ${data.profile.name},%0a%0aThis is a reminder regarding your outstanding balance of *₹${data.current_due}*. %0a%0aPending Orders: ${pendingOrders}%0a%0aPlease clear the dues at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/91${phone}?text=${message}`, "_blank");
  };

  if (loading) return <div style={styles.loader}>Syncing Profile...</div>;
  if (error) return <div style={styles.loader}>Error: {error} <br/> <button onClick={() => router.back()}>Go Back</button></div>;

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        
        <div style={styles.header}>
          <button onClick={() => router.push('/admin/distributors')} style={styles.backBtn}>← Back</button>
          <h1 style={styles.title}>{data.profile.name}</h1>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <label style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>Filter by Month: </label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={styles.selectDropdown}
          >
            <option value="all">All Time (Overall)</option>
            {availableMonths.map((m) => {
              const [year, month] = m.split('-');
              const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
              return <option key={m} value={m}>{monthName}</option>;
            })}
          </select>
        </div>

        {/* Metrics Grid */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricBox}>
            <div style={styles.metricTitle}>Total Sales ({selectedMonth === 'all' ? 'All Time' : selectedMonth})</div>
            <div style={styles.metricValue}>₹{totalSalesFiltered.toLocaleString()}</div>
            {selectedMonth !== 'all' && (
              <div style={styles.metricSub}>All-Time Total: ₹{totalSalesAllTime.toLocaleString()}</div>
            )}
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricTitle}>Total Due Balance</div>
            <div style={{ ...styles.metricValue, color: '#ef4444' }}>₹{data.current_due.toLocaleString()}</div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Order History ({filteredOrders.length} Orders)</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th>Order</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order: any) => (
                    <tr key={order.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600' }}>{order.uorn || order.id.slice(0,8)}</div>
                        <small style={{ color: '#94a3b8' }}>{new Date(order.created_at).toLocaleDateString()}</small>
                      </td>
                      <td style={styles.td}>₹{order.total_payable_amount || order.total}</td>
                      <td style={styles.td}>₹{order.amount_paid}</td>
                      <td style={styles.td}><span style={{ color: Number(order.pending_amount) > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>₹{order.pending_amount}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No orders found for the selected timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.sideCol}>
            <div style={{ ...styles.card, background: '#1e293b', color: '#fff' }}>
              <h3 style={{ ...styles.cardTitle, color: '#94a3b8' }}>Quick Actions</h3>
              <button onClick={sendWhatsAppReminder} style={styles.whatsappBtn}>
                Send WhatsApp Reminder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', backgroundImage: "url('/hero-deep.jpg')", backgroundSize: 'cover', position: 'relative', padding: '40px 20px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' },
  container: { position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', color: '#fff' },
  backBtn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  title: { margin: 0 },
  filterCard: { background: 'rgba(255,255,255,0.08)', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', backdropFilter: 'blur(10px)' },
  selectDropdown: { padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  metricBox: { background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
  metricTitle: { fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600', marginBottom: '8px' },
  metricValue: { fontSize: '28px', fontWeight: '800', color: '#1e293b' },
  metricSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' },
  card: { background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '12px', textTransform: 'uppercase', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #eee' },
  td: { padding: '12px 0', fontSize: '14px', borderBottom: '1px solid #fafafa' },
  whatsappBtn: { width: '100%', background: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  loader: { color: '#fff', textAlign: 'center', marginTop: '30vh' }
};