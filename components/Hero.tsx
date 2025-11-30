"use client";
import Image from "next/image";

export default function Hero() {
  const scrollToLearn = () => {
    const el = document.getElementById("learn");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero-wrapper">
      {/* Background layers (match homepage.css design) */}
      <div className="hero-bg layer-1"></div>
      <div className="hero-bg layer-2"></div>
      <div className="ripple-layer"></div>
      <div className="particles"></div>

      {/* LEFT SIDE TEXT SECTION */}
      <div className="hero-content">
        <h1 className="brand-name">Pure. Clean. OxyHydra.</h1>

        <p className="tagline">
          Naturally filtered. Bottled with care. Verified instantly.
        </p>

        {/* CTA BUTTONS from homepage.css */}
        <div className="cta-buttons">
          <a href="/purity-check" className="btn btn-primary">
            Check Purity
          </a>

          <a href="/order" className="btn btn-primary" style={{ background: "#0ea5e9", color: "#fff" }}>
            Place Order
          </a>

          <button onClick={scrollToLearn} className="btn btn-outline">
            Learn More
          </button>
        </div>
      </div>

      {/* RIGHT SIDE FLOATING BOTTLE */}
      <div className="bottle-wrapper">
        <div className="bottle-glow"></div>
        <div className="light-sweep"></div>

        <Image
          src="/images/bottle.png"
          alt="OxyHydra Bottle"
          width={380}
          height={1100}
          className="bottle-img"
        />
      </div>
    </section>
  );
}
