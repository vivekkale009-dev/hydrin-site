"use client";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

export default function CareerAdmin() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs");
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data.slice(1));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  // --- ACTIONS ---

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Frozen" : "Active";
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, newStatus }),
    });
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Delete this job?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33"
    });
    if (confirm.isConfirmed) {
      await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchJobs();
    }
  };

  // --- UNIVERSAL FORM (Used for Add and Edit) ---
  const openJobForm = async (existingJob?: any) => {
    const isEdit = !!existingJob;
    
    const { value: formValues } = await Swal.fire({
      title: isEdit ? 'Edit Position' : 'Post New Opening',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; padding: 0 10px;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; color: #444;">Job Title</label>
            <input id="j-title" class="swal2-input" value="${isEdit ? existingJob[1] : ''}" style="width: 100%; margin: 0; height: 40px;">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; color: #444;">Location</label>
            <input id="j-loc" class="swal2-input" value="${isEdit ? existingJob[2] : ''}" style="width: 100%; margin: 0; height: 40px;">
          </div>
          <div style="display: flex; gap: 15px;">
            <div style="flex: 1;">
              <label style="font-size: 0.85rem; font-weight: 600; color: #444;">Type</label>
              <select id="j-type" class="swal2-input" style="width: 100%; margin: 0; height: 40px;">
                <option value="Full-Time" ${isEdit && existingJob[3] === 'Full-Time' ? 'selected' : ''}>Full-Time</option>
                <option value="Contract" ${isEdit && existingJob[3] === 'Contract' ? 'selected' : ''}>Contract</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="font-size: 0.85rem; font-weight: 600; color: #444;">Education</label>
              <input id="j-edu" class="swal2-input" value="${isEdit ? (existingJob[6] || '') : ''}" style="width: 100%; margin: 0; height: 40px;">
            </div>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; color: #444;">Description</label>
            <textarea id="j-desc" class="swal2-textarea" style="width: 100%; margin: 0; height: 100px; padding: 10px;">${isEdit ? (existingJob[5] || '') : ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      width: '550px',
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Update Position' : 'Post Position',
      confirmButtonColor: '#166534',
      preConfirm: () => {
        return {
          title: (document.getElementById('j-title') as HTMLInputElement).value,
          location: (document.getElementById('j-loc') as HTMLInputElement).value,
          type: (document.getElementById('j-type') as HTMLSelectElement).value,
          education: (document.getElementById('j-edu') as HTMLInputElement).value,
          description: (document.getElementById('j-desc') as HTMLTextAreaElement).value,
        }
      }
    });

    if (formValues) {
      const method = isEdit ? "PUT" : "POST"; // Use PUT for editing
      const payload = isEdit ? { ...formValues, id: existingJob[0], status: existingJob[4] } : { ...formValues, status: "Active" };

      const res = await fetch("/api/admin/jobs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Swal.fire("Success", isEdit ? "Updated!" : "Posted!", "success");
        fetchJobs();
      }
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", background: "#f8f9fa", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <h1>Career Management</h1>
        <button onClick={() => openJobForm()} style={{ background: "#166534", color: "#fff", padding: "12px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
          + Add New Position
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#111827", color: "#fff" }}>
            <tr>
              <th style={{ padding: "15px", textAlign: "left" }}>Job Title</th>
              <th>Location</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center" }}>Loading...</td></tr>
            ) : (
              jobs.map((job, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "15px", fontWeight: "600" }}>{job[1]}</td>
                  <td style={{ textAlign: "center" }}>{job[2]}</td>
                  <td style={{ textAlign: "center" }}>{job[3]}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", background: job[4] === "Active" ? "#dcfce7" : "#fee2e2", color: job[4] === "Active" ? "#166534" : "#991b1b", fontSize: "12px" }}>
                      {job[4]}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", padding: "15px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button onClick={() => openJobForm(job)} style={{ border: "1px solid #166534", background: "#fff", color: "#166534", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }}>✏️ Edit</button>
                      <button onClick={() => handleStatusChange(job[0], job[4])} style={{ border: "1px solid #ddd", background: "#fff", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }}>{job[4] === "Active" ? "❄️ Freeze" : "🔥 Unfreeze"}</button>
                      <button onClick={() => handleDelete(job[0])} style={{ border: "none", background: "#fee2e2", color: "#b91c1c", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }}>🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}