"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import BackgroundWrapper from "../components/BackgroundWrapper";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PurityCheck() {
  const [batch, setBatch] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleVerify() {
    setData(null);
    setError("");

    if (!batch.trim()) {
      setError("Please enter a batch code.");
      return;
    }

    const { data: batchData, error: fetchError } = await supabase
      .from("batches")
      .select("*")
      .eq("batch_code", batch.trim())
      .maybeSingle();

    if (fetchError) {
      setError("Database error.");
      return;
    }

    if (!batchData) {
      setError("Invalid batch code.");
      return;
    }

    setData(batchData);

    await supabase.from("scans").insert({
      batch_code: batch.trim(),
    });
  }

  return (
    <BackgroundWrapper backgroundStyle={purityBackground}>
      <div style={{ padding: "120px 60px", color: "white", maxWidth: "900px" }}>
        
        <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>
          OxyHydra Purity Check
        </h1>

        <p style={{ fontSize: "1.2rem", marginBottom: "25px" }}>
          Enter your bottle’s batch number to check purity details.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
          <input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="Enter batch code"
            style={{
              padding: "12px 16px",
              width: "260px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid white",
              borderRadius: "8px",
              color: "white",
            }}
          />

          <button
            onClick={handleVerify}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              background: "white",
              color: "black",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Verify Now
          </button>
        </div>

        {error && (
          <p style={{ color: "#ff4e4e", marginTop: "10px", fontSize: "1.1rem" }}>
            {error}
          </p>
        )}

        {data && (
          <div
            style={{
              marginTop: "40px",
              padding: "20px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "10px",
              backdropFilter: "blur(6px)",
            }}
          >
            <h2 style={{ marginBottom: "20px" }}>Batch Information</h2>

            <table
              style={{
                width: "100%",
                color: "white",
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                <tr>
                  <td style={cell}>Batch Code</td>
                  <td style={value}>{data.batch_code}</td>
                </tr>

                <tr>
                  <td style={cell}>Manufacture Date</td>
                  <td style={value}>{data.production_date}</td>
                </tr>

                <tr>
                  <td style={cell}>TDS Value Range</td>
                  <td style={value}>
                    {data.tds_display_min} – {data.tds_display_max}
                  </td>
                </tr>

                <tr>
                  <td style={cell}>pH Value Range</td>
                  <td style={value}>
                    {data.ph_display_min} – {data.ph_display_max}
                  </td>
                </tr>

                <tr>
                  <td style={cell}>Status</td>
                  <td style={value}>{data.status}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BackgroundWrapper>
  );
}

const cell = {
  padding: "10px",
  borderBottom: "1px solid rgba(255,255,255,0.3)",
  width: "40%",
  fontWeight: 600,
};

const value = {
  padding: "10px",
  borderBottom: "1px solid rgba(255,255,255,0.3)",
};
const purityBackground = {
  backgroundImage: "url('/purity-bg.jpg')",  // ← FIXED
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};
