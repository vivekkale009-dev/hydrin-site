"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

export default function CareersPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null); // Changed to store full job row
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = {
    primary: "#166534",
    secondary: "#111827",
    accent: "#059669",
    bg: "#fdfcf9"
  };

  // Fetch Jobs from API
  useEffect(() => {
    fetch("/api/admin/jobs")
      .then((res) => res.json())
      .then((data) => {
        // Filter for "Active" (index 4) and skip headers
        if (Array.isArray(data) && data.length > 1) {
          const activeJobs = data.slice(1).filter((row: any) => row[4] === "Active");
          setJobs(activeJobs);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading jobs:", err);
        setLoading(false);
      });
  }, []);

  // Show expanded job details in a popup
  const handleViewDetails = (job: any) => {
    Swal.fire({
      title: `<span style="color: ${colors.secondary}; font-weight: 800;">${job[1]}</span>`,
      html: `
        <div style="text-align: left; padding: 10px; font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 15px;">
            <span style="background: #f0fdf4; color: ${colors.accent}; padding: 4px 12px; borderRadius: 50px; font-size: 0.8rem; font-weight: 700;">${job[3]}</span>
            <span style="margin-left: 10px; color: #6b7280; font-size: 0.85rem;">📍 ${job[2]}</span>
          </div>
          <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 5px; color: ${colors.primary};">Education Required:</h4>
            <p style="color: #4b5563; margin: 0;">${job[6] || "Not specified"}</p>
          </div>
          <div>
            <h4 style="margin-bottom: 5px; color: ${colors.primary};">Description:</h4>
            <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${job[5] || "No description provided."}</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Apply for this position',
      cancelButtonText: 'Close',
      confirmButtonColor: colors.primary,
      width: '600px',
      borderRadius: '24px'
    }).then((result) => {
      if (result.isConfirmed) {
        setSelectedJob(job);
        setIsModalOpen(true);
      }
    });
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("role", selectedJob[1]); // Append the job title

    try {
      const res = await fetch("/api/careers", { method: "POST", body: formData });
      if (res.ok) {
        Swal.fire({
          title: "Application Received!",
          text: "The EarthySource team will review your profile shortly.",
          icon: "success",
          confirmButtonColor: colors.primary
        });
        setIsModalOpen(false);
        (e.target as HTMLFormElement).reset();
      } else {
        throw new Error();
      }
    } catch (err) {
      Swal.fire("Error", "The source is busy. Please try again later.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ backgroundColor: colors.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <nav style={{ padding: "20px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottom: "1px solid #eee" }}>
        <Link href="/" style={{ textDecoration: "none", color: colors.primary, fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
          ← Home
        </Link>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: colors.secondary }}>EARTHYSOURCE</div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ padding: "100px 5% 60px", textAlign: "center", background: "#fff" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 900, color: colors.secondary, marginBottom: "20px" }}>Flow With Us.</h1>
        <p style={{ color: "#6b7280", fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
          You aren't just looking for employment; you're joining a mission to reconnect the world with nature's purity. 
        </p>
      </section>

      {/* JOBS SECTION */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 100px" }}>
        <h2 style={{ fontSize: "1.8rem", color: colors.secondary, marginBottom: "40px" }}>Open Positions</h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: colors.primary }}>Loading opportunities...</div>
        ) : jobs.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "30px" }}>
            {jobs.map((job, i) => (
              <div key={i} className="job-card" style={{ background: "#fff", padding: "40px", borderRadius: "30px", border: "1px solid #e5e7eb", transition: "0.3s", display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <span style={{ background: "#f0fdf4", color: colors.accent, padding: "5px 15px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 700 }}>
                    {job[3]}
                  </span>
                  <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>📍 {job[2]}</span>
                </div>
                <h3 style={{ fontSize: "1.4rem", color: colors.secondary, marginBottom: "15px" }}>{job[1]}</h3>
                
                <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "25px", flex: 1 }}>
                  {job[5] ? job[5].substring(0, 100) + "..." : "Join our growing team..."}
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleViewDetails(job)}
                    style={{ flex: 1, padding: "14px", borderRadius: "14px", border: `2px solid ${colors.primary}`, background: "transparent", color: colors.primary, fontWeight: 700, cursor: "pointer" }}
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => { setSelectedJob(job); setIsModalOpen(true); }}
                    style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "none", background: colors.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "30px", border: "1px dashed #ccc" }}>
            <p style={{ color: "#6b7280" }}>We don't have any active openings right now. Check back soon!</p>
          </div>
        )}
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "40px", borderRadius: "32px", maxWidth: "500px", width: "90%", position: "relative" }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: "absolute", top: "25px", right: "25px", border: "none", background: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            
            <h2 style={{ fontSize: "1.8rem", color: colors.secondary, marginBottom: "8px" }}>Join the Source</h2>
            <p style={{ color: colors.accent, fontWeight: 700, marginBottom: "30px" }}>Applying for: {selectedJob?.[1]}</p>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <input name="name" type="text" placeholder="Your Full Name" required style={inputStyle} />
              <input name="email" type="email" placeholder="Your Email Address" required style={inputStyle} />
              <input name="phone" type="tel" placeholder="Phone Number" required style={inputStyle} />
              <div style={{ textAlign: "left" }}>
                <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: "8px" }}>Resume (PDF Only)</label>
                <input name="resume" type="file" accept=".pdf" required style={inputStyle} />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ background: colors.secondary, color: "#fff", padding: "18px", borderRadius: "16px", border: "none", fontWeight: 700, cursor: "pointer", marginTop: "10px" }}
              >
                {isSubmitting ? "Uploading Profile..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .job-card:hover { transform: translateY(-8px); border-color: ${colors.primary}; box-shadow: 0 15px 30px rgba(0,0,0,0.08); }
      `}} />
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "15px 20px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  fontSize: "1rem",
  outline: "none",
  backgroundColor: "#f9fafb"
};