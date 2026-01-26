"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DistributorViewPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sendWhatsAppReminder = () => {
    const phone = data.profile.phone;
    const pendingOrders = data.orders
      .filter((o: any) => Number(o.pending_amount) > 0)
      .map((o: any) => o.uorn || o.id.slice(0, 8))
      .slice(0, 5) // Last 5 orders
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

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Order History</h3>
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
                {data.orders.map((order: any) => (
                  <tr key={order.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '600' }}>{order.uorn || order.id.slice(0,8)}</div>
                      <small style={{ color: '#94a3b8' }}>{new Date(order.created_at).toLocaleDateString()}</small>
                    </td>
                    <td style={styles.td}>₹{order.total_payable_amount}</td>
                    <td style={styles.td}>₹{order.amount_paid}</td>
                    <td style={styles.td}><span style={{ color: Number(order.pending_amount) > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>₹{order.pending_amount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.sideCol}>
            <div style={{ ...styles.card, background: '#1e293b', color: '#fff' }}>
              <h3 style={{ ...styles.cardTitle, color: '#94a3b8' }}>Total Due</h3>
              <div style={{ fontSize: '36px', fontWeight: '800' }}>₹{data.current_due}</div>
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
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', color: '#fff' },
  backBtn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  title: { margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' },
  card: { background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '12px', textTransform: 'uppercase', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #eee' },
  td: { padding: '12px 0', fontSize: '14px', borderBottom: '1px solid #fafafa' },
  whatsappBtn: { width: '100%', background: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  loader: { color: '#fff', textAlign: 'center', marginTop: '30vh' }
};