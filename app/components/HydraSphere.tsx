"use client";
import React, { useState } from "react";
import Link from "next/link"; // Added for navigation
import Swal from 'sweetalert2';

export default function EarthySphere() {
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [activeContent, setActiveContent] = useState("stories");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = {
    primary: "#166534", 
    secondary: "#111827", 
    accent: "#059669", 
    earthBg: "#fdfcf9",
    textLight: "#4b5563"
  };

  const impactMetrics = [
    "🔬 Lab Verified: Natural Alkalinity",
    "🚀 Pre-Launch Beta Testing Underway",
    "📦 Compostable Packaging Prototypes",
    "💎 Founding Member Slots Filling Fast",
    "📍 Source Location: Deccan Terrain",
    "🌿 Zero-Carbon Commitment",
    "📅 Official EarthySource Launch: Q2 2026"
  ];

  const pillars = [
    { 
      title: "Purity Standards", 
      icon: "🔬", 
      content: "Our purity isn't just a measurement; it's a philosophy. Every drop of EarthySource is tested against 150+ parameters to ensure that the natural mineral profile of the Deccan Terrain remains undisturbed. We monitor bio-vibrancy and oxygen saturation to ensure the water you drink is as 'living' as it was at the source." 
    },
    { 
      title: "The Source", 
      icon: "🌱", 
      content: "We protect the origin. Our source is a protected aquifer in the Deccan Terrain where the water has been naturally filtered by volcanic rock for centuries, absorbing a unique balance of earth-born minerals." 
    },
    { 
      title: "Ethical Flow", 
      icon: "🤝", 
      content: "EarthySource operates on a 'Give-Back' model. Every drop you drink contributes to soil restoration and reforestation in our local farming communities, ensuring the earth stays as hydrated as you are." 
    }
  ];

  const explorerData: any = {
    stories: {
      title: "Earthy Stories",
      tagline: "Inspiring journeys of grounding and community health.",
      details: "From marathon runners finding faster recovery to forest-dwelling communities sharing their ancient water wisdom, our stories celebrate the deep connection between human vitality and the planet's pulse."
    },
    updates: {
      title: "Brand Updates",
      tagline: "Official announcements and Deccan milestones.",
      details: "We are currently in the final phase of our Deccan Terrain site certification. Upcoming milestones include the reveal of our 100% compostable cap design and the announcement of our Founding 500 member launch event."
    },
    pulse: {
      title: "Sustainability Pulse",
      tagline: "Giving back more than we take.",
      details: "Our current focus is 'Soil-First' hydration. We are implementing rainwater harvesting systems in the villages surrounding our aquifers to recharge the groundwater levels we use, ensuring a net-positive impact."
    },
    highlights: {
      title: "Events & Highlights",
      tagline: "EarthySource on the ground.",
      details: "Though we haven't launched, our pre-launch 'Earth-Walk' drives have already cleared 2 tons of plastic from Deccan trekking trails. Join us for our next clean-up drive in Q3 2025."
    },
    wellness: {
      title: "EarthyWell (Wellness Blog)",
      tagline: "The science of biological hydration.",
      details: "Did you know volcanic filtration creates water that is naturally structured for better cellular absorption? Our blog dives into the physics of water and how EarthySource supports the body's natural pH balance."
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        Swal.fire({
          title: 'Welcome to the Source!',
          text: 'You are now a Founding Member of EarthySource.',
          icon: 'success',
          confirmButtonColor: colors.primary
        });
        setEmail("");
      } else {
        throw new Error("Failed to sync");
      }
    } catch (err) {
      Swal.fire({
        title: 'Connection Error',
        text: 'The source is bubbling over. Please try again later.',
        icon: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-container { overflow: hidden; white-space: nowrap; background: rgba(22, 101, 52, 0.05); padding: 15px 0; border-top: 1px solid rgba(22, 101, 52, 0.1); border-bottom: 1px solid rgba(22, 101, 52, 0.1); margin: 40px 0; }
        .ticker-wrapper { display: inline-flex; animation: scroll 35s linear infinite; }
        .ticker-item { display: inline-block; margin: 0 40px; font-weight: 600; color: #166534; font-size: 0.85rem; letter-spacing: 1px; }
        .glass-card:hover { transform: translateY(-8px); border-color: #166534 !important; background: #fff !important; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .tab-active { background: #166534 !important; color: white !important; }
        .active-viewer { animation: fadeIn 0.4s ease-out; background: #fff; padding: 40px; border-radius: 30px; border: 1px solid #e2e8f0; margin-top: 30px; }
        .signature-font { font-family: 'Dancing Script', cursive; font-size: 2.2rem; color: #166534; margin-top: 10px; opacity: 0.9; }
        .home-btn { position: fixed; top: 30px; left: 30px; z-index: 100; background: #fff; padding: 10px 20px; border-radius: 100px; border: 1px solid rgba(22, 101, 52, 0.2); text-decoration: none; color: #166534; font-weight: 700; font-size: 0.85rem; transition: 0.3s; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .home-btn:hover { background: #166534; color: #fff; transform: translateX(-5px); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      {/* FLOATING HOME BUTTON */}
      <Link href="/" className="home-btn">
        ← Home
      </Link>

      <section style={{ width: "100%", minHeight: "100vh", background: colors.earthBg, padding: "80px 5%", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{ color: colors.primary, fontWeight: 700, letterSpacing: 2, fontSize: '0.8rem' }}>RECONNECTING TO THE ORIGIN</span>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 900, color: colors.secondary, margin: '10px 0' }}>EarthySource</h1>
          </div>

          <div className="ticker-container">
            <div className="ticker-wrapper">
              {[...impactMetrics, ...impactMetrics].map((text, i) => (
                <div key={i} className="ticker-item">{text}</div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", padding: "60px 50px", borderRadius: "40px", marginBottom: "60px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ color: colors.secondary, marginBottom: '25px', fontSize: '2rem' }}>Nature Doesn't Hurry, Yet Everything is Accomplished.</h2>
            <p style={{ fontSize: '1.2rem', lineHeight: 1.9, color: colors.textLight, fontStyle: 'italic' }}>
              "I have always believed that the Earth holds the answers to the questions we haven't even learned to ask yet. EarthySource was born from a quiet moment of stillness—a realization that in our pursuit of progress, we have drifted away from the ground that gives us life. Our promise remains the same: We are not just a brand; we are a bridge back to the Earth."
            </p>
            <div style={{ marginTop: '40px' }}>
              <div className="signature-font">The Founder</div>
              <div style={{ fontWeight: 800, color: colors.primary, fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>EarthySource Origin Group</div>
            </div>
          </div>

          <div style={{ marginBottom: 80, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              {pillars.map((p, idx) => (
                <button key={idx} onClick={() => setActiveTab(idx)} className={activeTab === idx ? "tab-active" : ""} style={{ padding: '12px 30px', borderRadius: '100px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {p.icon} {p.title}
                </button>
              ))}
            </div>
            <div style={{ background: "#fff", padding: "40px", borderRadius: "30px", border: `1px solid ${colors.primary}` }}>
              <p style={{ fontSize: '1.2rem', color: colors.secondary, lineHeight: 1.6 }}>{pillars[activeTab].content}</p>
            </div>
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: 40, color: colors.secondary }}>Explore the Sphere</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <MiniCard title="Earthy Stories" icon="🌊" onClick={() => setActiveContent("stories")} />
            <MiniCard title="Brand Updates" icon="🚀" onClick={() => setActiveContent("updates")} />
            <MiniCard title="Sustainability" icon="🌿" onClick={() => setActiveContent("pulse")} />
            <MiniCard title="Events" icon="🗓️" onClick={() => setActiveContent("highlights")} />
            <MiniCard title="EarthyWell" icon="🔬" onClick={() => setActiveContent("wellness")} />
          </div>

          <div className="active-viewer">
            <span style={{ color: colors.primary, fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Channel Focus</span>
            <h3 style={{ fontSize: '2rem', color: colors.secondary, margin: '10px 0' }}>{explorerData[activeContent].title}</h3>
            <p style={{ fontWeight: 600, color: colors.primary, marginBottom: 15 }}>{explorerData[activeContent].tagline}</p>
            <p style={{ color: colors.textLight, fontSize: '1.1rem', lineHeight: 1.7 }}>{explorerData[activeContent].details}</p>
          </div>

          <div style={{ marginTop: "100px", padding: "80px 40px", borderRadius: "48px", background: colors.secondary, color: "#fff", textAlign: "center" }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 15 }}>Ground Your Future</h2>
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 12, justifyContent: 'center', maxWidth: 550, margin: '30px auto', flexWrap: 'wrap' }}>
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: '250px', padding: '20px 28px', borderRadius: '100px', border: 'none', color: '#000' }} required disabled={isSubmitting} />
              <button type="submit" style={{ padding: '20px 40px', borderRadius: '100px', border: 'none', background: colors.primary, color: '#fff', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer' }} disabled={isSubmitting}>
                {isSubmitting ? "Syncing..." : "Join Waitlist"}
              </button>
            </form>
            
            {/* SECONDARY NAVIGATION LINK */}
            <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.9rem", marginTop: "20px", display: "inline-block" }}>
                Return to Source
            </Link>
          </div>

        </div>
      </section>
    </>
  );
}

function MiniCard({ title, icon, onClick }: any) {
  return (
    <div onClick={onClick} className="glass-card" style={{ borderRadius: "24px", padding: "25px", textAlign: 'center', backgroundColor: "#fff", border: `1px solid rgba(22, 101, 52, 0.1)`, cursor: "pointer", transition: '0.3s' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: "#111827", fontSize: '0.9rem' }}>{title}</div>
    </div>
  );
}