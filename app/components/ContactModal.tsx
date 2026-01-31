"use client";

import { useEffect, useState } from "react";

// Premium water-drop toast CSS
const toastStyles = `
  .oxy-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #00b4db, #0083b0);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 15px;
    box-shadow: 0 6px 25px rgba(0,0,0,0.25);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: dropIn 0.45s ease-out forwards;
  }

  /* --- MOBILE FIXES ADDED HERE --- */
  @media (max-width: 600px) {
    .responsive-button-row {
      flex-direction: column !important;
      gap: 10px !important;
    }
    .modal-container {
      padding: 20px !important;
      width: 95% !important;
    }
  }

  .oxy-drop {
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(255,255,255,0.7);
    animation: drip 1.4s infinite ease-in-out;
  }

  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes drip {
    0%   { transform: translateY(0px) }
    50%  { transform: translateY(5px) scale(0.9); }
    100% { transform: translateY(0px) }
  }
`;

// Inject CSS once
if (typeof window !== "undefined" && !document.getElementById("oxy-toast-style")) {
  const style = document.createElement("style");
  style.id = "oxy-toast-style";
  style.innerHTML = toastStyles;
  document.head.appendChild(style);
}

// Toast function
const oxyToast = (msg: string) => {
  const div = document.createElement("div");
  div.className = "oxy-toast";
  div.innerHTML = `<div class="oxy-drop"></div> ${msg}`;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(-10px)";
  }, 3000);
  setTimeout(() => div.remove(), 3500);
};

export default function ContactModal({ open, onClose }: any) {
  if (!open) return null;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    category: "",
    message: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const validateFields = () => {
    let valid = true;
    const errors: any = { email: "", phone: "" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      errors.email = "Enter a valid email format";
      valid = false;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phone)) {
      errors.phone = "Phone must be 10 digits";
      valid = false;
    }
    setFieldErrors(errors);
    return valid;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.email || !form.category) {
      setError("Please fill all required fields.");
      return;
    }
    if (!validateFields()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/save-to-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError("Sheet saving failed");
        setLoading(false);
        return;
      }
      if (form.category === "Complaint") {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      oxyToast("Submitted successfully!");
      setLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "15px", // Safety for mobile
      }}
    >
      <div
        className="modal-container"
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "white",
          borderRadius: "14px",
          padding: "30px",
          boxShadow: "0 4px 30px rgba(0,0,0,0.2)",
          maxHeight: "90vh", // ADDED: prevents cutoff on small screens
          overflowY: "auto", // ADDED: allows scrolling
        }}
      >
        <h2 style={{ marginBottom: "20px", fontSize: "1.6rem" }}>Contact Us</h2>

        {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <input
            placeholder="Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={input}
          />

          <input
            placeholder="Phone Number *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={input}
          />
          {fieldErrors.phone && (
            <p style={{ color: "red", fontSize: "0.85rem", marginTop: "-10px" }}>
              {fieldErrors.phone}
            </p>
          )}

          <input
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={input}
          />
          {fieldErrors.email && (
            <p style={{ color: "red", fontSize: "0.85rem", marginTop: "-10px" }}>
              {fieldErrors.email}
            </p>
          )}

          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={input}
          >
            <option value="">Select Category *</option>
            <option value="Complaint">Complaint</option>
            <option value="Inquiry">Inquiry</option>
            <option value="Suggestion">Suggestion</option>
          </select>

          <textarea
            placeholder="Message (Optional)"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            style={{ ...input, height: "100px" }}
          />

          {/* ADDED CLASSNAME FOR RESPONSIVE BEHAVIOR */}
          <div
            className="responsive-button-row" 
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "space-between",
              marginTop: "10px",
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "14px 0",
                background: "black",
                color: "white",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>

            <a
              href={`https://wa.me/917666303769?text=${encodeURIComponent(
                `Hi OxyHydra,\n\nName: ${form.name}\nCategory: ${form.category}\nPhone: ${form.phone}\nEmail: ${form.email}\n\nMessage:\n${form.message || "No message provided"}`
              )}`}
              target="_blank"
              style={{
                flex: 1,
                padding: "14px 0",
                background: "#25D366",
                color: "white",
                textAlign: "center",
                borderRadius: "8px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              WhatsApp
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px",
              background: "#dcdcdc",
              color: "#000",
              borderRadius: "10px",
              cursor: "pointer",
              border: "none",
            }}
          >
            Close
          </button>
        </form>
      </div>
    </div>
  );
}

const input = {
  padding: "12px 14px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "1rem",
};