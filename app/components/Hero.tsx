"use client";
import Image from "next/image";
import { useState } from "react";
import ContactModal from "./ContactModal";

export default function Hero() {
  const [openContact, setOpenContact] = useState(false);

  const scrollToLearn = () => {
    const el = document.getElementById("learn");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <ContactModal open={openContact} onClose={() => setOpenContact(false)} />

      <section
        style={{
          width: "100%",
          minHeight: "100vh",
          backgroundImage: "url('/images/hero-deep.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8%",
        }}
      >
        {/* LEFT SIDE */}
        <div
          style={{
            maxWidth: "480px",
            color: "white",
            textAlign: "left",
          }}
        >
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: 700,
              marginBottom: "20px",
              textShadow: "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            Pure. Clean. OxyHydra.
          </h1>

          <p
            style={{
              fontSize: "1.2rem",
              opacity: 0.9,
              marginBottom: "40px",
              lineHeight: 1.5,
            }}
          >
            Naturally filtered. Bottled with care. Verified instantly.
          </p>

          <div style={{ display: "flex", gap: "25px" }}>
            <a
              href="/purity-check"
              style={{
                padding: "14px 30px",
                background: "white",
                color: "#000",
                borderRadius: "10px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 3px 12px rgba(255,255,255,0.4)",
              }}
            >
              Check Purity
            </a>

            <button
              onClick={scrollToLearn}
              style={{
                padding: "14px 30px",
                background: "rgba(255,255,255,0.15)",
                border: "2px solid white",
                color: "white",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Learn More
            </button>

            {/* NEW CONTACT BUTTON */}
            <button
              onClick={() => setOpenContact(true)}
              style={{
                padding: "14px 30px",
                background: "#00c2ff",
                border: "2px solid white",
                color: "white",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Contact Us
            </button>
          </div>
        </div>

        {/* RIGHT SIDE BOTTLE */}
        <div
          style={{
            width: "350px",
            animation: "floatBottle 3s ease-in-out infinite",
          }}
        >
          <style>{`
            @keyframes floatBottle {
              0% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
              100% { transform: translateY(0); }
            }
          `}</style>

          <Image
            src="/images/bottle.png"
            alt="OxyHydra Bottle"
            width={350}
            height={700}
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0px 10px 30px rgba(0,0,0,0.45))",
            }}
          />
        </div>
      </section>
    </>
  );
}
