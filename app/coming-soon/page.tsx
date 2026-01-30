"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import "../homepage.css";

export default function ComingSoonPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "" });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Hello Earthy Source, I'd like to join the Purity Ledger. Email: ${formData.email}, Phone: ${formData.phone}`;
    const whatsappUrl = `https://wa.me/7758877307?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    setIsModalOpen(false);
  };

  return (
    <div className="fresh-layout">
      <div className="cs-split-container">
        {/* LEFT PANE */}
        <div className="cs-left-pane">
          {/* RESTORED RIPPLE EFFECT */}
          <div className="ripple-wrap">
            <div className="ripple" style={{ top: '50%', left: '50%' }}></div>
          </div>

          <header className="animate-slide-up">
            <div className="brand-stack">
              <span className="brand-main">EARTHY SOURCE</span>
              <span className="brand-sub-stacked">FOODS & BEVERAGES</span>
            </div>
            <div className="coming-soon-badge">COMING SOON</div>
            <span className="sub-label" style={{ marginTop: '10px', display: 'block' }}>
              Intelligence in every drop
            </span>
          </header>

          <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="editorial-title">
              The future of <br />
              <span className="italic-serif">pure hydration</span> <br />
              is being written.
            </h1>
            
            <div className="purity-input-group" onClick={() => setIsModalOpen(true)}>
              <div className="purity-input-display">
                <span>Join the Purity Ledger</span>
                <span className="btn-minimal-text">Register →</span>
              </div>
            </div>
          </section>

          <footer className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="batch-status-container" style={{ width: '100%', maxWidth: '400px' }}>
              <div className="status-flex">
                <span className="sub-label" style={{ margin: 0 }}>
                  <span className="status-dot"></span>
                  Batch 001: Active Filtration
                </span>
                <span className="percentage-display">65%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill-animated" style={{ width: '65%' }}></div>
              </div>
            </div>
          </footer>
        </div>

        {/* RIGHT PANE - RESTORED WITH ANIMATE-IMAGE-FADE */}
        <div className="cs-right-pane animate-image-fade">
          <Image 
            src="/new-bg.png" 
            alt="Earthy Source" 
            fill 
            style={{ objectFit: 'cover' }} 
            className="cs-hero-image" 
            priority 
          />
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
            <div className="modal-header">
              <h2>Join the Ledger</h2>
              <p>Be the first to experience Batch 001.</p>
            </div>
            <form onSubmit={handleRegistration} className="contact-form">
              <input type="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input type="tel" placeholder="Phone Number" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <button type="submit" className="btn-submit">Secure Access via WhatsApp →</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}