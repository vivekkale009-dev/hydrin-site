"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateVanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const form = e.target;

    const payload = {
      vehicle_number: form.vehicle_number.value,
      vehicle_model: form.vehicle_model.value,
      driver_name: form.driver_name.value,
      driver_phone: form.driver_phone.value,
      rate_per_km: Number(form.rate_per_km.value),
      is_active: form.is_active.checked,
      // CAPTURING THE OWNED STATUS HERE
      is_owned_by_firm: form.is_owned_by_firm.checked 
    };

    try {
      const res = await fetch("/api/admin/vans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create van");

      setSuccess("Van registered successfully!");
      form.reset();
      
      // Redirect to list after 1.5 seconds
      setTimeout(() => {
        router.push("/admin/vans");
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.card}>
        <div style={styles.headerSection}>
          <h1 style={styles.heading}>Register New Van</h1>
          <p style={styles.sub}>Earthy Source Fleet Management</p>
        </div>

        {error && <div style={styles.errorContainer}>{error}</div>}
        {success && <div style={styles.successContainer}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrapper}>
            <label style={styles.label}>Vehicle Number *</label>
            <input 
              name="vehicle_number" 
              style={styles.input} 
              placeholder="e.g. MH15HM1616" 
              required 
            />
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Vehicle Model</label>
            <input 
              name="vehicle_model" 
              style={styles.input} 
              placeholder="e.g. Tata Ace, Mahindra Supro" 
            />
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Driver Name *</label>
            <input 
              name="driver_name" 
              style={styles.input} 
              placeholder="Full Name" 
              required 
            />
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Driver Phone *</label>
              <input 
                name="driver_phone" 
                style={styles.input} 
                placeholder="10-digit number" 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Rate / KM (₹)</label>
              <input 
                name="rate_per_km" 
                type="number"
                defaultValue={15}
                style={styles.input} 
                required
              />
            </div>
          </div>

          <div style={styles.statusSection}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={styles.checkbox}>
                <input type="checkbox" name="is_active" defaultChecked style={styles.checkInput} />
                <span style={{ color: '#444', fontWeight: '500' }}>Active</span>
              </label>

              {/* NEW CHECKBOX FOR OWNED STATUS */}
              <label style={styles.checkbox}>
                <input type="checkbox" name="is_owned_by_firm" style={styles.checkInput} />
                <span style={{ color: '#444', fontWeight: '500' }}>Owned by Firm</span>
              </label>
            </div>
          </div>

          <button disabled={loading} style={loading ? { ...styles.button, opacity: 0.7 } : styles.button}>
            {loading ? "Registering..." : "Add Van to Fleet"}
          </button>
          
          <button 
            type="button" 
            onClick={() => router.push("/admin/vans")}
            style={{ ...styles.button, backgroundColor: '#718096', marginTop: '0' }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", backgroundImage: "url('/hero-deep.jpg')", backgroundSize: "cover", backgroundPosition: "center", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" },
  card: { position: "relative", width: "100%", maxWidth: "480px", padding: "35px", borderRadius: "16px", background: "#ffffff", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" },
  headerSection: { marginBottom: "24px", textAlign: "center" },
  heading: { fontSize: "24px", fontWeight: "700", color: "#1a202c", margin: "0" },
  sub: { fontSize: "14px", color: "#718096", margin: "4px 0 0 0" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputWrapper: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "11px", fontWeight: "700", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "15px", width: "100%", boxSizing: "border-box", backgroundColor: "#f8fafc", outline: "none" },
  row: { display: "flex", gap: "12px" },
  statusSection: { padding: "10px 0", borderBottom: "1px solid #edf2f7", marginBottom: "5px" },
  checkbox: { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" },
  checkInput: { width: "18px", height: "18px", cursor: "pointer" },
  button: { padding: "14px", backgroundColor: "#2d3748", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer", marginTop: "10px" },
  errorContainer: { backgroundColor: "#fff5f5", color: "#c53030", padding: "12px", borderRadius: "8px", fontSize: "14px", textAlign: "center", marginBottom: "15px", border: "1px solid #feb2b2" },
  successContainer: { backgroundColor: "#f0fff4", color: "#2f855a", padding: "12px", borderRadius: "8px", fontSize: "14px", textAlign: "center", marginBottom: "15px", border: "1px solid #9ae6b4" }
};