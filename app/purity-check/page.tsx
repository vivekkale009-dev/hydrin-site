"use client";

import { useState, type CSSProperties, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import BackgroundWrapper from "../components/BackgroundWrapper";
import Script from "next/script"; // for reCAPTCHA
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { getDeviceType, getBrowser } from "@/utils/device";
import { getFingerprint } from "@/utils/fingerprint";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==== STATIC VALUES ====
const STATIC_PLANT = "Gut N0 253 Earthy Source Foods And Beverages Khairi nimgaon Shrirampur, Ahilyanagar";
const STATIC_LICENSE = "12345678901234";
const STATIC_FSSAI = "12345678901234";
const SUPPORT_EMAIL = "support@earthysource.in";
const SUPPORT_WHATSAPP = "7758877307";

export default function PurityCheck() {
  const [batch, setBatch] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFake, setIsFake] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    getFingerprint()
      .then((fp) => setFingerprint(fp as string))
      .catch(() => setFingerprint(""));
  }, []);

  async function handleVerify() {
    setError("");
    setData(null);
    setIsFake(false);
    setIsExpired(false);
    setLoading(true);

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      setError("reCAPTCHA sitekey not configured on server.");
      setLoading(false);
      return;
    }

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

    let ip = "unknown";
    let geo: any = { country: null, state: null, city: null, isp: null, latitude: null, longitude: null, pincode: null };

    try {
      const g = await fetch("/api/get-ip-geo").then((r) => r.json());
      ip = g.ip || "unknown";
      const raw = g.geo || {};
      geo = {
        country: raw.country ?? null,
        state: raw.state ?? raw.region ?? null,
        city: raw.city ?? null,
        isp: raw.isp ?? raw.connection?.isp ?? null,
        latitude: raw.latitude ?? null,
        longitude: raw.longitude ?? null,
        pincode: raw.postal ?? raw.pincode ?? null,
      };
    } catch (e) {
      console.warn("Geo lookup failed", e);
    }

    const deviceType = getDeviceType();
    const browser = getBrowser();

    try {
      const { data: blocked } = await supabase
        .from("blocked_ips")
        .select("*")
        .eq("ip_address", ip)
        .eq("is_blocked", true)
        .maybeSingle();

      if (blocked) {
        setError("Too many suspicious scans detected from your network. Please contact support.");
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Blocked IP check failed", e);
    }

    if (!batch.trim()) {
      setError("Please enter batch number.");
      setLoading(false);
      return;
    }

    const normalizedBatch = batch.trim().toUpperCase();

    const { data: batchData, error: fetchError } = await supabase
      .from("batches")
      .select("*")
      .eq("batch_code", normalizedBatch)
      .maybeSingle();

    if (fetchError) {
      setError("Database error. Try again.");
      setLoading(false);
      return;
    }

    let isFirstScan: boolean | null = null;
    try {
      if (fingerprint) {
        const { data: existing, error: existingErr } = await supabase
          .from("scans")
          .select("id")
          .eq("batch_code", normalizedBatch)
          .eq("fingerprint", fingerprint)
          .limit(1);
        if (!existingErr) isFirstScan = !existing || existing.length === 0;
      }
    } catch (e) {
      console.warn("first_scan check failed", e);
    }

    if (!batchData) {
      setIsFake(true);
      await supabase.from("scans").insert({
        batch_code: normalizedBatch, status: "fake", ip_address: ip, country: geo.country,
        state: geo.state, city: geo.city, isp: geo.isp, latitude: geo.latitude,
        longitude: geo.longitude, pincode: geo.pincode, device_type: deviceType,
        browser, fingerprint: fingerprint || null, first_scan: isFirstScan,
      });
      setLoading(false);
      return;
    }

    const today = new Date();
    const expiry = new Date(batchData.expiry_date);
    if (expiry < today) {
      setIsExpired(true);
      await supabase.from("scans").insert({
        batch_code: normalizedBatch, status: "expired", ip_address: ip, country: geo.country,
        state: geo.state, city: geo.city, isp: geo.isp, latitude: geo.latitude,
        longitude: geo.longitude, pincode: geo.pincode, device_type: deviceType,
        browser, fingerprint: fingerprint || null, first_scan: isFirstScan,
      });
      setLoading(false);
      return;
    }

    setData(batchData);
    await supabase.from("scans").insert({
      batch_code: normalizedBatch, status: batchData.status.toLowerCase(), ip_address: ip, country: geo.country,
      state: geo.state, city: geo.city, isp: geo.isp, latitude: geo.latitude,
      longitude: geo.longitude, pincode: geo.pincode, device_type: deviceType,
      browser, fingerprint: fingerprint || null, first_scan: isFirstScan,
    });
    setLoading(false);
  }

  const downloadCertificate = () => {
    if (!data) return;
    const doc = new jsPDF("p", "pt", "a4");

    const isSafetyAlert = data.status === "FAILED" || data.status === "PENDING";
    const phRange = data.ph_value ? `${(data.ph_value - 0.5).toFixed(1)} - ${(data.ph_value + 0.5).toFixed(1)}` : "6.5 - 8.5 (Standard)";
    const tdsRange = data.tds_value ? `${data.tds_value - 5} - ${data.tds_value + 5} mg/L` : "70 - 120 mg/L";

    try {
      doc.addImage("/EarthyLogo.JPG", "JPEG", 40, 15, 40, 40); 
    } catch (e) {
      console.warn("Header logo not found");
    }

    const primaryColor: [number, number, number] = isSafetyAlert ? [185, 28, 28] : [10, 108, 255];

    doc.setFillColor(...primaryColor);
    doc.rect(90, 10, 465, 50, "F");  
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(isSafetyAlert ? "QUALITY ADVISORY / RECALL NOTICE" : "PURITY VERIFICATION CERTIFICATE", 110, 42);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("EARTHY SOURCE", 40, 85);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(["Foods and Beverages", STATIC_PLANT, `FSSAI: ${STATIC_FSSAI}`, `License: ${STATIC_LICENSE}`], 40, 100);

    autoTable(doc, {
      startY: 160,
      margin: { left: 40, right: 40 },
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: 50, fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
      head: [["Attribute", "Batch Details"]],
      body: [
        ["Product Name", data.product_name || "Packaged Drinking Water"],
        ["Batch Number", data.batch_code],
        ["Manufacturing Date", data.production_date],
        ["Expiry Date", data.expiry_date],
        ["Net Quantity", data.net_quantity],
        ["pH Level (Range)", phRange],
        ["TDS Level (Range)", tdsRange],
        ["Product Status", isSafetyAlert ? `ALERT: ${data.status}` : "PASSED / QUALITY CHECKED"],
        ["Standard Compliance", "BIS IS 14543"],
      ],
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 400;
    const footerY = finalY + 40;

    if (isSafetyAlert) {
      doc.setFontSize(12);
      doc.setTextColor(185, 28, 28);
      doc.setFont("helvetica", "bold");
      doc.text("IMPORTANT SAFETY NOTICE:", 40, footerY);
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.text([
        "This batch has not cleared our final quality check protocols.",
        "1. DO NOT CONSUME this bottle.",
        "2. Please contact support immediately for a replacement.",
        `Support Email: ${SUPPORT_EMAIL}`
      ], 40, footerY + 20);
    } else {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Quality Assurance Declaration", 40, footerY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text("This certificate confirms that the mentioned batch has passed all physical, chemical, and microbiological tests in accordance with national safety standards for packaged drinking water. For any issue related to product please contact us at support@earthysource.in", 40, footerY + 20, { maxWidth: 380 });
    }

    try {
      if (!isSafetyAlert) doc.addImage("/OxyHydraQualityCheck.png", "PNG", 430, footerY - 10, 100, 100);
    } catch (e) {}

    doc.setDrawColor(200);
    doc.line(40, 780, 555, 780);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Digital Verification Hash: ${data.id.substring(0,8)}...`, 40, 800);
    doc.save(`EarthySource-Status-${data.batch_code}.pdf`);
  };

  const page: CSSProperties = { padding: "60px 20px", minHeight: "100vh", color: "white" };
  const inner: CSSProperties = { maxWidth: "900px", margin: "0 auto" };
  const title: CSSProperties = { fontSize: "3rem", fontWeight: 800, marginBottom: "20px" };
  const subtitle: CSSProperties = { fontSize: "1.1rem", marginBottom: "20px", maxWidth: "520px" };
  const inputRow: CSSProperties = { display: "flex", gap: "12px", flexWrap: "wrap" };
  const inputStyle: CSSProperties = { padding: "14px 18px", width: "300px", background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.75)", borderRadius: "10px", color: "white" };
  const verifyButton: CSSProperties = { padding: "14px 28px", borderRadius: "10px", background: "white", color: "black", cursor: "pointer", border: "none", fontWeight: 700 };
  const card: CSSProperties = { background: "rgba(0,0,0,0.55)", padding: "30px", borderRadius: "20px", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.18)", marginBottom: "25px" };
  const alertCard: CSSProperties = { background: "rgba(185, 28, 28, 0.8)", padding: "30px", borderRadius: "20px", backdropFilter: "blur(20px)", border: "2px solid #ef4444", marginBottom: "25px" };
  const smallCard: CSSProperties = { background: "rgba(0,0,0,0.55)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.18)" };
  const sectionTitle: CSSProperties = { fontSize: "1.6rem", fontWeight: 700, marginBottom: "10px" };

  return (
    <>
      <Script src="https://www.google.com/recaptcha/api.js" />
      <BackgroundWrapper backgroundStyle={{ backgroundImage: "url('/new-bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        <main style={{ ...page, padding: "0" }}>
          <div style={{ width: "100%", background: "rgba(248, 248, 255, 0.95)", backdropFilter: "blur(10px)", padding: "15px 0", borderBottom: "1px solid #ddd", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: "900px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px" }}>
              <a href="/" style={{ display: "flex", alignItems: "center", gap: "15px", textDecoration: "none" }}>
                <img src="/EarthyLogo.JPG" alt="Earthy Source" style={{ height: "100px", width: "auto" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "Green", fontWeight: 800, fontSize: "1.8rem", lineHeight: 1 }}>Earthy Source</span>
                  <span style={{ color: "#444", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "1px" }}>FOODS AND BEVERAGES</span>
                </div>
              </a>
              <a href="/" style={{ color: "#0A6CFF", textDecoration: "none", fontSize: "0.9rem", fontWeight: 700, border: "2px solid #0A6CFF", padding: "8px 20px", borderRadius: "50px" }}>Home Page</a>
            </div>
          </div>

          <div style={{ ...inner, padding: "60px 20px" }}>
            <h1 style={title}>Earthy Source Purity Check</h1>
            <p style={subtitle}>Verify your bottle using the batch number printed on the label.</p>

            <div style={inputRow}>
              <input style={inputStyle} placeholder="Enter batch number" value={batch} onChange={(e) => setBatch(e.target.value)} />
              <button style={verifyButton} onClick={handleVerify}>{loading ? "Checking..." : "Verify"}</button>
            </div>

            <div style={{ marginTop: 20 }}><div className="g-recaptcha" data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}></div></div>
            {error && <p style={{ color: "#ff6b6b", marginTop: 8 }}>{error}</p>}

            {isFake && (
              <div style={card}>
                <h2 style={{ ...sectionTitle, color: "#ff6b6b" }}>Fake / Invalid Bottle ❌</h2>
                <p>This batch number is not present in Earthy’s secure database. Please check the code again or contact our team.</p>
              </div>
            )}

            {isExpired && (
              <div style={card}>
                <h2 style={{ ...sectionTitle, color: "#ff6b6b" }}>Bottle Expired ❌</h2>
                <p>This bottle has passed its expiry date and should not be consumed.</p>
                <a href={`mailto:${SUPPORT_EMAIL}`}><button style={{ marginTop: 16, padding: "12px 24px", borderRadius: 10, border: "1px solid white", background: "transparent", color: "white", cursor: "pointer", fontWeight: 600 }}>Contact Support</button></a>
              </div>
            )}

            {data && !isExpired && (
              <>
                {(data.status === "FAILED" || data.status === "PENDING") ? (
                    <div style={alertCard}>
                        <h2 style={{ ...sectionTitle, color: "white" }}>Quality Alert: Do Not Consume ⚠️</h2>
                        <p style={{ fontSize: "1.1rem", marginBottom: "15px" }}>This batch (<strong>{data.batch_code}</strong>) is currently marked as <strong>{data.status}</strong>.</p>
                        <p>Please do not consume this water. For your safety, contact us immediately for a replacement.</p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ textDecoration: 'none' }}>
                                <button style={{ padding: "12px 20px", borderRadius: "8px", background: "white", color: "black", border: "none", fontWeight: 700, cursor: "pointer" }}>Email Support</button>
                            </a>
                            <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" style={{ textDecoration: 'none' }}>
                                <button style={{ padding: "12px 20px", borderRadius: "8px", background: "#25D366", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}>WhatsApp Us</button>
                            </a>
                        </div>
                        <button onClick={downloadCertificate} style={{ marginTop: "15px", background: "transparent", border: "1px solid white", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>Download Advisory PDF</button>
                    </div>
                ) : (
                    <div style={card}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h2 style={sectionTitle}>Bottle Verified</h2>
                        <img src="/VerifiedTick.png" alt="verified" style={{ width: "32px", height: "32px" }} />
                        </div>
                        <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#4ade80", marginBottom: "10px" }}>{data.product_name}</p>
                        <p>Authentic and safe for consumption.</p>
                        <p><strong>Batch:</strong> {data.batch_code}</p>
                        <p><strong>Net Quantity:</strong> {data.net_quantity}</p>
                        <p><strong>Manufactured:</strong> {data.production_date}</p>
                        <p><strong>Expires:</strong> {data.expiry_date}</p>
                        <p><strong>Status:</strong> {data.status}</p>
                        <p style={{ marginTop: "10px" }}>✔ Batch verified from Earthy Source database</p>
                        <button onClick={downloadCertificate} style={{ marginTop: 20, padding: "12px 24px", background: "white", color: "black", fontWeight: 700, borderRadius: 10, cursor: "pointer", border: "none" }}>Download Purity Certificate</button>
                    </div>
                )}

                {data.status === "PASSED" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 18 }}>
                  <div style={smallCard}>
                    <div style={{ fontSize: "2rem" }}>🧪</div>
                    <h3 style={{ fontWeight: 600 }}>Microbiological Safety</h3>
                    <p>No harmful bacteria detected.</p>
                  </div>

                  <div style={smallCard}>
                    <div style={{ fontSize: "2rem" }}>⚗️</div>
                    <h3 style={{ fontWeight: 600 }}>Chemical Safety</h3>
                    <p>pH Range: {data.ph_value ? `${(data.ph_value - 0.5).toFixed(1)} - ${(data.ph_value + 0.5).toFixed(1)}` : '6.5 - 8.5'}</p>
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
                    <p>TDS Range: {data.tds_value ? `${data.tds_value - 5} - ${data.tds_value + 5} mg/L` : '70 - 120 mg/L'}</p>
                    <p>Essential minerals preserved.</p>
                  </div>
                </div>
                )}

                <div style={card}>
                  <h2 style={sectionTitle}>Our Purity Promise</h2>
                  <p>Every Earthy bottle undergoes strict physical, chemical, and microbiological testing before dispatch.</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`}><button style={{ marginTop: 16, padding: "12px 24px", borderRadius: 10, border: "1px solid white", background: "transparent", color: "white", cursor: "pointer", fontWeight: 600 }}>Contact Quality Team</button></a>
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: "50px", textAlign: "center", padding: "40px", background: "linear-gradient(135deg, rgba(10,108,255,0.2) 0%, rgba(0,0,0,0.4) 100%)", borderRadius: "20px", border: "1px solid rgba(10,108,255,0.3)" }}>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Pure Water is just the beginning.</h3>
            <p style={{ color: "#ccc", marginBottom: "20px" }}>Discover our mission to bring sustainable, earth-friendly hydration to everyone.</p>
            <a href="/"><button style={{ padding: "12px 30px", borderRadius: "30px", background: "#0A6CFF", color: "white", border: "none", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(10,108,255,0.4)" }}>Explore Earthy Source</button></a>
          </div>
        </main>
      </BackgroundWrapper>
    </>
  );
}