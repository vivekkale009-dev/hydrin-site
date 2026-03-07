"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Html5QrcodeScanner } from "html5-qrcode";
import { createClient } from '@supabase/supabase-js';
import { Shield, CheckCircle2, XCircle, Users, Clock, LogOut, MapPin, RefreshCcw, UserCheck, Lock, Calendar } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const AUTHORIZED_GATE_KEY = process.env.NEXT_PUBLIC_GATE_ACCESS_KEY;

// Fix for hidden scanner buttons/links due to color contrast
const injectStyles = `
  #reader button { 
    background-color: #2F4F4F !important; 
    color: white !important; 
    border-radius: 8px !important; 
    padding: 10px 20px !important;
    border: none !important;
    margin: 10px 0 !important;
    cursor: pointer !important;
    font-weight: bold !important;
  }
  #reader a { 
    color: #4F7942 !important; 
    text-decoration: underline !important;
    font-size: 14px !important;
    display: block !important;
    margin-top: 10px !important;
  }
  #reader__status_span { color: #2F4F4F !important; }
`;

function GateContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id');

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [gateKey, setGateKey] = useState("");
  const [visitorData, setVisitorData] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    const savedKey = localStorage.getItem("gate_access_token");
    if (savedKey === AUTHORIZED_GATE_KEY) setIsAuthorized(true);
  }, []);

  useEffect(() => {
    if (isAuthorized && urlId) {
      handleVisitorProcess(urlId);
    }
  }, [isAuthorized, urlId]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isAuthorized && !urlId) {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: (width, height) => ({ width: width * 0.8, height: width * 0.8 }) 
      }, false);
      scanner.render(
        (decodedText) => {
          const id = decodedText.includes('id=') ? decodedText.split('id=')[1] : decodedText;
          handleVisitorProcess(id);
        },
        (err) => {}
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [isAuthorized, urlId]);

  const handleAuth = () => {
    if (gateKey === AUTHORIZED_GATE_KEY) {
      localStorage.setItem("gate_access_token", gateKey);
      setIsAuthorized(true);
    } else {
      alert("Invalid Security Key.");
    }
  };

  const handleVisitorProcess = async (id: string) => {
    setActionStatus({ type: 'loading', msg: 'Verifying Pass...' });
    
    const { data: visitor, error } = await supabase
      .from('visitor_passes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !visitor) {
      setActionStatus({ type: 'error', msg: 'INVALID QR CODE' });
      return;
    }

    if (visitor.status === 'checked_out') {
      setActionStatus({ type: 'error', msg: 'PASS ALREADY EXPIRED' });
      setVisitorData(visitor);
      return;
    }

    const now = new Date().toISOString();
    let updateFields = {};

    if (visitor.status === 'pending') {
      updateFields = { status: 'checked_in', check_in_time: now };
      setActionStatus({ type: 'success', msg: 'ENTRY GRANTED' });
    } else if (visitor.status === 'checked_in') {
      updateFields = { status: 'checked_out', check_out_time: now };
      setActionStatus({ type: 'success', msg: 'EXIT RECORDED' });
    }

    const { error: updateErr } = await supabase
      .from('visitor_passes')
      .update(updateFields)
      .eq('id', id);

    if (!updateErr) {
      setVisitorData({ ...visitor, ...updateFields });
    } else {
      setActionStatus({ type: 'error', msg: 'DATABASE UPDATE FAILED' });
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return { date: '--', time: '--' };
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // SAFETY PARSE FOR GUEST NAMES
  const getGuestList = (guests: any) => {
    if (!guests) return [];
    if (Array.isArray(guests)) return guests;
    try {
      const parsed = JSON.parse(guests);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return typeof guests === 'string' ? guests.split(',').map(g => g.trim()) : [];
    }
  };

  if (!isAuthorized) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <img src="/EarthyLogo.JPG" alt="Logo" style={{height: '50px', marginBottom: '20px'}} />
          <h2 style={{margin: '0 0 10px 0', color: '#2F4F4F', fontSize: '24px'}}>Security Login</h2>
          <p style={{fontSize: '14px', color: '#64748B', marginBottom: '20px'}}>Authorized Personnel Only</p>
          <input 
            type="password" 
            placeholder="Gate Access Key" 
            style={styles.input}
            onChange={(e) => setGateKey(e.target.value)}
          />
          <button onClick={handleAuth} style={styles.primaryBtn}>Unlock Device</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{injectStyles}</style>
      <header style={styles.header}>
        <img src="/EarthyLogo.JPG" alt="Logo" style={{height: '30px', maxWidth: '100px', objectFit: 'contain'}} />
        <div style={styles.locationTag}>
          <MapPin size={14} color="#4F7942"/>
          <span>MAIN GATE</span>
        </div>
      </header>

      {!visitorData && !urlId && (
        <div style={styles.scannerBox}>
          <div id="reader" style={{ width: '100%' }}></div>
          <p style={styles.scanHint}>Position QR Code within the frame</p>
        </div>
      )}

      {actionStatus.msg && (
        <div style={{...styles.statusBanner, 
          backgroundColor: actionStatus.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          borderColor: actionStatus.type === 'error' ? '#FCA5A5' : '#86EFAC'
        }}>
          {actionStatus.type === 'success' ? <CheckCircle2 color="#16A34A" size={24}/> : <XCircle color="#DC2626" size={24}/>}
          <span style={{fontWeight:'800', color: actionStatus.type === 'error' ? '#991B1B' : '#166534', fontSize: '14px'}}>{actionStatus.msg}</span>
        </div>
      )}

      {visitorData && (
        <div style={{
          ...styles.visitorCard, 
          opacity: visitorData.status === 'checked_out' ? 0.6 : 1,
          filter: visitorData.status === 'checked_out' ? 'grayscale(0.5)' : 'none'
        }}>
          <div style={styles.cardHeader}>
            <div style={{ flex: 1, paddingRight: '10px' }}>
                <h3 style={styles.vName}>{visitorData.visitor_name}</h3>
                <span style={styles.vPhone}>{visitorData.phone_number}</span>
            </div>
            <div style={{
                ...styles.statusBadge, 
                backgroundColor: visitorData.status === 'checked_in' ? '#DCFCE7' : visitorData.status === 'checked_out' ? '#F1F5F9' : '#FEF3C7',
                color: visitorData.status === 'checked_in' ? '#166534' : visitorData.status === 'checked_out' ? '#475569' : '#92400E'
            }}>
                {visitorData.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {visitorData.status === 'checked_out' && (
            <div style={styles.expiredBanner}>
                <Lock size={16} /> PASS EXPIRED & CLOSED
            </div>
          )}

          <div style={styles.guestPanel}>
             <div style={styles.panelTitle}><Users size={16}/> Group Members</div>
             <div style={styles.guestGrid}>
                <span style={styles.guestTag}>Main: {visitorData.visitor_name}</span>
                {getGuestList(visitorData.guest_names).map((n:string, i:number) => (
                    <span key={i} style={styles.guestTag}>{n}</span>
                ))}
             </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.iconContainer}><Clock size={16} color="#2F4F4F"/></div>
              <div>
                <div style={styles.label}>CHECK IN</div>
                <div style={styles.value}>{formatDateTime(visitorData.check_in_time).date}</div>
                <div style={styles.subValue}>{formatDateTime(visitorData.check_in_time).time}</div>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.iconContainer}><LogOut size={16} color="#DC2626"/></div>
              <div>
                <div style={styles.label}>CHECK OUT</div>
                <div style={styles.value}>{formatDateTime(visitorData.check_out_time).date}</div>
                <div style={styles.subValue}>{formatDateTime(visitorData.check_out_time).time}</div>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.iconContainer}><UserCheck size={16} color="#4F7942"/></div>
              <div>
                <div style={styles.label}>HOST</div>
                <div style={styles.value}>{visitorData.host_person || 'N/A'}</div>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.iconContainer}><RefreshCcw size={16} color="#4F7942"/></div>
              <div>
                <div style={styles.label}>VEHICLE</div>
                <div style={styles.value}>{visitorData.vehicle_no || 'Walk-in'}</div>
              </div>
            </div>
          </div>

          <button onClick={() => window.location.href = '/security/gate-control'} style={styles.nextBtn}>
              Scan Next Visitor
          </button>
        </div>
      )}
    </div>
  );
}

export default function SecurityPortal() {
    return <Suspense fallback={null}><GateContent /></Suspense>;
}

const styles: { [key: string]: React.CSSProperties } = {
  authPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '15px' },
  authCard: { backgroundColor: '#fff', padding: '30px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '380px' },
  input: { width: '100%', padding: '16px', marginBottom: '20px', borderRadius: '12px', border: '1.5px solid #E2E8F0', textAlign: 'center', fontSize: '16px', outline: 'none' },
  primaryBtn: { width: '100%', padding: '16px', backgroundColor: '#2F4F4F', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  page: { minHeight: '100vh', backgroundColor: '#F1F5F9', padding: '12px', maxWidth: '600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  locationTag: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#475569', whiteSpace: 'nowrap' },
  scannerBox: { borderRadius: '20px', overflow: 'hidden', border: '4px solid #2F4F4F', marginBottom: '16px', backgroundColor: '#fff' },
  scanHint: { textAlign: 'center', padding: '12px', color: '#fff', backgroundColor: '#2F4F4F', margin: 0, fontSize: '12px', fontWeight: '500' },
  statusBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', borderRadius: '16px', border: '2px solid', marginBottom: '16px' },
  visitorCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  vName: { margin: 0, fontSize: '20px', color: '#1E293B', fontWeight: '900', lineHeight: '1.2' },
  vPhone: { fontSize: '13px', color: '#64748B' },
  statusBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' },
  guestPanel: { backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '14px', marginBottom: '16px' },
  panelTitle: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' },
  guestGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  guestTag: { backgroundColor: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #E2E8F0', color: '#334155' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  infoItem: { display: 'flex', gap: '10px', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '12px', alignItems: 'flex-start' },
  iconContainer: { padding: '8px', backgroundColor: '#fff', borderRadius: '8px' },
  label: { fontSize: '9px', fontWeight: '800', color: '#94A3B8', marginBottom: '2px' },
  value: { fontSize: '11px', fontWeight: '700', color: '#1E293B', lineHeight: '1.2' },
  subValue: { fontSize: '10px', color: '#64748B' },
  expiredBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', backgroundColor: '#F1F5F9', color: '#64748B', borderRadius: '12px', border: '1px dashed #CBD5E1', marginBottom: '16px', fontSize: '12px' },
  nextBtn: { width: '100%', padding: '16px', backgroundColor: '#4F7942', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px' }
};