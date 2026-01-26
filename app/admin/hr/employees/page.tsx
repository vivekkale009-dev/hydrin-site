"use client";
import { useState, useEffect } from "react";

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/hr/employees")
      .then(res => res.json())
      .then(data => {
        setEmployees(data.data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>👥 Staff Directory</h1>
          <a href="/admin/hr/onboarding" style={styles.actionLink}>+ Add New Staff</a>
        </header>

        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Name & Role</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Daily Rate</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => (
                <tr key={emp.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{emp.full_name}</strong><br/>
                    <small style={{color: '#64748b'}}>{emp.role}</small>
                  </td>
                  <td style={styles.td}>{emp.contact_number || 'N/A'}</td>
                  <td style={styles.td}>₹{emp.daily_rate}</td>
                  <td style={styles.td}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                      background: emp.is_active ? '#dcfce7' : '#fee2e2',
                      color: emp.is_active ? '#166534' : '#991b1b'
                    }}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && !loading && (
            <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>No employees found.</div>
          )}
        </div>
        <div style={{marginTop: '20px'}}>
            <a href="/admin/hr/dashboard" style={{color: '#38bdf8', textDecoration: 'none'}}>← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", position: "relative", padding: "40px 20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.95)" },
  container: { position: "relative", zIndex: 1, maxWidth: "1000px", margin: "0 auto" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { color: '#fff', fontSize: '28px' },
  card: { background: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', textAlign: 'left' },
  th: { padding: '15px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '15px', fontSize: '14px', color: '#1e293b' },
  actionLink: { padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }
};