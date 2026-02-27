"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function UniversalVerificationPortal() {
  const { serial } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!serial) return;

    const verify = async () => {
      setLoading(true);
      setErrorStatus(null);
      try {
        const res = await fetch(`/api/verify-document?serial=${serial}&t=${Date.now()}`);
        const result = await res.json();
        
        if (res.ok && result.data) {
          setData(result.data);
        } else {
          setData(null);
          setErrorStatus(result.error || "Document not found");
        }
      } catch (e) { 
        setErrorStatus("Connection failed");
        setData(null);
      } finally { 
        setLoading(false); 
      }
    };
    verify();
  }, [serial]);

  if (loading) return <div style={s.loader}>Accessing Secure Registry...</div>;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
  };

  return (
    <div style={s.container}>
      {/* Background Watermark */}
      <div style={s.watermark}>VERIFIED</div>

      <div style={s.card}>
        <div style={s.header}>
          <h3 style={s.title}>SOURCE INTEGRITY PORTAL</h3>
          <p style={s.brandSubtitle}>EARTHY SOURCE FOODS AND BEVERAGES</p>
        </div>

        {data ? (
          <div style={s.content}>
            {/* BIGGER LOGO CONTAINER */}
            <div style={s.bodyLogoContainer}>
               <img src="/EarthyLogo.JPG" alt="Company Logo" style={s.bodyLogo} />
            </div>

            <div style={s.badgeContainer}>
               <div style={s.verifiedBadge}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  VALIDATED RECORD
               </div>
            </div>

            <div style={s.infoBox}>
              <div style={s.dataRow}>
                <span style={s.label}>DOCUMENT CATEGORY</span>
                <span style={s.value}>{data.category.toUpperCase()}</span>
              </div>
              
              <div style={s.dataRow}>
                <span style={s.label}>SERIAL NUMBER</span>
                <span style={s.value}>#{data.serial_no}</span>
              </div>

              <div style={s.dataRow}>
                <span style={s.label}>OFFICIAL ISSUE DATE</span>
                <span style={s.value}>{formatDate(data.issue_date || data.created_at)}</span>
              </div>

              <div style={s.dataRow}>
                <span style={s.label}>ISSUE TIMESTAMP</span>
                <span style={s.value}>{new Date(data.created_at).toLocaleTimeString('en-GB')}</span>
              </div>

              {data.employee_name && (
                <div style={s.dataRow}>
                   <span style={s.label}>RECORD HOLDER</span>
                   <span style={s.value}>{data.employee_name}</span>
                </div>
              )}
            </div>

            <p style={s.instruction}>
              This record is officially registered in the Earthy Source Foods And Beverages database. For full transcript requests,
              contact <b style={{color: '#C5A059'}}>info@earthysource.in</b>
            </p>
          </div>
        ) : (
          <div style={s.errorContent}>
            <div style={s.errorBadge}>⚠ VALIDATION FAILED</div>
            <p style={s.errorText}>
              Serial <b>{serial}</b> is not recognized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  container: { 
    minHeight: '100vh', 
    background: 'linear-gradient(135deg, #fdfdf9 0%, #ebebe0 100%)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: '20px', 
    fontFamily: 'serif', 
    position: 'relative',
    overflow: 'hidden'
  },
  watermark: {
    position: 'absolute',
    fontSize: '12vw',
    fontWeight: '900',
    color: 'rgba(0,0,0,0.03)',
    transform: 'rotate(-30deg)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 0
  },
  card: { 
    // Glassmorphism effect
    background: 'rgba(255, 255, 255, 0.7)', 
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    width: '100%', 
    maxWidth: '440px', 
    borderRadius: '32px', // Rounded corners
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
    overflow: 'hidden', 
    border: '1px solid rgba(255, 255, 255, 0.5)',
    zIndex: 1 
  },
  header: { 
    padding: '40px 20px 0px 20px', 
    textAlign: 'center',
  },
  title: { 
    color: '#2F4F4F', 
    fontSize: '18px', 
    margin: 0, 
    fontWeight: '700', 
    letterSpacing: '3px' 
  },
  brandSubtitle: { 
    color: '#C5A059', 
    fontSize: '10px', 
    marginTop: '8px', 
    fontWeight: '600', 
    letterSpacing: '1.5px' 
  },
  content: { 
    padding: '30px', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center' 
  },
  bodyLogoContainer: { 
    marginBottom: '20px',
    padding: '20px',
    border: '2px double #C5A059', 
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.8)',
    boxShadow: '0 8px 32px rgba(197, 160, 89, 0.15)'
  },
  bodyLogo: { 
    width: '140px', // Bigger logo
    height: '140px', 
    objectFit: 'contain' 
  },
  badgeContainer: { marginBottom: '25px' },
  verifiedBadge: { 
    color: '#166534', 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '8px', 
    padding: '8px 20px', 
    fontSize: '13px', 
    fontWeight: 'bold', 
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '100px',
    border: '1px solid #C5A059',
    letterSpacing: '1px'
  },
  infoBox: { 
    width: '100%', 
    textAlign: 'left', 
    marginBottom: '24px',
    background: 'rgba(255, 255, 255, 0.4)',
    padding: '20px',
    borderRadius: '20px'
  },
  dataRow: { 
    marginBottom: '14px', 
    borderBottom: '1px solid rgba(229, 229, 209, 0.5)', 
    paddingBottom: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  label: { 
    fontSize: '10px', 
    color: '#94a3b8', 
    fontWeight: 'bold', 
    letterSpacing: '0.5px' 
  },
  value: { 
    fontSize: '14px', 
    color: '#2F4F4F', 
    fontWeight: '700',
    fontFamily: 'sans-serif'
  },
  instruction: { 
    fontSize: '11px', 
    color: '#64748b', 
    lineHeight: '1.6', 
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: '10px'
  },
  errorContent: { padding: '50px 30px', textAlign: 'center' },
  errorBadge: { background: '#fee2e2', color: '#991b1b', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  errorText: { color: '#334155', fontSize: '15px', marginTop: '15px' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2F4F4F', fontSize: '16px' }
};