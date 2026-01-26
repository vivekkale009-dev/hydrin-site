"use client";
import { useState, useEffect } from "react";

export default function AdvancePage() {
  const [empId, setEmpId] = useState("");
  const [amount, setAmount] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch employees for the dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/admin/hr/employees");
        const data = await res.json();
        setEmployees(data.data || []);
      } catch (err) {
        console.error("Failed to load employees");
      }
    };
    fetchEmployees();
  }, []);

  const issueAdvance = async () => {
    if (!empId || !amount) return alert("Select Employee and Amount");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hr/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          employee_id: parseInt(empId), 
          amount: parseFloat(amount), 
          date: new Date().toISOString() 
        })
      });
      if (res.ok) {
        alert("Advance issued and recorded! 🎉");
        setAmount("");
        setEmpId("");
      } else {
        alert("Failed to record advance.");
      }
    } catch (error) {
      alert("System Error: Could not connect to API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>💸 Salary Advance Management</h1>
            <p style={{color: '#94a3b8', margin: '5px 0 0 0'}}>Record mid-month cash payments to staff</p>
          </div>
          <a href="/admin/hr/dashboard" style={styles.backBtn}>← Back to Dashboard</a>
        </header>

        <div style={styles.contentGrid}>
          {/* Form Side */}
          <div style={styles.formCard}>
            <h3 style={{marginBottom: '25px', color: '#1e293b', fontSize: '18px'}}>Issue New Advance</h3>
            
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Staff Member</label>
              <select style={styles.input} value={empId} onChange={e => setEmpId(e.target.value)}>
                <option value="">Choose Employee...</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.role})</option>
                ))}
              </select>
            </div>
            
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Amount to Issue (₹)</label>
              <input 
                type="number" 
                placeholder="e.g. 1000" 
                style={styles.input} 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
              />
            </div>
            
            <button onClick={issueAdvance} disabled={loading} style={styles.submitBtn}>
              {loading ? "Processing..." : "Confirm & Record Advance"}
            </button>
          </div>

          {/* Info Side */}
          <div style={styles.infoCard}>
            <h3 style={{color: '#fff', marginBottom: '20px', fontSize: '18px'}}>System Rules</h3>
            <div style={styles.ruleItem}>
              <div style={styles.ruleIcon}>✓</div>
              <p style={styles.ruleText}>Advances are automatically subtracted from the <strong>Net Payable</strong> at month-end.</p>
            </div>
            <div style={styles.ruleItem}>
              <div style={styles.ruleIcon}>✓</div>
              <p style={styles.ruleText}>This record is permanent and linked to the employee's unique ID.</p>
            </div>
            <div style={styles.ruleItem}>
              <div style={styles.ruleIcon}>✓</div>
              <p style={styles.ruleText}>Ensure the employee's daily rate is correctly set in Onboarding before issuing large sums.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", position: "relative", padding: "60px 20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.96)" },
  container: { position: "relative", zIndex: 1, maxWidth: "1000px", margin: "0 auto" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' },
  title: { color: '#fff', fontSize: '32px', margin: 0, fontWeight: '700' },
  backBtn: { color: '#38bdf8', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: '8px' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' },
  formCard: { background: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
  fieldGroup: { marginBottom: '20px' },
  fieldLabel: { display: 'block', fontSize: '13px', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none', background: '#f8fafc' },
  submitBtn: { width: '100%', padding: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.2s', marginTop: '10px' },
  infoCard: { background: 'rgba(255,255,255,0.03)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' },
  ruleItem: { display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-start' },
  ruleIcon: { background: '#10b981', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 },
  ruleText: { color: '#94a3b8', margin: 0, fontSize: '14px', lineHeight: '1.6' }
};