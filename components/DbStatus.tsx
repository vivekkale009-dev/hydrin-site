"use client";
import { useEffect, useState } from 'react';

export default function DbStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        setOnline(res.ok);
      } catch {
        setOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      left: '10px', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px',
      background: 'rgba(0,0,0,0.6)',
      padding: '4px 8px',
      borderRadius: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: online === null ? '#EAB308' : online ? '#22C55E' : '#EF4444',
        boxShadow: online ? '0 0 8px #22C55E' : 'none'
      }} />
      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#fff' }}>
        {online === null ? 'CHECKING' : online ? 'DB ONLINE' : 'DB OFFLINE'}
      </span>
    </div>
  );
}