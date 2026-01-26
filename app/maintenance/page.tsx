"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import "../homepage.css";

export default function MaintenancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "" });

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  const handleWhatsAppRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you could also send the data to your database/API
    const message = `Hello Earthy Source, I am reaching out from the Maintenance Page. Email: ${formData.email}, Phone: ${formData.phone}`;
    const whatsappUrl = `https://wa.me/7758877307?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    setIsModalOpen(false);
  };

  return (
    <div className="fresh-layout">
      <div className="cs-split-container">
        <div className="cs-left-pane">
          {/* ... Rest of your existing content ... */}
          
          <header className="animate-slide-up">
            <div className="text-brand-wrapper">
              <span className="brand-main">EARTHY SOURCE</span>
              <span className="brand-sub">FOODS & BEVERAGES</span>
            </div>
          </header>

          <section className="maintenance-center animate-slide-up">
            <h1 className="editorial-title">System <br /><span className="italic-serif">Equilibrium</span></h1>
            <p className="hero-sub">Our digital source is currently undergoing purification.</p>
            
            {/* BUTTON TRIGGERS MODAL */}
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="btn-whatsapp" 
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Concierge Support
            </button>
          </section>

          <footer>
            <p className="sub-label">© 2026 Earthy Source Foods & Beverages</p>
          </footer>
        </div>

        <div className="cs-right-pane animate-image-fade">
          <Image src="/new-bg.png" alt="Nature" fill style={{ objectFit: 'cover' }} className="cs-hero-image" priority />
        </div>
      </div>

      {/* --- CONCIERGE MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
            <div className="modal-header">
              <h2>Concierge Support</h2>
              <p>Enter your details to connect with our team via WhatsApp.</p>
            </div>
            <form onSubmit={handleWhatsAppRedirect} className="contact-form">
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <input 
                type="tel" 
                placeholder="Phone Number" 
                required 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <button type="submit" className="btn-submit">
                Start WhatsApp Chat →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}