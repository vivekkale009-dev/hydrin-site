"use client";
import { useState } from "react";
import Image from "next/image";
import "./homepage.css";
// IMPORT YOUR COMPONENT HERE
import ContactModal from "./components/ContactModal"; 

export default function HomePage() {
  const [showContact, setShowContact] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const brands = {
    aqion: {
      name: "AQION Premium",
      desc: "Structured for maximum absorption with a perfect pH balance of 8.5+.",
    },
    sanjivani: {
      name: "Sai Sanjivani",
      desc: "Everyday hydration enriched with essential minerals for the whole family.",
    }
  };

  return (
    <main className="fresh-layout">
      {/* 1. TOP NAV */}
      <nav className="top-nav">
        <Image src="/EarthyLogo.JPG" alt="Earthy Source" width={300} height={120} priority style={{ objectFit: 'contain' }} />
        <div className="nav-links">
          <a href="/purity-check">Purity Check</a>
          <a href="/hydrasphere">HydraSphere</a>
          <a href="admin/login" className="admin-link">Staff Access</a>
          {/* TRIGGER THE MODAL */}
          <button onClick={() => setShowContact(true)} className="contact-trigger">Contact Us</button>
        </div>
      </nav>

      {/* 2. HERO */}
      <section className="hero-split">
        <div className="hero-content">
          <span className="badge">Welcome to Earthy Source</span>
          <h1 className="main-title">Intelligence in <br /><span className="text-green">Every Drop.</span></h1>
          <div className="hero-actions">
            <a href="/purity-check" className="btn-primary">Verify Your Batch</a>
            <a href="#brands" className="btn-secondary">Explore Our Brands</a>
          </div>
        </div>
        <div className="hero-visual"></div>
      </section>

      {/* 3. BRAND SECTION */}
      <section id="brands" className="brand-section">
        <h2 className="section-heading">Our Family of Brands</h2>
        <div className="brand-grid">
          <div className={`brand-card ${activeBrand === 'aqion' ? 'expanded' : ''}`} onClick={() => setActiveBrand(activeBrand === 'aqion' ? null : 'aqion')}>
             <div className="water-drop-icon"><svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg></div>
             <span className="brand-label">Premium Water</span>
             <h3>AQION</h3>
             {activeBrand === 'aqion' && (
               <div className="animate-slide-up info-reveal">
                  <p className="brand-info">{brands.aqion.desc}</p>
                  <div className="tag-list"><span>✓ pH 8.5+</span><span>✓ Structured</span></div>
               </div>
             )}
             <button className="view-more-pill">{activeBrand === 'aqion' ? 'Hide' : 'Details'}</button>
          </div>

          <div className={`brand-card ${activeBrand === 'sanjivani' ? 'expanded' : ''}`} onClick={() => setActiveBrand(activeBrand === 'sanjivani' ? null : 'sanjivani')}>
             <div className="water-drop-icon secondary"><svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg></div>
             <span className="brand-label">Standard Water</span>
             <h3>SAI SANJIVANI</h3>
             {activeBrand === 'sanjivani' && (
               <div className="animate-slide-up info-reveal">
                  <p className="brand-info">{brands.sanjivani.desc}</p>
                  <div className="tag-list"><span>✓ Natural</span><span>✓ Everyday</span></div>
               </div>
             )}
             <button className="view-more-pill">{activeBrand === 'sanjivani' ? 'Hide' : 'Details'}</button>
          </div>
        </div>
      </section>

      {/* 4. PREMIUM MODAL COMPONENT (CLEANER) */}
      <ContactModal 
        open={showContact} 
        onClose={() => setShowContact(false)} 
      />
    </main>
  );
}