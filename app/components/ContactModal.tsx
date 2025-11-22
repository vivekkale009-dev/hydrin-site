"use client";
import { useState } from "react";

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.email || !form.category) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      // Save to Sheet
      const res = await fetch("/api/save-sheet", {
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

      // Send Mail if complaint
      if (form.category === "Complaint") {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      alert("Submitted successfully!");
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
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "600px",
          background: "white",
          borderRadius: "14px",
          padding: "30px",
          boxShadow: "0 4px 30px rgba(0,0,0,0.2)",
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

          <input
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={input}
          />

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

          {/* BUTTON ROW */}
          <div
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

            {/* WHATSAPP BUTTON */}
           <a
  href={`https://wa.me/917666303769?text=${encodeURIComponent(
    `Hi OxyHydra,

Name: ${form.name}
Category: ${form.category}
Phone: ${form.phone}
Email: ${form.email}

Message:
${form.message || "No message provided"}`
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
