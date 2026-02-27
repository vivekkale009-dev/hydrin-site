"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import { useParams } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function PublicVisitorPass() {
  const { id } = useParams();
  const [visitor, setVisitor] = useState<any>(null);

  useEffect(() => {
    const fetchVisitor = async () => {
      const { data } = await supabase.from('visitor_passes').select('*').eq('id', id).single();
      if (data) setVisitor(data);
    };
    fetchVisitor();
  }, [id]);

  if (!visitor) return <div style={{textAlign: 'center', padding: '50px'}}>Loading Pass...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfdfa', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '350px', padding: '30px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid #eef0f2' }}>
        <img src="/EarthyLogo.JPG" style={{ width: '150px', marginBottom: '20px' }} alt="Logo" />
        <div style={{ padding: '15px', backgroundColor: '#fcfdfa', borderRadius: '20px', display: 'inline-block', marginBottom: '15px', border: '1px solid #f1f5f9' }}>
          <QRCodeSVG value={visitor.id} size={200} fgColor="#2f4f4f" />
        </div>
        <h2 style={{ color: '#2f4f4f', margin: '10px 0 5px 0', fontSize: '24px' }}>{visitor.visitor_name}</h2>
        <p style={{ fontSize: '12px', color: '#4F7942', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>OFFICIAL VISITOR</p>
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: '#94a3b8' }}>ID: {visitor.serial_no}</span>
          <span style={{ color: '#94a3b8' }}>{new Date(visitor.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}