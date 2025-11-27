"use client";

import { useState, type CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import BackgroundWrapper from "../components/BackgroundWrapper";
import Script from "next/script"; // for reCAPTCHA

import jsPDF from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==== STATIC VALUES (not from Supabase) ====
const STATIC_PLANT =
  "OxyHydra Bottling plant Khairi nimgaon Shrirampur, Ahmednagar";
const STATIC_LICENSE = "12345678901234";
const STATIC_FSSAI = "12345678901234";

export default function PurityCheck() {
  const [batch, setBatch] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFake, setIsFake] = useState(false);

  // NEW: expired state
  const [isExpired, setIsExpired] = useState(false);

  // =======================================================================
  // VERIFY BATCH
  // =======================================================================
  async function handleVerify() {
    setError("");
    setData(null);
    setIsFake(false);
    setIsExpired(false);
    setLoading(true);

    // ---- reCAPTCHA check ----
    const captchaToken = (window as any).grecaptcha?.getResponse();
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      setLoading(false);
      return;
    }

    const captchaRes = await fetch("/api/verify-captcha", {
      method: "POST",
      body: JSON.stringify({ token: captchaToken }),
    }).then((r) => r.json());

    if (!captchaRes.success) {
      setError("CAPTCHA failed. Try again.");
      setLoading(false);
      return;
    }

    (window as any).grecaptcha.reset();
    // ---- end of reCAPTCHA ----

    // ---- IP + GEO lookup ----
    let ip = "unknown";
    let geo: { country?: string | null; state?: string | null; city?: string | null; isp?: string | null } =
      {};

    try {
      const geoRes = await fetch("/api/get-ip-geo");
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        ip = geoJson.ip || "unknown";
        geo = geoJson.geo || {};
      }
    } catch (e) {
      console.warn("Geo lookup failed", e);
    }

    // ---- Check if IP is blocked ----
    try {
      const { data: blocked, error: blockedErr } = await supabase
        .from("blocked_ips")
        .select("*")
        .eq("ip_address", ip)
        .eq("is_blocked", true)
        .maybeSingle();

      if (!blockedErr && blocked) {
        setError(
          "Too many suspicious scans detected from your network. Please contact support."
        );
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Blocked IP check failed", e);
      // do NOT block user if DB check fails – just continue
    }

    // ---- your original logic from here ----
    if (!batch.trim()) {
      setError("Please enter batch number.");
      setLoading(false);
      return;
    }

    const { data: batchData, error: fetchError } = await supabase
      .from("batches")
      .select("*")
      .eq("batch_code", batch.trim())
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      setError("Database error. Try again.");
      setLoading(false);
      return;
    }

    // FAKE BOTTLE
    if (!batchData) {
      setIsFake(true);

      // Log fake scan (with location)
   await supabase.from("scans").insert({
  batch_code: batch.trim(),
  status: "fake",
  ip_address: ip,
  country: geo.country ?? null,
  state: geo.state ?? null,
  city: geo.city ?? null,
  isp: geo.isp ?? null,
  latitude: geo.latitude ?? null,
  longitude: geo.longitude ?? null,
});


      setLoading(false);
      return;
    }

    // -------------------------------
    // EXPIRED BOTTLE CHECK
    // -------------------------------
    const today = new Date();
    const expiry = new Date(batchData.expiry_date);

    if (expiry < today) {
      setIsExpired(true);

      // Log expired scan (with location)
 await supabase.from("scans").insert({
  batch_code: batch.trim(),
  status: "expired",
  ip_address: ip,
  country: geo.country ?? null,
  state: geo.state ?? null,
  city: geo.city ?? null,
  isp: geo.isp ?? null,
  latitude: geo.latitude ?? null,
  longitude: geo.longitude ?? null,
});


      setLoading(false);
      return; // do NOT proceed to verified UI
    }

    // VALID BOTTLE
    setData(batchData);

await supabase.from("scans").insert({
  batch_code: batch.trim(),
  status: "verified",
  ip_address: ip,
  country: geo.country ?? null,
  state: geo.state ?? null,
  city: geo.city ?? null,
  isp: geo.isp ?? null,
  latitude: geo.latitude ?? null,
  longitude: geo.longitude ?? null,
});


    setLoading(false);
  }

  // =======================================================================
  // PDF GENERATION
  // =======================================================================
  const downloadCertificate = () => {
    if (!data) return;

    const doc = new jsPDF("p", "pt", "a4");

    const primary = "#0A6CFF";
    const text = "#333333";

    doc.setDrawColor(10, 108, 255);
    doc.setLineWidth(4);
    doc.rect(20, 20, 555, 800);

    doc.setTextColor(235, 235, 235);
    doc.setFontSize(60);
    doc.text("OXYHYDRA", 100, 420, { angle: 30 });

    try {
      doc.addImage("/OxyHydraLogo.png", "PNG", 215, 60, 150, 150);
    } catch (e) {
      console.warn("Logo failed to load in PDF", e);
    }

    doc.setTextColor(primary);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("Purity Verification Certificate", 100, 250);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(text);
    doc.text(
      "This certifies that the following OxyHydra bottle batch has been verified",
      100,
      280
    );
    doc.text(
      "and tested according to BIS IS 14543 packaged drinking water standards.",
      100,
      298
    );

    doc.setDrawColor(200, 200, 200);
    doc.line(100, 310, 500, 310);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Water Safety Information", 100, 340);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);

    doc.text(`Product Type: Packaged Drinking Water`, 100, 370);
    doc.text(`Batch Number: ${data.batch_code}`, 100, 390);
    doc.text(`Manufactured On: ${data.production_date}`, 100, 410);
    doc.text(`Expiry / Use By: ${data.expiry_date}`, 100, 430);
    doc.text(`Net Quantity: ${data.net_quantity}`, 100, 450);

    doc.text(`Plant Address: ${STATIC_PLANT}`, 100, 470);
    doc.text(`License Number: ${STATIC_LICENSE}`, 100, 490);
    doc.text(`FSSAI Number: ${STATIC_FSSAI}`, 100, 510);

    doc.text(
      `Treatment Process: RO + UV + Ozonation + Micron Filtration`,
      100,
      535
    );

    try {
      const sealImg = "/OxyHydraQualityCheck.png";
      doc.addImage(sealImg, "PNG", 110, 580, 160, 160);
    } catch (e) {
      console.warn("Seal image failed to load in PDF:", e);
    }

    doc.setDrawColor(100, 100, 100);
    doc.line(110, 750, 330, 750);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(text);
    doc.text("Quality Assurance Team", 110, 770);

    doc.save(`OxyHydra-Certificate-${data.batch_code}.pdf`);
  };

  // =======================================================================
  // STYLES
  // =======================================================================
  const page: CSSProperties = {
    padding: "60px 20px",
    minHeight: "100vh",
    color: "white",
  };

  const inner: CSSProperties = {
    maxWidth: "900px",
    margin: "0 auto",
  };

  const title: CSSProperties = {
    fontSize: "3rem",
    fontWeight: 800,
    marginBottom: "20px",
  };

  const subtitle: CSSProperties = {
    fontSize: "1.1rem",
    marginBottom: "20px",
    maxWidth: "520px",
  };

  const inputRow: CSSProperties = {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  };

  const inputStyle: CSSProperties = {
    padding: "14px 18px",
    width: "300px",
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.75)",
    borderRadius: "10px",
    color: "white",
  };

  const verifyButton: CSSProperties = {
    padding: "14px 28px",
    borderRadius: "10px",
    background: "white",
    color: "black",
    cursor: "pointer",
    border: "none",
    fontWeight: 700,
  };

  const card: CSSProperties = {
    background: "rgba(0,0,0,0.55)",
    padding: "30px",
    borderRadius: "20px",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.18)",
    marginBottom: "25px",
  };

  const smallCard: CSSProperties = {
    background: "rgba(0,0,0,0.55)",
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.18)",
  };

  const sectionTitle: CSSProperties = {
    fontSize: "1.6rem",
    fontWeight: 700,
    marginBottom: "10px",
  };

  // =======================================================================
  // RENDER
  // =======================================================================
  return (
    <>
      {/* reCAPTCHA script */}
      <Script src="https://www.google.com/recaptcha/api.js" />

      <BackgroundWrapper
        backgroundStyle={{
          backgroundImage: "url('/purity-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <main style={page}>
          <div style={inner}>
            <h1 style={title}>OxyHydra Purity Check</h1>
            <p style={subtitle}>
              Verify your bottle using the batch number printed on the label.
            </p>

            {/* Input */}
            <div style={inputRow}>
              <input
                style={inputStyle}
                placeholder="Enter batch number"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
              <button style={verifyButton} onClick={handleVerify}>
                {loading ? "Checking..." : "Verify"}
              </button>
            </div>

            {/* CAPTCHA widget */}
            <div style={{ marginTop: 20 }}>
              <div
                className="g-recaptcha"
                data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              ></div>
            </div>

            {error && <p style={{ color: "#ff6b6b", marginTop: 8 }}>{error}</p>}

            {/* Fake Bottle */}
            {isFake && (
              <div style={card}>
                <h2 style={{ ...sectionTitle, color: "#ff6b6b" }}>
                  Fake / Invalid Bottle ❌
                </h2>
                <p>
                  This batch number is not present in OxyHydra’s secure database.
                  Please check the code again or contact our team.
                </p>
              </div>
            )}

            {/* EXPIRED BOTTLE */}
            {isExpired && (
              <div style={card}>
                <h2 style={{ ...sectionTitle, color: "#ff6b6b" }}>
                  Bottle Expired ❌
                </h2>
                <p>
                  This bottle has passed its expiry date and should not be consumed.
                </p>
                <p style={{ marginTop: 10 }}>
                  Please contact our support team for assistance.
                </p>

                <a href="mailto:quality@oxyhydra.com">
                  <button
                    style={{
                      marginTop: 16,
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "1px solid white",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Contact Support
                  </button>
                </a>
              </div>
            )}

            {/* VERIFIED BOTTLE */}
            {data && !isExpired && (
              <>
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={sectionTitle}>Bottle Verified</h2>
                    <img
                      src="/VerifiedTick.png"
                      alt="verified"
                      style={{ width: "32px", height: "32px" }}
                    />
                  </div>

                  <p>Authentic and safe for consumption.</p>

                  <p>
                    <strong>Batch:</strong> {data.batch_code}
                  </p>
                  <p>
                    <strong>Manufactured:</strong> {data.production_date}
                  </p>
                  <p>
                    <strong>Expires:</strong> {data.expiry_date}
                  </p>
                  <p>
                    <strong>Status:</strong> {data.status}
                  </p>

                  <p>✔ Batch verified from OxyHydra database</p>

                  <button
                    onClick={downloadCertificate}
                    style={{
                      marginTop: 20,
                      padding: "12px 24px",
                      background: "white",
                      color: "black",
                      fontWeight: 700,
                      borderRadius: 10,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    Download Purity Certificate
                  </button>
                </div>

                {/* Safety Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))",
                    gap: 18,
                  }}
                >
                  <div style={smallCard}>
                    <div style={{ fontSize: "2rem" }}>🧪</div>
                    <h3 style={{ fontWeight: 600 }}>Microbiological Safety</h3>
                    <p>No harmful bacteria detected.</p>
                  </div>

                  <div style={smallCard}>
                    <div style={{ fontSize: "2rem" }}>⚗️</div>
                    <h3 style={{ fontWeight: 600 }}>Chemical Safety</h3>
                    <p>Meets BIS limits for all chemical parameters.</p>
                  </div>

                  <div style={smallCard}>
                    <div style={{ fontSize: "2rem" }}>🔄</div>
                    <h3 style={{ fontWeight: 600 }}>Purification</h3>
                    <p>RO + UV + UF + Ozonation process.</p>
                  </div>

                  <div style={smallCard}>
                    <div style={{ fontSize: "2rem" }}>🪨</div>
                    <h3 style={{ fontWeight: 600 }}>Mineral Balance</h3>
                    <p>Essential minerals preserved.</p>
                  </div>
                </div>

                <div style={card}>
                  <h2 style={sectionTitle}>Our Purity Promise</h2>
                  <p>
                    Every OxyHydra bottle undergoes strict physical, chemical, and
                    microbiological testing before dispatch.
                  </p>
                  <p>
                    We follow BIS-approved standards and internal QA protocols to
                    keep every batch consistent and safe.
                  </p>

                  <a href="mailto:quality@oxyhydra.com">
                    <button
                      style={{
                        marginTop: 16,
                        padding: "12px 24px",
                        borderRadius: 10,
                        border: "1px solid white",
                        background: "transparent",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Contact Quality Team
                    </button>
                  </a>
                </div>
              </>
            )}
          </div>
        </main>
      </BackgroundWrapper>
    </>
  );
}
