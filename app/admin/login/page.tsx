"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // NO useSearchParams — default redirect
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
        setError(json.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push(redirectTarget);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Check console.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(15,23,42,0.95)",
          borderRadius: 18,
          padding: 28,
          border: "1px solid rgba(148,163,184,0.4)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, marginBottom: 4 }}>
          OxyHydra Admin
        </h1>
        <p style={{ opacity: 0.7, marginBottom: 18 }}>
          Enter admin password to access the scan dashboard.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              marginBottom: 6,
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "95%",                   // ← shorter input width
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.7)",
              background: "rgba(15,23,42,0.9)",
              color: "white",
              marginBottom: 14,
            }}
          />

          {error && (
            <div style={{ color: "#f97316", fontSize: "0.85rem", marginBottom: 10 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#9ca3af" : "#22c55e",
              color: "black",
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p
          style={{
            marginTop: 14,
            fontSize: "0.8rem",
            opacity: 0.6,
          }}
        >
          This panel is restricted to OxyHydra internal team.
        </p>
      </div>
    </main>
  );
}
