"use client";

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, MapPin, Clock, Info, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function VisitorPassContent() {
  const passRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [data, setData] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      supabase.from('visitor_passes').select('*').eq('id', id).single()
        .then(({ data }) => setData(data));
    }
  }, [id]);

  const downloadPass = async () => {
    if (passRef.current === null) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(passRef.current, { 
        cacheBust: true, 
        backgroundColor: '#fff',
        style: { borderRadius: '0px' } // Ensures clean edges in the save
      });
      const link = document.createElement('a');
      link.download = `EarthySource-Pass-${data?.serial_no || 'Visitor'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  if (!data) return <div style={vStyles.loader}>Generating Digital Pass...</div>;

  return (
    <div style={vStyles.page}>
      <div style={vStyles.container}>
        {/* THIS SECTION IS CAPTURED AS AN IMAGE */}
        <div ref={passRef} style={vStyles.card}>
          <div style={vStyles.brandSection}>
            <img src="/EarthyLogo.JPG" style={vStyles.largeLogo} alt="Earthy Source Foods Logo" />
            <h1 style={vStyles.companyName}>EARTHY SOURCE FOODS<br/>AND BEVERAGES</h1>
          </div>
          
          <div style={vStyles.divider} />

          <div style={vStyles.header}>
            <ShieldCheck size={18} color="#4F7942" />
            <span>OFFICIAL VISITOR ENTRY PASS</span>
          </div>

          <div style={vStyles.qrContainer}>
            <QRCodeSVG 
              value={`${window.location.origin}/security/gate-control?id=${data.id}`} 
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>

          <div style={vStyles.visitorMeta}>
            <h2 style={vStyles.name}>{data.visitor_name}</h2>
            <div style={vStyles.badge}>
              {data.purpose} — {1 + parseInt(data.additional_guests || 0)} People
            </div>
          </div>

          <div style={vStyles.infoGrid}>
            <div style={vStyles.infoItem}><MapPin size={14} color="#2F4F4F"/><span>Main Production Plant</span></div>
            <div style={vStyles.infoItem}><Clock size={14} color="#2F4F4F"/><span>{new Date().toLocaleDateString()}</span></div>
          </div>

          <div style={vStyles.instructionBox}>
            <Info size={14} />
            <span>Present this QR to Security for Gate Entry</span>
          </div>
        </div>

        {/* DOWNLOAD BUTTON (Outside the pass card so it doesn't appear in the photo) */}
        <button 
          onClick={downloadPass} 
          disabled={downloading} 
          style={vStyles.downloadBtn}
        >
          <Download size={18} />
          {downloading ? 'Saving to Gallery...' : 'Save Pass to Gallery'}
        </button>
      </div>
    </div>
  );
}

export default function VisitorPassPage() {
  return <Suspense fallback={null}><VisitorPassContent /></Suspense>;
}

const vStyles: { [key: string]: React.CSSProperties } = {
  page: { minHeight: '100vh', backgroundColor: '#F0F4F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' },
  container: { width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: '#fff', borderRadius: '40px', padding: '40px 30px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' },
  brandSection: { marginBottom: '20px' },
  largeLogo: { height: '80px', width: 'auto', marginBottom: '15px', borderRadius: '12px' },
  companyName: { fontSize: '18px', fontWeight: '900', color: '#2F4F4F', margin: 0, letterSpacing: '0.5px', lineHeight: '1.2' },
  divider: { height: '2px', background: 'linear-gradient(to right, transparent, #E2E8F0, transparent)', margin: '20px 0' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#4F7942', marginBottom: '25px', letterSpacing: '1.5px' },
  qrContainer: { padding: '15px', backgroundColor: '#fff', borderRadius: '30px', display: 'inline-block', border: '1px solid #F1F5F9', marginBottom: '25px' },
  visitorMeta: { marginBottom: '30px' },
  name: { fontSize: '28px', fontWeight: '900', color: '#1A202C', margin: '0 0 10px 0' },
  badge: { display: 'inline-block', backgroundColor: '#F1F5F9', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: '#475569' },
  infoGrid: { display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' },
  infoItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', fontWeight: '600' },
  instructionBox: { backgroundColor: '#F1F5F9', color: '#475569', padding: '12px', borderRadius: '15px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  downloadBtn: { width: '100%', padding: '18px', backgroundColor: '#2F4F4F', color: '#fff', border: 'none', borderRadius: '18px', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(47, 79, 79, 0.4)' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2F4F4F', fontWeight: 'bold' }
};