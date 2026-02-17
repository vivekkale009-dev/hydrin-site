"use client";
import Image from "next/image";
import Link from "next/link";
import "../homepage.css";

export default function AboutUs() {
  const processSteps = [
    { title: "Sedimentation", desc: "Ground water is settled to allow heavy sand structures to naturally separate before the filtration process begins." },
    { title: "Multi-Stage Filtration", desc: "Advanced Carbon filtration followed by Micro-membrane technology to ensure clarity." },
    { title: "RO & Ionization", desc: "Reverse Osmosis with constant TDS and pH monitoring to maintain the perfect mineral balance." },
    { title: "Sterilization", desc: "Double microbiological protection using high-intensity UV treatment and Ozonation." },
    { title: "Automated Blowing", desc: "Bottles are blown in-house from preforms to ensure nearly zero external contamination." },
    { title: "RFC & Sealing", desc: "High-speed Rinsing, Filling, and Capping in a sterile environment with zero human touch." },
    { title: "Batching & Packing", desc: "Automated batch coding for traceability, labeling, and final shrink packaging." }
  ];

  return (
    <main className="about-wrapper">
      <Link href="/" className="back-home-pill">← Back to Home</Link>

      <div className="about-main-content">
        {/* BIGGER LOGO SECTION */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <Image 
            src="/EarthyLogo.JPG" 
            alt="Earthy Source Logo" 
            width={450} 
            height={200} 
            priority 
            style={{ objectFit: 'contain' }} 
          />
        </div>

        <header className="about-title-area">
          <span className="badge" style={{ background: '#e8f5e9', color: '#2d5a27', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            The Earthy Source Story
          </span>
          <h1>Intelligence in <br /><span className="text-green">Every Drop.</span></h1>
        </header>

        {/* 1. THE PROCESS FLOW */}
        <section className="process-section" style={{ marginBottom: '60px' }}>
          <h2 style={{ textAlign: 'center', color: '#2d5a27', marginBottom: '10px' }}>Our Automated Journey</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>From raw source to sealed bottle: A closed-loop purity system.</p>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            
          </div>

          <div className="process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '30px' }}>
            {processSteps.map((step, index) => (
              <div key={index} className="process-step-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #eee', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <span style={{ position: 'absolute', top: '10px', right: '15px', color: '#e8f5e9', fontSize: '2rem', fontWeight: 'bold' }}>0{index + 1}</span>
                <h3 style={{ color: '#2d5a27', fontSize: '1.2rem', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.6' }}>{step.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="tech-notice" style={{ marginTop: '40px', background: '#f0f4f0', padding: '30px', borderRadius: '15px', textAlign: 'center', border: '1px dashed #2d5a27' }}>
            <p style={{ fontSize: '1.1rem', color: '#2d5a27', fontWeight: '700', marginBottom: '10px' }}>
              ⚡ End-to-End Automation
            </p>
            <p style={{ fontSize: '0.95rem', color: '#444', maxWidth: '700px', margin: '0 auto' }}>
              Our facility is engineered for zero human interference. By automating the blowing, filling, and packing processes, we eliminate the risk of contamination and ensure every bottle meets our "Human Untouched" quality standard.
            </p>
          </div>
        </section>

        {/* 2. INFRASTRUCTURE & MONITORING SECTION */}
        <section style={{ marginBottom: '80px', textAlign: 'center' }}>
            <h2 style={{ color: '#2d5a27', marginBottom: '20px' }}>Real-Time Quality Monitoring</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>We measure TDS and pH levels at every critical junction of the RO process.</p>
            
            
        </section>

        {/* 3. CORE STORY GRID */}
        <div className="about-story-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          <div className="story-card">
            <h2>Our Mission</h2>
            <p>
              At Earthy Source, we prioritize the natural integrity of water. By allowing for initial sedimentation, we ensure that heavy particles are removed before the water even enters our advanced RO membranes, extending the life of our filters and the purity of your drink.
            </p>
          </div>

          <div className="story-card">
            <h2>Modern Infrastructure</h2>
            <p>
              Located in Ahilyanagar, our plant features high-speed RFC (Rinsing, Filling, Capping) technology. This specialized machinery ensures that bottles are sanitized and sealed in a single, continuous motion, locking in freshness.
            </p>
          </div>
        </div>

        {/* 4. VISUAL OF RFC TECHNOLOGY */}
        <section style={{ marginTop: '60px', textAlign: 'center' }}>
            <h3 style={{ color: '#2d5a27', marginBottom: '20px' }}></h3>
            
        </section>

        <footer className="footer-bottom" style={{ borderTop: '1px solid #eee', paddingTop: '30px', marginTop: '80px' }}>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
            &copy; 2026 Earthy Source Foods and Beverages. All Rights Reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}