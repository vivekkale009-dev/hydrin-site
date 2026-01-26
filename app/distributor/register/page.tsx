"use client";

import { useState } from "react";

export default function DistributorRegisterPage() {
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/distributors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setMsg("Thank you. Our team will contact you shortly.");
      setForm({}); // Clear form on success
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Distributor Registration</h2>
          <p style={styles.subtitle}>Join our network and grow your business with us.</p>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input 
              style={styles.input} 
              placeholder="Enter your name" 
              value={form.name || ""}
              onChange={e => setForm({ ...form, name: e.target.value })} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <input 
              style={styles.input} 
              placeholder="e.g. +91 9876543210" 
              value={form.phone || ""}
              onChange={e => setForm({ ...form, phone: e.target.value })} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              style={styles.input} 
              type="email"
              placeholder="name@company.com" 
              value={form.email || ""}
              onChange={e => setForm({ ...form, email: e.target.value })} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Complete Address</label>
            <input 
              style={styles.input} 
              placeholder="Shop No, Street, Landmark" 
              value={form.address || ""}
              onChange={e => setForm({ ...form, address: e.target.value })} 
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>City</label>
              <input 
                style={styles.input} 
                placeholder="City" 
                value={form.city || ""}
                onChange={e => setForm({ ...form, city: e.target.value })} 
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>State</label>
              <input 
                style={styles.input} 
                placeholder="State" 
                value={form.state || ""}
                onChange={e => setForm({ ...form, state: e.target.value })} 
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Pincode</label>
            <input 
              style={styles.input} 
              placeholder="6-digit code" 
              value={form.pincode || ""}
              onChange={e => setForm({ ...form, pincode: e.target.value })} 
            />
          </div>

          <button 
            style={loading ? {...styles.button, opacity: 0.7} : styles.button} 
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Processing..." : "Register Now"}
          </button>

          {error && <div style={styles.errorBox}>{error}</div>}
          {msg && <div style={styles.successBox}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  pageWrapper: {
    minHeight: "100vh",
    backgroundColor: "#f4f7f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: "480px",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a202c",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#718096",
    margin: 0,
  },
  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  row: {
    display: "flex",
    gap: "15px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#4a5568",
    marginLeft: "2px",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: "#fcfcfc",
  },
  button: {
    marginTop: "10px",
    padding: "14px",
    backgroundColor: "#2b6cb0",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  errorBox: {
    padding: "12px",
    backgroundColor: "#fff5f5",
    color: "#c53030",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
    border: "1px solid #feb2b2",
  },
  successBox: {
    padding: "12px",
    backgroundColor: "#f0fff4",
    color: "#2f855a",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
    border: "1px solid #9ae6b4",
  },
};