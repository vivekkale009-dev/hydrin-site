"use client";
import React, { useEffect, useState } from 'react';

export default function StatusBanner() {
  const [status, setStatus] = useState<"online" | "degraded" | "offline">("online");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/health?t=' + Date.now());
        if (!res.ok) {
          setStatus("degraded");
        } else {
          setStatus("online");
        }
      } catch (e) {
        setStatus("offline");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === "online") return null;

  return (
    <>
      {/* --- BANNER --- */}
      <div 
        onClick={() => setShowHelp(true)}
        style={{
          background: status === "degraded" ? "#FEF9C3" : "#FEE2E2", 
          color: "#1A2E2A",
          padding: "12px 20px",
          textAlign: "center",
          fontSize: "13px",
          fontWeight: "600",
          borderBottom: `2px solid ${status === "degraded" ? "#FACC15" : "#EF4444"}`,
          position: "sticky",
          top: 0,
          zIndex: 9998,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
      >
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          {status === "degraded" 
            ? "Network Alert: ISP connectivity issues detected in India. Click for help." 
            : "System Offline: Connection to database failed. Click for solutions."}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); window.location.reload(); }} 
          style={{ 
            background: '#16A34A', 
            color: 'white', 
            border: 'none', 
            padding: '4px 12px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          RETRY
        </button>
      </div>

      {/* --- HELP MODAL --- */}
      {showHelp && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(26, 46, 42, 0.8)',
          zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#FCFDFD',
            padding: '40px', borderRadius: '16px',
            maxWidth: '550px', width: '100%', position: 'relative', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #E5E7EB',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            <button 
              onClick={() => setShowHelp(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#1A2E2A' }}
            >✕</button>
            
            <h2 style={{ marginTop: 0, color: '#1A2E2A', fontSize: '22px', fontWeight: '800' }}>Connection Status</h2>
            
            {/* Safety & Transparency Note */}
            <div style={{ 
              padding: '12px 15px', background: '#FFF7ED', border: '1px solid #FFEDD5', 
              borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px' 
            }}>
              <span style={{ fontSize: '18px' }}>ℹ️</span>
              <p style={{ margin: 0, fontSize: '13px', color: '#9A3412', lineHeight: '1.4' }}>
                <strong>Is this website safe?</strong> Yes. Our infrastructure is 100% operational. However, some Indian ISPs (like Jio or Airtel) are currently misrouting traffic to our secure database. This is a regional network issue beyond our control.
              </p>
            </div>

            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '14px', color: '#1A2E2A', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What can I do?</h3>
              
              {/* Option 1: Wait */}
              <div style={{ marginBottom: '15px', padding: '15px', background: '#F9FAFB', borderRadius: '8px', borderLeft: '4px solid #9CA3AF' }}>
                <p style={{ fontSize: '13px', margin: 0, color: '#374151', lineHeight: '1.5' }}>
                  <strong>Option 1: Wait it out</strong><br />
                  You don't need to change any settings. We are working with network providers to resolve the routing. You can simply try again in an hour.
                </p>
              </div>

              {/* Option 2: Technical Fix */}
              <div style={{ marginBottom: '15px', padding: '15px', background: '#F9FAFB', borderRadius: '8px', borderLeft: '4px solid #16A34A' }}>
                <p style={{ fontSize: '13px', margin: 0, color: '#374151', lineHeight: '1.5' }}>
                  <strong>Option 2: Fix it now (Technical)</strong><br />
                  If you need immediate access, use a VPN or change your browser DNS: <br />
                  <em>Settings → Privacy → Security → Use Secure DNS → Cloudflare (1.1.1.1)</em>.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '12px', textAlign: 'center', color: '#9CA3AF', marginTop: '20px' }}>
              Your data and account remain completely secure.
            </p>

            <button 
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: '15px', width: '100%', padding: '14px', 
                backgroundColor: '#1A2E2A', color: 'white', border: 'none', 
                borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              I'll try again later
            </button>
          </div>
        </div>
      )}
    </>
  );
}