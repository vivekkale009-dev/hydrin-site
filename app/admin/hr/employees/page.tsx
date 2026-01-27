"use client";
import { useState, useEffect } from "react";

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    fetch("/api/admin/hr/employees")
      .then(res => res.json())
      .then(data => {
        setEmployees(data.data || []);
        setLoading(false);
      });
  };

  const handleInputChange = (id: any, field: string, value: any) => {
    setEmployees((prev: any) =>
      prev.map((emp: any) => (emp.id === id ? { ...emp, [field]: value } : emp))
    );
  };

  const saveEmployee = async (emp: any) => {
    const res = await fetch(`/api/admin/hr/employees`, {
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emp),
    });
    if (res.ok) {
      alert("Employee updated successfully!");
    } else {
      alert("Error updating employee.");
    }
  };

  // New Function to delete employee
  const deleteEmployee = async (id: any) => {
    if (!confirm("Are you sure you want to delete this employee record? This cannot be undone.")) return;

    const res = await fetch(`/api/admin/hr/employees?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setEmployees(prev => prev.filter((emp: any) => emp.id !== id));
      alert("Employee deleted successfully.");
    } else {
      alert("Error deleting employee.");
    }
  };

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
                <th style={styles.th}>Aadhaar Number</th>
                <th style={styles.th}>Daily Rate</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => (
                <tr key={emp.id} style={styles.tr}>
                  <td style={styles.td}>
                    <input 
                      style={styles.input} 
                      value={emp.full_name} 
                      onChange={(e) => handleInputChange(emp.id, 'full_name', e.target.value)} 
                    />
                    <select 
                      style={{...styles.input, fontSize: '12px', color: '#64748b', marginTop: '4px'}} 
                      value={emp.role} 
                      onChange={(e) => handleInputChange(emp.id, 'role', e.target.value)}
                    >
                      <option value="Management">Management</option>
                      <option value="Production">Production Staff</option>
                      <option value="Driver">Driver / Delivery</option>
                      <option value="Sales">Sales Executive</option>
                      <option value="Marketing">Marketing Executive</option>
                      <option value="HR">HR Staff</option>
                      <option value="Accounting">Accounting Staff</option>
                      <option value="Admin">Office Admin</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <input 
                      style={styles.input} 
                      value={emp.contact_number || ''} 
                      onChange={(e) => handleInputChange(emp.id, 'contact_number', e.target.value)} 
                    />
                  </td>
                  <td style={styles.td}>
                    <input 
                      type="text"
                      inputMode="numeric"
                      style={styles.input} 
                      placeholder="12-digit Adhar"
                      value={emp.aadhaar_number || ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 12) {
                          handleInputChange(emp.id, 'aadhaar_number', val);
                        }
                      }} 
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      ₹<input 
                        type="number"
                        style={{...styles.input, width: '80px'}} 
                        value={emp.daily_rate} 
                        onChange={(e) => handleInputChange(emp.id, 'daily_rate', e.target.value)} 
                      />
                    </div>
                  </td>
                  <td style={styles.td}>
                    <select 
                      style={styles.select}
                      value={emp.is_active ? "true" : "false"}
                      onChange={(e) => handleInputChange(emp.id, 'is_active', e.target.value === "true")}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button onClick={() => saveEmployee(emp)} style={styles.saveBtn}>Save</button>
                      <button onClick={() => deleteEmployee(emp.id)} style={styles.deleteBtn}>Delete</button>
                    </div>
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
  container: { position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { color: '#fff', fontSize: '28px' },
  card: { background: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', textAlign: 'left' },
  th: { padding: '15px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '10px 15px', fontSize: '14px', color: '#1e293b' },
  input: { width: '100%', padding: '5px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none' },
  select: { padding: '5px', border: '1px solid #e2e8f0', borderRadius: '4px' },
  saveBtn: { padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  deleteBtn: { padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  actionLink: { padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }
};