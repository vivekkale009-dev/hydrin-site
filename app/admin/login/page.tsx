"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTarget = "/admin/scan-dashboard";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Access Denied");
        setLoading(false);
        return;
      }
	  // --- ADD THIS LINE HERE ---
localStorage.setItem("is_admin", "true"); 

router.push(redirectTarget);

      router.push(redirectTarget);
    } catch (e) {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      {/* Decorative background element */}
      <div style={styles.blob} />

      <div style={styles.loginCard}>
        <div style={styles.logoSection}>
          <div style={styles.logoWrapper}>
            <img 
              src="/EarthyLogo.JPG" 
              alt="Earthy Source Logo" 
              style={styles.logoImage}
            />
          </div>
          <h1 style={styles.brandName}>Earthy Source</h1>
          <p style={styles.brandSub}>Foods & Beverages</p>
        </div>

        <div style={styles.divider} />

        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.loginTitle}>Admin Portal</h2>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Security Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              background: loading ? "#94a3b8" : "#2d4f3e", // Slate green
            }}
          >
            {loading ? "Authenticating..." : "Access Dashboard"}
          </button>
        </form>

        <p style={styles.footer}>
          Restricted Access &bull; Authorized Personnel Only
        </p>
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f1f5f2", // Light sage background
    backgroundImage: "radial-gradient(at 0% 0%, rgba(45, 79, 62, 0.05) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(45, 79, 62, 0.05) 0, transparent 50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: "500px",
    height: "500px",
    background: "rgba(45, 79, 62, 0.03)",
    borderRadius: "50%",
    top: "-100px",
    right: "-100px",
    zIndex: 0,
  },
  loginCard: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    zIndex: 1,
    border: "1px solid #e2e8f0",
  },
  logoSection: {
    textAlign: "center",
    marginBottom: "24px",
  },
  logoWrapper: {
    width: "80px",
    height: "80px",
    margin: "0 auto 16px",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  brandName: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#1a2e24", // Very dark slate green
    margin: 0,
    letterSpacing: "-0.5px",
    textTransform: "uppercase",
  },
  brandSub: {
    fontSize: "12px",
    color: "#64748b",
    margin: "2px 0 0 0",
    fontWeight: "500",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(to right, transparent, #e2e8f0, transparent)",
    margin: "24px 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  loginTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "20px",
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#2d4f3e",
    marginBottom: "6px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "transform 0.1s, filter 0.2s",
    marginTop: "8px",
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    color: "#be123c",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "16px",
    textAlign: "center",
    border: "1px solid #ffe4e6",
  },
  footer: {
    marginTop: "24px",
    fontSize: "11px",
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
};