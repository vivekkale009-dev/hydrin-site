"use client";

import { useState } from "react";

export default function CreateDistributorPage() {
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
      name: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      address: form.address.value,
      city: form.city.value,
      state: form.state.value,
      pincode: form.pincode.value,
      delivery_rate_per_km: Number(form.delivery_rate.value),
      is_active: form.is_active.checked
    };

    try {
      const res = await fetch("/api/admin/distributors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Distributor registered successfully");
      form.reset();
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
          <h1 style={styles.heading}>New Distributor</h1>
          <p style={styles.sub}>Admin Management Interface</p>
        </div>

        {error && <div style={styles.errorContainer}>{error}</div>}
        {success && <div style={styles.successContainer}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrapper}>
            <label style={styles.label}>Business Name / Person Name *</label>
            <input name="name" style={styles.input} placeholder="e.g. Earthy source solutions / Rahul" required />
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Contact Number *</label>
            <input name="phone" style={styles.input} placeholder="Phone (unique)" required />
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Email Address</label>
            <input name="email" type="email" style={styles.input} placeholder="contact@distributor.com" />
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Full Address</label>
            <textarea name="address" style={{...styles.input, height: '80px', resize: 'none'}} placeholder="Warehouse/Office location" />
          </div>

          <div style={styles.row}>
            <div style={{flex: 1}}>
              <label style={styles.label}>City</label>
              <input name="city" style={styles.input} placeholder="City" />
            </div>
            <div style={{flex: 1}}>
              <label style={styles.label}>State</label>
              <input name="state" style={styles.input} placeholder="State" />
            </div>
          </div>

          <div style={styles.row}>
            <div style={{flex: 1}}>
              <label style={styles.label}>Pincode</label>
              <input name="pincode" style={styles.input} placeholder="Pincode" />
            </div>
            <div style={{flex: 1}}>
              <label style={styles.label}>Rate per KM (₹)</label>
              <input
                name="delivery_rate"
                type="number"
                defaultValue={15}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.statusSection}>
            <label style={styles.checkbox}>
              <input type="checkbox" name="is_active" defaultChecked style={styles.checkInput} />
              <span style={{color: '#444', fontWeight: '500'}}>Account Active</span>
            </label>
          </div>

          <button disabled={loading} style={loading ? {...styles.button, opacity: 0.7} : styles.button}>
            {loading ? "Processing..." : "Create Distributor Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/hero-deep.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.7)"
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "500px",
    padding: "40px",
    borderRadius: "16px",
    background: "#ffffff",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
  },
  headerSection: {
    marginBottom: "24px",
    textAlign: "center"
  },
  heading: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#1a202c",
    margin: "0"
  },
  sub: {
    fontSize: "14px",
    color: "#718096",
    margin: "4px 0 0 0"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  inputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#4a5568",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  input: {
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "15px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#f8fafc",
    outline: "none"
  },
  row: {
    display: "flex",
    gap: "12px"
  },
  statusSection: {
    padding: "10px 0",
    borderBottom: "1px solid #edf2f7",
    marginBottom: "10px"
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    cursor: "pointer"
  },
  checkInput: {
    width: "18px",
    height: "18px",
    cursor: "pointer"
  },
  button: {
    padding: "14px",
    backgroundColor: "#2d3748",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "10px"
  },
  errorContainer: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "15px",
    border: "1px solid #feb2b2"
  },
  successContainer: {
    backgroundColor: "#f0fff4",
    color: "#2f855a",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "15px",
    border: "1px solid #9ae6b4"
  }
};