"use client";
import { useState, useEffect } from "react";

export default function AttendancePage() {
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Load employees on page start
  useEffect(() => {
    fetch("/api/admin/hr/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.data || []))
      .catch((err) => console.error("Error loading employees:", err));
  }, []);

  const handleStatus = (id: string, status: string) => {
    setLogs({ ...logs, [id]: status });
  };

  const saveAttendance = async () => {
    // Basic validation
    if (Object.keys(logs).length === 0) {
      alert("Please mark attendance for at least one employee.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, logs })
      });
      
      if (res.ok) {
        alert("Attendance Saved Successfully! ✅");
      } else {
        alert("Failed to save attendance. Please try again.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("System error. Check connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>📅 Daily Attendance</h1>
            <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Select date and mark staff status</p>
          </div>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={styles.dateInput} 
          />
        </header>

        <div style={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Employee Details</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong style={{ fontSize: '16px' }}>{emp.full_name}</strong>
                      <br />
                      <span style={styles.roleTag}>{emp.role}</span>
                    </td>
                    <td style={{ ...styles.td, display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      {['Full Day', 'Half Day', 'Absent'].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatus(emp.id.toString(), s)}
                          style={{
                            ...styles.statusBtn,
                            background: logs[emp.id.toString()] === s ? '#2563eb' : '#f1f5f9',
                            color: logs[emp.id.toString()] === s ? '#fff' : '#64748b',
                            border: logs[emp.id.toString()] === s ? '1px solid #2563eb' : '1px solid #e2e8f0',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ ...styles.td, textAlign: 'center', padding: '50px', color: '#64748b' }}>
                      No employees found. Please onboard staff first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button 
            onClick={saveAttendance} 
            disabled={saving} 
            style={{
              ...styles.saveBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? "💾 Saving Records..." : `Submit Attendance for ${date}`}
          </button>
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/admin/hr/dashboard" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}>
            ← Return to HR Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", position: "relative", padding: "60px 20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.96)" },
  container: { position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { color: '#fff', fontSize: '32px', margin: 0, fontWeight: 'bold' },
  dateInput: { padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: '#fff', fontSize: '16px', fontWeight: 'bold', color: '#1e293b', outline: 'none' },
  card: { background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', textAlign: 'left' },
  th: { padding: '20px 30px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '20px 30px', verticalAlign: 'middle' },
  roleTag: { background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px', display: 'inline-block' },
  statusBtn: { padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease' },
  saveBtn: { width: '100%', padding: '20px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '18px', transition: '0.2s' }
};