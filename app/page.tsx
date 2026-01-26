"use client";
import { useState } from "react";
import Image from "next/image";
import "./homepage.css";

export default function HomePage() {
  const [showContact, setShowContact] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    category: "General Inquiry",
    message: ""
  });

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

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        alert("Success!");
        setShowContact(false);
        setFormData({ name: "", phone: "", email: "", category: "General Inquiry", message: "" });
      }
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    const waNumber = "7666303769";
    const text = `*New Lead*%0A*Name:* ${formData.name}%0A*Message:* ${formData.message}`;
    window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank");
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

      {/* 3. BRAND SECTION (CLEANED UP) */}
      <section id="brands" className="brand-section">
        <h2 className="section-heading">Our Family of Brands</h2>
        <div className="brand-grid">
          
          {/* AQION */}
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

          {/* SANJIVANI */}
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

      {/* 4. MODAL */}
      {showContact && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <button className="close-modal" onClick={() => setShowContact(false)}>×</button>
            <h2>Contact Us</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <input type="text" name="name" placeholder="Name" required onChange={handleChange} />
              <input type="text" name="phone" placeholder="Phone" required onChange={handleChange} />
              <textarea name="message" placeholder="Message" onChange={handleChange}></textarea>
              <div className="modal-actions">
                <button type="submit" className="btn-submit">Submit</button>
                <button type="button" onClick={handleWhatsApp} className="btn-whatsapp">WhatsApp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}