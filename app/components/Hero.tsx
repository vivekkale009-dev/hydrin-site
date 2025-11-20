// app/components/Hero.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layer1Ref = useRef<HTMLDivElement | null>(null);
  const layer2Ref = useRef<HTMLDivElement | null>(null);
  const bottleRef = useRef<HTMLImageElement | null>(null);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    // Fade in buttons shortly after mount
    const t = setTimeout(() => setButtonsVisible(true), 450);

    // Parallax: tied to scroll
    let rafId = 0;
    const onScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerY = window.innerHeight / 2;
      const distance = rect.top - centerY;
      // Normalize small range
      const factor = Math.max(-1, Math.min(1, distance / (window.innerHeight || 600)));

      if (layer1Ref.current) {
        // deeper layer moves less
        layer1Ref.current.style.transform = `translateY(${factor * 8}px)`;
      }
      if (layer2Ref.current) {
        // surface moves more
        layer2Ref.current.style.transform = `translateY(${factor * 18}px)`;
      }
      if (bottleRef.current) {
        // parallax for bottle (right side)
        bottleRef.current.style.transform = `translateY(${factor * 28}px) translateX(${Math.abs(factor) * 4}px)`;
      }
    };

    const onScrollRAF = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(onScroll);
    };

    window.addEventListener("scroll", onScrollRAF, { passive: true });
    window.addEventListener("resize", onScrollRAF);

    // initial call
    onScroll();

    return () => {
      clearTimeout(t);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollRAF);
      window.removeEventListener("resize", onScrollRAF);
    };
  }, []);

  return (
    <section className="hero-outer" ref={containerRef} aria-label="Hero">
      <div className="hero-layer layer-deep" ref={layer1Ref} />
      <div className="hero-layer layer-surface" ref={layer2Ref} />

      <div className="hero-content">
        <div className="hero-text">
          <h1 className="brand-title">OXYHYDRA</h1>
          <p className="tagline">Hydration That Breathes..!!</p>

          <div className={`hero-buttons ${buttonsVisible ? "visible" : ""}`}>
            <a className="btn btn-primary" href="/purity-check">Purity Check</a>
            <a className="btn btn-ghost" href="#learn">Learn More</a>
          </div>
        </div>

        <div className="hero-image-wrap" aria-hidden>
          <img
            ref={bottleRef}
            src="/images/bottle.png"
            alt="Hydrin bottle"
            className="hero-bottle"
            // the image should be approx 600px tall for desktop; CSS will handle scaling
          />
        </div>
      </div>
    </section>
  );
}
