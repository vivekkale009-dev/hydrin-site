"use client";
import { useState } from "react";

export default function EmployeeOnboarding() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "Production",
    dailyRate: "",
    phone: "",
    aadhaar: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
    joiningDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Employee Onboarded Successfully! 🎉");
        window.location.reload();
      }
    } catch (error) {
      alert("Error onboarding employee");
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
            <h1 style={styles.title}>👤 Employee Onboarding</h1>
            <p style={styles.subtitle}>Register new staff and set their payroll parameters</p>
          </div>
          <a href="/admin/hr/dashboard" style={styles.backBtn}>← Back to HR Dashboard</a>
        </header>

        <div style={styles.contentGrid}>
          {/* FORM SECTION */}
          <form onSubmit={handleSubmit} style={styles.formCard}>
            <h3 style={styles.sectionTitle}>Personal & Professional Details</h3>
            <div style={styles.inputGroup}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input required style={styles.input} placeholder="e.g. Rajesh Kumar" onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Designation / Role</label>
                <select style={styles.input} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="Production">Production Staff</option>
                  <option value="Driver">Driver / Delivery</option>
                  <option value="Sales">Sales Executive</option>
                  <option value="Admin">Office Admin</option>
                </select>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.field}>
                <label style={styles.label}>Daily Wage (₹)</label>
                <input required type="number" style={styles.input} placeholder="e.g. 500" onChange={e => setFormData({...formData, dailyRate: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>WhatsApp Number</label>
                <input required style={styles.input} placeholder="10 Digit Number" onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>

            <div style={styles.field}>
                <label style={styles.label}>Aadhaar Number (UIDAI)</label>
                <input style={styles.input} placeholder="XXXX-XXXX-XXXX" onChange={e => setFormData({...formData, aadhaar: e.target.value})} />
            </div>

            <h3 style={{...styles.sectionTitle, marginTop: '20px'}}>Bank Account Details (For Salary)</h3>
            <div style={styles.field}>
                <input style={{...styles.input, marginBottom: '10px'}} placeholder="Bank Name" onChange={e => setFormData({...formData, bankName: e.target.value})} />
                <div style={styles.inputGroup}>
                    <input style={styles.input} placeholder="Account Number" onChange={e => setFormData({...formData, accountNo: e.target.value})} />
                    <input style={styles.input} placeholder="IFSC Code" onChange={e => setFormData({...formData, ifsc: e.target.value})} />
                </div>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Registering..." : "Confirm & Onboard Employee"}
            </button>
          </form>

          {/* PREVIEW CARD */}
          <div style={styles.previewCard}>
             <div style={styles.avatarCircle}>{formData.name ? formData.name.charAt(0).toUpperCase() : "?"}</div>
             <h2 style={styles.prevName}>{formData.name || "Employee Name"}</h2>
             <p style={styles.prevRole}>{formData.role}</p>
             <hr style={styles.hr} />
             <div style={styles.prevStat}>
                <span>Daily Rate:</span>
                <strong>₹{formData.dailyRate || "0"}</strong>
             </div>
             <div style={styles.prevStat}>
                <span>Phone:</span>
                <strong>{formData.phone || "Not Set"}</strong>
             </div>
             <div style={styles.infoBox}>
                <p>💡 Monthly projection (26 days): <br/><strong>₹{(Number(formData.dailyRate) * 26).toLocaleString()}</strong></p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", position: "relative", padding: "40px 20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.92)" },
  container: { position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { color: '#fff', fontSize: '28px', margin: 0 },
  subtitle: { color: '#94a3b8', margin: '5px 0 0 0' },
  backBtn: { color: '#38bdf8', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' },
  formCard: { background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  sectionTitle: { fontSize: '16px', color: '#1e293b', borderLeft: '4px solid #2563eb', paddingLeft: '10px', marginBottom: '15px' },
  inputGroup: { display: 'flex', gap: '15px', marginBottom: '15px' },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' },
  submitBtn: { width: '100%', padding: '15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px', transition: '0.3s' },
  
  previewCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', height: 'fit-content' },
  avatarCircle: { width: '80px', height: '80px', borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  prevName: { color: '#fff', margin: '0 0 5px 0' },
  prevRole: { color: '#38bdf8', fontSize: '14px', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' },
  hr: { border: 'none', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' },
  prevStat: { display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '14px', marginBottom: '10px' },
  infoBox: { background: 'rgba(56, 189, 248, 0.1)', padding: '15px', borderRadius: '12px', color: '#38bdf8', marginTop: '20px', fontSize: '13px' }
};