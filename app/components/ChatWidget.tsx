"use client";

import React, { useEffect, useRef, useState } from "react";

type Topic = "purity" | "products" | "dealership" | "complaint" | "other" | null;

const purityUrl = "/purity-check";
const complaintFormUrl = "/#contact"; // adjust if your complaint/contact section is elsewhere
const dealershipFormUrl = "/#contact";
const orderPageUrl = "/order"; // future order page
const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""; // optional

function playSound(name: "water-pop") {
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {
    // ignore sound failure
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [ended, setEnded] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const typingTimeout = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  function showTyping(ms = 800) {
    if (typingTimeout.current) {
      window.clearTimeout(typingTimeout.current);
    }
    setIsTyping(true);
    typingTimeout.current = window.setTimeout(() => {
      setIsTyping(false);
    }, ms);
  }

  function openWidget() {
    setIsOpen(true);
    setEnded(false);
    showTyping();
    playSound("water-pop");
  }

  function closeWidget() {
    setIsOpen(false);
    setTopic(null);
    setEnded(false);
    setError(null);
    setSuccess(null);
  }

  function handleEndChat() {
    setEnded(true);
    setTopic(null);
    setError(null);
    setSuccess("Chat ended. You can start again anytime.");
    setMessage("");
  }

  function handleTopicSelect(t: Topic) {
    setTopic(t);
    setError(null);
    setSuccess(null);
    showTyping();

    // quick “auto answers” for basic FAQ-style flows
    if (t === "purity") {
      setMessage(
        `I want to check purity of my bottle. Please help.\n\n(Website Purity Check: ${window.location.origin}${purityUrl})`
      );
    } else if (t === "products") {
      setMessage(
        "I want product details.\n\nWe currently offer 1L, 500ml, and 250ml premium OxyHydra bottles."
      );
    } else if (t === "dealership") {
      setMessage(
        "I am interested in OxyHydra dealership. Please share further details."
      );
    } else if (t === "complaint") {
      setMessage(
        "I want to raise a complaint regarding OxyHydra product/service."
      );
    } else {
      setMessage("");
    }

    // small scroll nudge
    if (bodyRef.current) {
      setTimeout(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
      }, 100);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !phone.trim() || !email.trim() || !message.trim()) {
      setError("Please fill Name, Phone, Email and Message.");
      return;
    }

    setSending(true);
    showTyping(1200);

    try {
      const res = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
  throw new Error(json.error || "Failed to save. Try again.");
}


      playSound("water-pop");
      setSuccess("Thanks! We’ve received your details. Our team will contact you.");
      setEnded(true);

      // Optional WhatsApp auto-forward
      if (whatsappNumber) {
        const topicLabel =
          topic === "purity"
            ? "Purity Check"
            : topic === "products"
            ? "Product Details"
            : topic === "dealership"
            ? "Dealership"
            : topic === "complaint"
            ? "Complaint"
            : "Other / General";

        const waText = encodeURIComponent(
          `New OxyHydra chat query:\n\nTopic: ${topicLabel}\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}\n\nSource: Website chat widget`
        );

        window.open(`https://wa.me/${whatsappNumber}?text=${waText}`, "_blank");
      }

      // clear only message, keep name/phone/email for convenience
      setMessage("");
    } catch (err: any) {
      console.error("Chat submit error:", err);
      setError("Could not send. Please try again in a moment.");
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  }

  // clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        window.clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  const topicLabel =
    topic === "purity"
      ? "Purity Check"
      : topic === "products"
      ? "Product Details"
      : topic === "dealership"
      ? "Dealership"
      : topic === "complaint"
      ? "Complaint"
      : topic === "other"
      ? "Other / General"
      : "-";

  return (
    <>
      {/* Floating mascot button */}
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {/* Hint text */}
        {!isOpen && (
          <div
            style={{
              background: "#ffffff",
              color: "#0f172a",
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: "0.8rem",
              boxShadow: "0 8px 20px rgba(15,23,42,0.4)",
            }}
          >
            Oxy – need any help?
          </div>
        )}

        {/* Water-drop mascot */}
        <button
          type="button"
          onClick={() => {
            if (!isOpen) openWidget();
            else closeWidget();
          }}
          aria-label="Open OxyHydra chat assistant"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <div className="oxy-mascot">
            <div className="oxy-drop">
              <div className="oxy-face">
                <div className="oxy-eye oxy-eye-left">
                  <div className="oxy-pupil" />
                </div>
                <div className="oxy-eye oxy-eye-right">
                  <div className="oxy-pupil" />
                </div>
                <div className="oxy-mouth" />
                <div className="oxy-sweat" />
              </div>
              <div className="oxy-hand oxy-hand-left" />
              <div className="oxy-hand oxy-hand-right" />
              <div className="oxy-leg oxy-leg-left" />
              <div className="oxy-leg oxy-leg-right" />
            </div>
          </div>
        </button>
      </div>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 100,
            width: 340,
            maxWidth: "90vw",
            height: 480,
            maxHeight: "70vh",
            background: "#f9fafb",
            borderRadius: 16,
            boxShadow: "0 18px 40px rgba(15,23,42,0.55)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(15,23,42,0.15)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background:
                "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 40%, #22c55e 100%)",
              padding: "10px 14px",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                Oxy – Water Drop Assistant
              </div>
              <div style={{ fontSize: "0.78rem", opacity: 0.9 }}>
                “May I help you?” 💧
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={handleEndChat}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(15,23,42,0.15)",
                  color: "white",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                End
              </button>
              <button
                type="button"
                onClick={closeWidget}
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(15,23,42,0.25)",
                  color: "white",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            ref={bodyRef}
            style={{
              flex: 1,
              padding: "10px 12px",
              overflowY: "auto",
              background:
                "linear-gradient(180deg, #f9fafb 0%, #e5f7ff 40%, #f9fafb 100%)",
            }}
          >
            {/* Quick options */}
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  marginBottom: 6,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Choose an option:
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleTopicSelect("purity")}
                  className="oxy-pill-btn"
                >
                  Check Purity
                </button>
                <button
                  type="button"
                  onClick={() => handleTopicSelect("products")}
                  className="oxy-pill-btn"
                >
                  Product Details
                </button>
                <button
                  type="button"
                  onClick={() => handleTopicSelect("dealership")}
                  className="oxy-pill-btn"
                >
                  Dealership
                </button>
                <button
                  type="button"
                  onClick={() => handleTopicSelect("complaint")}
                  className="oxy-pill-btn oxy-pill-warning"
                >
                  Complaint
                </button>
                <button
                  type="button"
                  onClick={() => handleTopicSelect("other")}
                  className="oxy-pill-btn"
                >
                  Other
                </button>
              </div>
            </div>

            {/* Helper text */}
            <div
              style={{
                fontSize: "0.78rem",
                marginBottom: 8,
                color: "#0f172a",
              }}
            >
              Share your details & query. We’ll contact you back.
            </div>

            {/* Typing indicator */}
            {isTyping && !sending && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.05)",
                  fontSize: "0.75rem",
                  color: "#0f172a",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    background: "#0ea5e9",
                    animation: "oxy-dot-bounce 1s infinite",
                  }}
                />
                <span className="oxy-typing-dots">
                  Oxy is typing
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            )}

            {error && (
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#b91c1c",
                  marginBottom: 6,
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#15803d",
                  marginBottom: 6,
                }}
              >
                {success}
              </div>
            )}

            {/* Topic info */}
            <div
              style={{
                fontSize: "0.75rem",
                marginBottom: 8,
                color: "#475569",
              }}
            >
              <strong>Selected topic:</strong> {topicLabel}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="oxy-input"
              />
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="oxy-input"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="oxy-input"
              />
              <textarea
                placeholder="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={3}
                className="oxy-input oxy-textarea"
              />
              <button
                type="submit"
                disabled={sending}
                className="oxy-send-btn"
              >
                {sending ? "Sending..." : ended ? "Send Again" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scoped styles for mascot + widget */}
      <style jsx>{`
        .oxy-mascot {
          width: 71px;
          height: 72px;
          position: relative;

        }

        .oxy-drop {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 30% 30%, #a5f3fc 0%, #06b6d4 35%, #0284c7 100%);
          border-radius: 50% 50% 55% 55%;
          position: relative;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.6);
          overflow: visible;
          animation: oxy-bounce 2.6s ease-in-out infinite,
            oxy-look-around 6s ease-in-out infinite;
        }

        .oxy-face {
          position: absolute;
          inset: 18% 14% 22% 14%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .oxy-eye {
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 999px;
          margin: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.15);
          position: relative;
          animation: oxy-blink 4s infinite;
        }

        .oxy-pupil {
          width: 10px;
          height: 10px;
          background: radial-gradient(circle at 30% 30%, #facc15 0%, #0f172a 45%, #020617 100%);
          border-radius: 999px;
          transform: translateX(1px);
        }

        .oxy-mouth {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 26px;
          height: 16px;
          background: #0f172a;
          border-radius: 0 0 999px 999px;
          overflow: hidden;
        }

        .oxy-mouth::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 8px;
          background: #ef4444;
          border-radius: 999px;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
        }

        .oxy-sweat {
          position: absolute;
          top: -4px;
          right: 6px;
          width: 8px;
          height: 12px;
          background: radial-gradient(circle at 30% 30%, #e0f2fe 0%, #38bdf8 60%, #0ea5e9 100%);
          border-radius: 999px;
          opacity: 0;
          animation: oxy-sweat 6s ease-in-out infinite;
        }

        .oxy-hand {
          position: absolute;
          top: 40%;
          width: 12px;
          height: 24px;
          border-radius: 999px;
          background: #0ea5e9;
          transform-origin: top center;
        }

        .oxy-hand-left {
          left: -4px;
          transform: rotate(30deg);
          animation: oxy-wave-left 2.3s ease-in-out infinite;
        }

        .oxy-hand-right {
          right: -4px;
          transform: rotate(-40deg);
          animation: oxy-wave-right 3s ease-in-out infinite;
        }

        .oxy-leg {
          position: absolute;
          bottom: -10px;
          width: 10px;
          height: 18px;
          border-radius: 999px;
          background: #0f172a;
        }

        .oxy-leg-left {
          left: 20px;
          animation: oxy-step 2.4s ease-in-out infinite;
        }

        .oxy-leg-right {
          right: 20px;
          animation: oxy-step 2.4s ease-in-out infinite 0.3s;
        }

        .oxy-pill-btn {
          border: none;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.78rem;
          background: #e0f2fe;
          color: #0f172a;
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(148, 163, 184, 0.4);
          white-space: nowrap;
        }

        .oxy-pill-btn:hover {
          background: #bae6fd;
        }

        .oxy-pill-warning {
          background: #fee2e2;
          color: #b91c1c;
        }

        .oxy-pill-warning:hover {
          background: #fecaca;
        }

        .oxy-input {
          width: 100%;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.8);
          marginBottom: 6px;
          margin-bottom: 6px;
          fontSize: 0.8rem;
          font-size: 0.8rem;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
        }

        .oxy-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.2);
        }

        .oxy-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .oxy-send-btn {
          width: 100%;
          padding: 8px 10px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #0ea5e9, #22c55e);
          color: white;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
          margin-top: 4px;
          box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
        }

        .oxy-send-btn:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .oxy-typing-dots span {
          display: inline-block;
          animation: oxy-typing 1.2s infinite;
        }

        .oxy-typing-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .oxy-typing-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes oxy-bounce {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          40% {
            transform: translateY(-6px) scale(1.02);
          }
        }

        @keyframes oxy-blink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }
          94%,
          96% {
            transform: scaleY(0.2);
          }
        }

        @keyframes oxy-wave-left {
          0%,
          100% {
            transform: rotate(30deg);
          }
          40% {
            transform: rotate(5deg);
          }
        }

        @keyframes oxy-wave-right {
          0%,
          100% {
            transform: rotate(-40deg);
          }
          50% {
            transform: rotate(-10deg);
          }
        }

        @keyframes oxy-step {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(2px);
          }
        }

        @keyframes oxy-dot-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes oxy-typing {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes oxy-look-around {
          0%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateX(-2px);
          }
          60% {
            transform: translateX(2px);
          }
        }

        @keyframes oxy-sweat {
          0%,
          70% {
            opacity: 0;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(-2px);
          }
          90% {
            opacity: 0;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
