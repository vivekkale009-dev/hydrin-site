"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // Step 1: Credentials, Step 2: Security Token
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // AUTO-SUBMIT Logic: Triggers when totpCode reaches 6 digits
  useEffect(() => {
    if (totpCode.length === 6) {
      handleFinalSubmit();
    }
  }, [totpCode]);

  async function handleFirstStep(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, phase: 1 }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Invalid Login");
        setLoading(false);
        return;
      }

      setStep(2); // Move to Security Token window
      setLoading(false);
    } catch (e) {
      setError("Connection error.");
      setLoading(false);
    }
  }

  async function handleFinalSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, totpCode, phase: 2 }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Invalid Token");
        setTotpCode(""); // Clear for retry
        setLoading(false);
        return;
      }

      localStorage.setItem("is_admin", "true"); 
      router.push("/admin/scan-dashboard");
    } catch (e) {
      setError("Verification failed.");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.loginCard}>
        <div style={styles.logoSection}>
          <img src="/EarthyLogo.JPG" alt="Logo" style={styles.logoImage} />
          <h1 style={styles.brandName}>Earthy Source</h1>
        </div>

        {step === 1 ? (
          <form onSubmit={handleFirstStep} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={styles.input} required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Security Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <button type="submit" disabled={loading} style={{...styles.button, background: loading ? "#94a3b8" : "#2d4f3e"}}>
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        ) : (
          <div style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>SECURITY TOKEN</label>
              <input 
                type="text" 
                autoFocus 
                maxLength={6} 
                inputMode="numeric"
                placeholder="••••••"
                value={totpCode} 
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))} 
                style={{...styles.input, textAlign: 'center', fontSize: '24px', letterSpacing: '4px'}} 
              />
            </div>
            {error && <div style={styles.errorBox}>{error}</div>}
            <p style={{textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '10px'}}>
              {loading ? "Authorizing..." : "Enter 6-digit code to continue"}
            </p>
            <button onClick={() => setStep(1)} style={{background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px'}}>
              ← Back to Login
            </button>
          </div>
        )}

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
    backgroundColor: "#f1f5f2",
    backgroundImage: "radial-gradient(at 0% 0%, rgba(45, 79, 62, 0.05) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(45, 79, 62, 0.05) 0, transparent 50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
  },
  logoSection: { textAlign: "center", marginBottom: "24px" },
  logoImage: { width: "80px", height: "80px", borderRadius: "20px", objectFit: "cover", marginBottom: "12px" },
  brandName: { fontSize: "20px", fontWeight: "800", color: "#1a2e24", textTransform: "uppercase" },
  form: { display: "flex", flexDirection: "column" },
  inputGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "11px", fontWeight: "700", color: "#2d4f3e", marginBottom: "6px", textTransform: "uppercase" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "16px", backgroundColor: "#f8fafc", boxSizing: "border-box" },
  button: { width: "100%", padding: "14px", borderRadius: "12px", border: "none", color: "#ffffff", fontSize: "15px", fontWeight: "700", cursor: "pointer", marginTop: "8px" },
  errorBox: { backgroundColor: "#fff1f2", color: "#be123c", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px", textAlign: "center", border: "1px solid #ffe4e6" },
  footer: { marginTop: "24px", fontSize: "11px", color: "#94a3b8", textAlign: "center" },
};