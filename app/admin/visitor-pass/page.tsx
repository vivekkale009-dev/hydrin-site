"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import { UserPlus, Send, ArrowLeft, Users, ClipboardList, ShieldCheck, Car, Briefcase, User } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CreateVisitorPass() {
  const [form, setForm] = useState({ 
    visitor_name: '', 
    phone_number: '', 
    vehicle_no: '', 
    purpose: '', 
    host_person: '', 
    additional_count: 0,
    guest_names_input: '' 
  });
  const [passData, setPassData] = useState<{id: string, serial: string, totalCount: number} | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.visitor_name || !form.phone_number) {
      alert("Please enter Name and Phone Number");
      return;
    }
    setLoading(true);
    
    const guestArray = form.guest_names_input.split(',').map(n => n.trim()).filter(n => n !== "");
    const professionalSerial = `ESF-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const { data, error } = await supabase.from('visitor_passes').insert([{ 
      visitor_name: form.visitor_name, 
      phone_number: form.phone_number, 
      vehicle_no: form.vehicle_no,
      purpose: form.purpose, 
      host_person: form.host_person, 
      serial_no: professionalSerial,
      guest_names: guestArray, 
      additional_guests: form.additional_count.toString(), 
      status: 'pending' 
    }]).select().single();

    if (!error && data) {
      setPassData({ id: data.id, serial: professionalSerial, totalCount: form.additional_count });
    } else {
        alert(error?.message);
    }
    setLoading(false);
  };

const handleWhatsApp = () => {
  if (!passData) return;
  
  // CHANGE THIS LINE: point to /visitor/pass
  const passUrl = `${window.location.origin}/visitor/pass?id=${passData.id}`;
  
  const message = `*EARTHY SOURCE FOODS AND BEVERAGES*%0A` +
                  `*Digital Visitor Pass*%0A` +
                  `----------------------------%0A` +
                  `*Visitor:* ${form.visitor_name}%0A` +
                  `*Purpose:* ${form.purpose}%0A` +
                  `*Pass ID:* ${passData.serial}%0A%0A` +
                  `*CLICK TO OPEN YOUR QR PASS:*%0A` +
                  `${passUrl}`;

  window.open(`https://api.whatsapp.com/send?phone=91${form.phone_number}&text=${message}`, '_blank');
};

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topNav}>
          <Link href="/admin/dashboard" style={styles.backLink}><ArrowLeft size={18}/> Back</Link>
          <img src="/EarthyLogo.JPG" alt="Earthy Source" style={styles.navLogo} />
        </div>
        
        <div style={styles.card}>
          <div style={styles.formSide}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconCircle}><UserPlus color="#fff" size={20} /></div>
              <h2 style={styles.title}>Visitor Entry</h2>
            </div>
            
            <div style={styles.gridForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Visitor Name</label>
                <input style={styles.input} value={form.visitor_name} onChange={e => setForm({...form, visitor_name: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>WhatsApp Number</label>
                <input style={styles.input} value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Additional Person Count</label>
                <div style={{position:'relative'}}>
                  <Users size={16} style={styles.innerIcon}/>
                  <input type="number" style={styles.input} value={form.additional_count} onChange={e => setForm({...form, additional_count: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Vehicle Number</label>
                <div style={{position:'relative'}}>
                  <Car size={16} style={styles.innerIcon}/>
                  <input style={styles.input} placeholder="MH 12..." value={form.vehicle_no} onChange={e => setForm({...form, vehicle_no: e.target.value})} />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Purpose of Visit</label>
                <div style={{position:'relative'}}>
                  <Briefcase size={16} style={styles.innerIcon}/>
                  <input style={styles.input} value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Meeting With (Host)</label>
                <div style={{position:'relative'}}>
                  <User size={16} style={styles.innerIcon}/>
                  <input style={styles.input} value={form.host_person} onChange={e => setForm({...form, host_person: e.target.value})} />
                </div>
              </div>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                <label style={styles.label}>Guest Names (Optional)</label>
                <div style={{position:'relative'}}>
                  <ClipboardList size={16} style={styles.innerIcon}/>
                  <input style={styles.input} placeholder="Name 1, Name 2..." value={form.guest_names_input} onChange={e => setForm({...form, guest_names_input: e.target.value})} />
                </div>
              </div>
            </div>

            <button onClick={handleCreate} disabled={loading} style={styles.mainBtn}>
              {loading ? "Processing..." : "Generate Digital Pass"}
            </button>
          </div>

          <div style={styles.previewSide}>
            {passData ? (
              <div style={{textAlign:'center', width:'100%'}}>
                <div style={styles.passCard}>
                  <div style={styles.passHeader}><ShieldCheck size={14}/> OFFICIAL GATE PASS</div>
                  <QRCodeSVG value={`${window.location.origin}/security/gate-control?id=${passData.id}`} size={140} />
                  <h3 style={{margin: '15px 0 5px', color:'#2F4F4F'}}>{form.visitor_name}</h3>
                  <p style={{fontSize: '11px', color: '#4F7942', fontWeight:'bold', textTransform:'uppercase'}}>
                    {form.purpose} — {1 + passData.totalCount} People
                  </p>
                  <div style={styles.passMeta}>
                    <span>ID: {passData.serial}</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={handleWhatsApp} style={styles.whatsappBtn}><Send size={18}/> Send to Visitor</button>
              </div>
            ) : <div style={{color:'#94a3b8'}}>Complete form to see pass</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { minHeight: '100vh', backgroundColor: '#F4F7F2', padding: '30px' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  navLogo: { height: '35px' },
  backLink: { display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontWeight: 'bold' },
  card: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', backgroundColor: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' },
  formSide: { padding: '40px' },
  sectionHeader: { display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '30px' },
  iconCircle: { backgroundColor: '#2F4F4F', padding: '8px', borderRadius: '10px' },
  title: { fontSize: '22px', color: '#1E293B', margin: 0, fontWeight: '800' },
  gridForm: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' },
  input: { padding: '12px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px' },
  innerIcon: { position: 'absolute', right: '12px', top: '12px', color: '#cbd5e1' },
  mainBtn: { width: '100%', padding: '16px', backgroundColor: '#2F4F4F', color: '#fff', border: 'none', borderRadius: '12px', marginTop: '30px', fontWeight: 'bold', cursor: 'pointer' },
  previewSide: { backgroundColor: '#F8FAFC', padding: '40px', display: 'flex', justifyContent: 'center' },
  passCard: { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', textAlign: 'center', border: '1px solid #E2E8F0', marginBottom: '20px' },
  passHeader: { fontSize: '10px', fontWeight: 'bold', color: '#4F7942', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  passMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' },
  whatsappBtn: { width: '100%', padding: '14px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }
};