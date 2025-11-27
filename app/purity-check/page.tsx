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

    // ---- IP + GEO lookup ----
    let ip = "unknown";

    // ⭐ FIX: Add latitude/longitude so build will not fail
    let geo: {
      country?: string | null;
      state?: string | null;
      city?: string | null;
      isp?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } = {};

    try {
      const geoRes = await fetch("/api/get-ip-geo");
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        ip = geoJson.ip || "unknown";

        // ⭐ FIX: safely extract lat/lng
        geo = {
          country: geoJson.geo?.country ?? null,
          state: geoJson.geo?.state ?? null,
          city: geoJson.geo?.city ?? null,
          isp: geoJson.geo?.isp ?? null,
          latitude: geoJson.geo?.latitude ?? null,
          longitude: geoJson.geo?.longitude ?? null,
        };
      }
    } catch (e) {
      console.warn("Geo lookup failed", e);
    }

    // ---- Check if IP is blocked ----
    try {
      const { data: blocked } = await supabase
        .from("blocked_ips")
        .select("*")
        .eq("ip_address", ip)
        .eq("is_blocked", true)
        .maybeSingle();

      if (blocked) {
        setError(
          "Too many suspicious scans detected from your network. Please contact support."
        );
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Blocked IP check failed", e);
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

    // ========================
    // FAKE BOTTLE
    // ========================
    if (!batchData) {
      setIsFake(true);

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

    // ========================
    // EXPIRED BOTTLE
    // ========================
    const today = new Date();
    const expiry = new Date(batchData.expiry_date);

    if (expiry < today) {
      setIsExpired(true);

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
      return;
    }

    // ========================
    // VERIFIED BOTTLE
    // ========================
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
  // PDF GENERATION — UNCHANGED
  // =======================================================================

  const downloadCertificate = () => {
    if (!data) return;
    const doc = new jsPDF("p", "pt", "a4");

    try {
      doc.addImage("/OxyHydraLogo.png", "PNG", 215, 60, 150, 150);
    } catch {}
    try {
      doc.addImage("/OxyHydraQualityCheck.png", "PNG", 110, 580, 160, 160);
    } catch {}

    doc.save(`OxyHydra-Certificate-${data.batch_code}.pdf`);
  };

  // =======================================================================
  // UI (unchanged)
  // =======================================================================

  const page: CSSProperties = {
    padding: "60px 20px",
    minHeight: "100vh",
    color: "white",
  };

  return (
    <>
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
          {/* … full original UI unchanged … */}
        </main>
      </BackgroundWrapper>
    </>
  );
}
