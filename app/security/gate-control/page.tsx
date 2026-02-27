"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Html5QrcodeScanner } from "html5-qrcode";
import { createClient } from '@supabase/supabase-js';
import { Shield, CheckCircle2, XCircle, Users, Clock, LogOut, MapPin, RefreshCcw, UserCheck } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const AUTHORIZED_GATE_KEY = process.env.NEXT_PUBLIC_GATE_ACCESS_KEY;

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
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
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
        // We wrap the promise-returning clear() in a non-async function
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

    const now = new Date().toISOString();
    let updateFields = {};

    if (visitor.status === 'pending') {
      updateFields = { status: 'checked_in', check_in_time: now };
      setActionStatus({ type: 'success', msg: 'ENTRY GRANTED' });
    } else if (visitor.status === 'checked_in') {
      updateFields = { status: 'checked_out', check_out_time: now };
      setActionStatus({ type: 'success', msg: 'EXIT RECORDED' });
    } else {
      setActionStatus({ type: 'error', msg: 'PASS ALREADY EXPIRED' });
      setVisitorData(visitor);
      return;
    }

    const { error: updateErr } = await supabase
      .from('visitor_passes')
      .update(updateFields)
      .eq('id', id);

    if (!updateErr) setVisitorData({ ...visitor, ...updateFields });
  };

  if (!isAuthorized) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <img src="/EarthyLogo.JPG" alt="Logo" style={{height: '50px', marginBottom: '20px'}} />
          <h2 style={{margin: '0 0 10px 0', color: '#2F4F4F'}}>Security Login</h2>
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
      <header style={styles.header}>
        <img src="/EarthyLogo.JPG" alt="Logo" style={{height: '35px'}} />
        <div style={styles.locationTag}>
          <MapPin size={14} color="#4F7942"/>
          <span>MAIN GATE</span>
        </div>
      </header>

      {!visitorData && !urlId && (
        <div style={styles.scannerBox}>
          <div id="reader"></div>
          <p style={styles.scanHint}>Position QR Code within the frame</p>
        </div>
      )}

      {actionStatus.msg && (
        <div style={{...styles.statusBanner, 
          backgroundColor: actionStatus.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          borderColor: actionStatus.type === 'error' ? '#FCA5A5' : '#86EFAC'
        }}>
          {actionStatus.type === 'success' ? <CheckCircle2 color="#16A34A" size={24}/> : <XCircle color="#DC2626" size={24}/>}
          <span style={{fontWeight:'800', color: actionStatus.type === 'error' ? '#991B1B' : '#166534'}}>{actionStatus.msg}</span>
        </div>
      )}

      {visitorData && (
        <div style={styles.visitorCard}>
          <div style={styles.cardHeader}>
            <div>
                <h3 style={styles.vName}>{visitorData.visitor_name}</h3>
                <span style={styles.vPhone}>{visitorData.phone_number}</span>
            </div>
            <div style={{...styles.statusBadge, backgroundColor: visitorData.status === 'checked_in' ? '#DCFCE7' : '#F1F5F9'}}>
                {visitorData.status.toUpperCase()}
            </div>
          </div>

          <div style={styles.guestPanel}>
             <div style={styles.panelTitle}><Users size={16}/> Group Members</div>
             <div style={styles.guestGrid}>
                <span style={styles.guestTag}>Main: {visitorData.visitor_name}</span>
                {visitorData.guest_names?.map((n:string, i:number) => (
                    <span key={i} style={styles.guestTag}>{n}</span>
                ))}
             </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}><Clock size={14}/> In: {visitorData.check_in_time ? new Date(visitorData.check_in_time).toLocaleTimeString() : '--'}</div>
            <div style={styles.infoItem}><LogOut size={14}/> Out: {visitorData.check_out_time ? new Date(visitorData.check_out_time).toLocaleTimeString() : '--'}</div>
            <div style={styles.infoItem}><UserCheck size={14}/> Host: {visitorData.host_person || 'N/A'}</div>
            <div style={styles.infoItem}><RefreshCcw size={14}/> Vehicle: {visitorData.vehicle_no || 'Walk-in'}</div>
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
  authPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  authCard: { backgroundColor: '#fff', padding: '40px', borderRadius: '32px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '90%', maxWidth: '400px' },
  input: { width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '12px', border: '1.5px solid #E2E8F0', textAlign: 'center', fontSize: '18px' },
  primaryBtn: { width: '100%', padding: '16px', backgroundColor: '#2F4F4F', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  page: { minHeight: '100vh', backgroundColor: '#F1F5F9', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  locationTag: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#475569' },
  scannerBox: { borderRadius: '24px', overflow: 'hidden', border: '6px solid #2F4F4F', marginBottom: '20px' },
  scanHint: { textAlign: 'center', padding: '15px', color: '#fff', backgroundColor: '#2F4F4F', margin: 0, fontSize: '13px' },
  statusBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', borderRadius: '20px', border: '2px solid', marginBottom: '20px' },
  visitorCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  vName: { margin: 0, fontSize: '24px', color: '#1E293B', fontWeight: '900' },
  vPhone: { fontSize: '14px', color: '#64748B' },
  statusBadge: { padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' },
  guestPanel: { backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '16px', marginBottom: '20px' },
  panelTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '10px' },
  guestGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  guestTag: { backgroundColor: '#fff', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid #E2E8F0', color: '#334155' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' },
  infoItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', fontWeight: '600' },
  nextBtn: { width: '100%', padding: '16px', backgroundColor: '#4F7942', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }
};