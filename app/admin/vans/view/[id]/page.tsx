"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VanLedgerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amountToPay, setAmountToPay] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/vans/${id}/ledger?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

const sendWhatsApp = () => {
    if (!data) return;
    
    // Formatting the current date for a professional look
    const today = new Date().toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });

    const message = 
      `🌱 *EARTHY SOURCE - Delivery Partner Statement* 🌱%0A` +
      `--------------------------------------------%0A` +
      `Hello *${data.van.driver_name}*,%0A%0A` +
      `Here is your updated payment summary as of *${today}*:%0A%0A` +
      `🚚 *Vehicle:* ${data.van.vehicle_number}%0A` +
      `💰 *Total Earnings:* ₹${data.summary.total_earned}%0A` +
      `✅ *Total Paid:* ₹${data.summary.total_paid}%0A` +
      `--------------------------------------------%0A` +
      `🚩 *BALANCE DUE:* ₹${data.summary.balance}%0A` +
      `--------------------------------------------%0A%0A` +
      `*Thank you for supporting Earthy Source!*%0A` +
      `We appreciate your hard work in helping us deliver freshness. 🙏%0A%0A` +
      `_This is an automated statement. For any queries, please contact the admin._`;

    // Opens WhatsApp Web or Mobile App
    window.open(`https://wa.me/91${data.van.driver_phone}?text=${message}`, '_blank');
  };

  async function handlePayout() {
    if (!amountToPay || Number(amountToPay) <= 0) return alert("Enter amount");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vans/${id}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToPay })
      });
      if (!res.ok) throw new Error("Payment failed");
      setAmountToPay("");
      await loadData();
      alert("Payment recorded!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) return <div style={styles.loader}>Loading Ledger...</div>;
  if (!data) return <div style={styles.loader}>Ledger not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => router.back()} style={styles.backBtn}>← Back</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#fff', margin: 0 }}>Ledger: {data.van.driver_name}</h2>
            <span style={{ color: '#ccc', fontSize: '14px' }}>{data.van.vehicle_number}</span>
          </div>
          <button onClick={sendWhatsApp} style={styles.whatsappBtn}>
            <span style={{ fontSize: '18px' }}>💬</span> Share on WhatsApp
          </button>
        </div>

        <div style={styles.grid}>
          <div style={styles.leftCol}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Earnings from Deliveries</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={{ padding: '10px' }}>Order</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right', paddingRight: '10px' }}>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders?.map((o: any) => (
                      <tr key={o.id} style={styles.tr}>
                        <td style={{ padding: '12px' }}>{o.uorn}</td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '10px' }}>₹{o.delivery_fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Recent Payouts</h3>
              <table style={styles.table}>
                <tbody>
                  {data.payouts?.map((p: any) => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={{ padding: '12px' }}>{new Date(p.paid_at).toLocaleDateString()}</td>
                      <td>CASH</td>
                      <td style={{ textAlign: 'right', color: 'green', fontWeight: 'bold', paddingRight: '10px' }}>₹{p.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.rightCol}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Balance Summary</h3>
              <div style={styles.stat}><label>Total Earned</label><span>₹{data.summary.total_earned}</span></div>
              <div style={styles.stat}><label>Total Paid</label><span style={{ color: 'green' }}>₹{data.summary.total_paid}</span></div>
              <div style={{ ...styles.stat, borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '10px' }}>
                <label style={{ fontSize: '18px' }}>Balance Due</label>
                <span style={{ fontSize: '24px', color: '#e53e3e', fontWeight: 'bold' }}>₹{data.summary.balance}</span>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Pay Driver</h3>
              <input 
                type="number" style={styles.input} placeholder="0.00" 
                value={amountToPay} onChange={e => setAmountToPay(e.target.value)} 
              />
              <button onClick={handlePayout} disabled={loading} style={styles.payBtn}>
                {loading ? "Processing..." : "Record Cash Payment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', backgroundImage: "url('/hero-deep.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', padding: '40px 20px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' },
  container: { position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  backBtn: { background: '#444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  whatsappBtn: { background: '#25D366', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  grid: { display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '25px' },
  card: { background: '#fff', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '16px', color: '#111', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', fontSize: '11px', color: '#999' },
  tr: { borderBottom: '1px solid #f5f5f5', fontSize: '14px' },
  stat: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 'bold', fontSize: '15px' },
  input: { width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #edf2f7', fontSize: '16px', boxSizing: 'border-box', marginBottom: '10px' },
  payBtn: { width: '100%', padding: '16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  loader: { color: '#fff', textAlign: 'center', marginTop: '200px', fontSize: '18px' }
};