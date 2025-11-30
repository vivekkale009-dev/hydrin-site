// app/components/Hero.tsx

"use client";
import Image from "next/image";

export default function Hero() {
  const scrollToLearn = () => {
    const el = document.getElementById("learn");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
   <section
  style={{
    width: "100vw",
    height: "100vh",
    backgroundImage: "url('/hero-deep.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8%",
    overflow: "hidden",      // IMPORTANT fix for white strip
  }}
>

      {/* LEFT SIDE CONTENT */}
      <div
        style={{
          maxWidth: "480px",
          color: "white",
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
            marginBottom: "30px",
          }}
        >
          Naturally filtered. Bottled with care. Verified instantly.
        </p>

        <div style={{ display: "flex", gap: "16px" }}>
          <a
            href="/purity-check"
            style={{
              padding: "14px 28px",
              background: "white",
              color: "#000",
              borderRadius: "8px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(255,255,255,0.4)",
            }}
          >
            Check Purity
          </a>

          <button
            onClick={scrollToLearn}
            style={{
              padding: "14px 28px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid white",
              color: "white",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Learn More
          </button>
        </div>
      </div>

      {/* RIGHT SIDE FLOATING BOTTLE */}
      <div
        style={{
          position: "relative",
          width: "350px",
          animation: "floatBottle 3s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes floatBottle {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-18px); }
            100% { transform: translateY(0px); }
          }
        `}</style>

        <Image
          src="/images/bottle.png"
          alt="OxyHydra Bottle"
          width={350}
          height={700}
          style={{
            objectFit: "contain",
            filter: "drop-shadow(0px 8px 25px rgba(0,0,0,0.45))",
          }}
        />
      </div>
    </section>
  );
}
