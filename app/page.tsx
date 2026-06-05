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
      desc: "Premium, ultra-pure packaged drinking water engineered for crisp taste and superior hydration.",
    },
    sanjivani: {
      name: "Sai Sanjivani",
      desc: "Pure and safe everyday drinking water processed to the highest quality standards for healthy family hydration.",
    }
  };

  // Helper function to handle WhatsApp redirection safely
  const handleWhatsAppOrder = (brandName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the card from collapsing when clicking the button
    const message = encodeURIComponent(`Hello, I would like to place an order for ${brandName} packaged drinking water. Please share pricing and delivery details.`);
    window.open(`https://wa.me/917758877307?text=${message}`, "_blank");
  };

  return (
    <main className="fresh-layout">
      {/* NEW: TOP BAR (Bisleri Style) */}
      <div className="top-bar">
        <div className="top-bar-container">
          <div className="contact-info">
            <a href="tel:7758877307">📞 +91 7758877307</a>
            <a href="mailto:support@earthysource.in">✉️ support@earthysource.in</a>
          </div>
        </div>
      </div>

      {/* 1. TOP NAV */}
      <nav className="top-nav">
        <Image src="/EarthyLogo.JPG" alt="Earthy Source" width={300} height={120} priority style={{ objectFit: 'contain' }} />
        <div className="nav-links">
          <a href="/purity-check">Purity Check</a>
          <a href="/hydrasphere">HydraSphere</a>
          <a href="/careers">Careers</a> {/* ADDED CAREERS */}
          <a href="/about-us">About Us</a> {/* ADDED ABOUT US BESIDE CONTACT */}
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
  {/* CHANGED SECTION HEADING TO USE TEXT-WHITE AND TEXT-GREEN FOR HIGH READABILITY */}
  <h2 className="section-heading" style={{ color: '#ffffff' }}>
     <span style={{ color: '#00e676' }}>Our Family of Brands</span>
  </h2>
  
  <div className="brand-grid">
    <div className={`brand-card ${activeBrand === 'aqion' ? 'expanded' : ''}`} onClick={() => setActiveBrand(activeBrand === 'aqion' ? null : 'aqion')}>
       <div className="water-drop-icon"><svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg></div>
       <span className="brand-label">Premium Water</span>
       <h3>AQION</h3>
       {activeBrand === 'aqion' && (
         <div className="animate-slide-up info-reveal">
            <p className="brand-info">{brands.aqion.desc}</p>
			<span className="brand-label">AQION (Launching soon...!!!)</span>
            <div className="tag-list"><span>✓ Premium Quality</span><span>✓ Pure Hydration</span></div>
            {/* WHATSAPP ORDER NOW BUTTON */}
            <button 
              className="btn-primary" 
              style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#25D366', borderColor: '#25D366' }}
              onClick={(e) => handleWhatsAppOrder("AQION Premium", e)}
            >
              💬 Order Now via WhatsApp
            </button>
         </div>
       )}
       <button className="view-more-pill">{activeBrand === 'aqion' ? 'Hide' : 'Details'}</button>
    </div>

    {/* PROFESSIONALLY STYLED SAI SANJIVANI SECTION */}
    <div className={`brand-card ${activeBrand === 'sanjivani' ? 'expanded' : ''}`} onClick={() => setActiveBrand(activeBrand === 'sanjivani' ? null : 'sanjivani')}>
       <div className="water-drop-icon secondary"><svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg></div>
       <span className="brand-label">Standard Water</span>
	    
       <h3>SAI SANJIVANI</h3>
       {activeBrand === 'sanjivani' && (
         <div className="animate-slide-up info-reveal" style={{ textAlign: 'left', marginTop: '10px' }}>
            {/* CLEAN PRODUCT DISPLAY SECTION */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p className="brand-info" style={{ fontWeight: '500', marginBottom: '8px' }}>
                {brands.sanjivani.desc}
				
              </p>
			  		
					<span className="brand-label">Sai sanjivani</span>
              <div style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
                <div style={{ marginBottom: '4px' }}>• Multi-stage purification process</div>
                <div style={{ marginBottom: '4px' }}>• Tested and verified batch quality</div>
                <div>• Available in standard consumer sizes</div>
              </div>
            </div>

            <div className="tag-list"><span>✓ Trusted Everyday</span><span>✓ Mineral Enriched</span></div>
            
            {/* WHATSAPP ORDER NOW BUTTON */}
            <button 
              className="btn-primary" 
              style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#25D366', borderColor: '#25D366' }}
              onClick={(e) => handleWhatsAppOrder("Sai Sanjivani", e)}
            >
              💬 Order Now via WhatsApp
            </button>
         </div>
       )}
       <button className="view-more-pill">{activeBrand === 'sanjivani' ? 'Hide' : 'Details'}</button>
    </div>
  </div>
</section>

      {/* NEW: FOOTER SECTION */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-col">
            <h4>Plant Address</h4>
            <p>Earthy Source Foods And Beverages</p>
            <p>Gut No 253,Nimgaon Khairi, Puntamba Road,</p>
            <p>Shrirampur, Ahilyanagar, Maharashtra, India - 413709</p>
          </div>
          <div className="footer-col">
            <h4>Reach Us</h4>
            <p><strong>Phone:</strong> +91 7758877307</p>
            <p><strong>Support:</strong> support@earthysource.in</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <a href="/careers">Careers</a>
            <a href="/purity-check">Quality Report</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/about-us">About Us</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Earthy Source. All Rights Reserved.</p>
        </div>
      </footer>

      {/* 4. PREMIUM MODAL COMPONENT (CLEANER) */}
      <ContactModal 
        open={showContact} 
        onClose={() => setShowContact(false)} 
      />
    </main>
  );
}