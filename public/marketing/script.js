import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xyyirkwiredufamtnqdu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eWlya3dpcmVkdWZhbXRucWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzU4NTMsImV4cCI6MjA3ODYxMTg1M30.224kMghJSknWvvTNeJdhFr_iDvnaU-IXh5MdPmN2XSQ');

export default function AdminMarketingDashboard() {
    const [visits, setVisits] = useState([]);

    useEffect(() => {
        const fetchVisits = async () => {
            const { data } = await supabase.from('marketing_visits').select('*').order('created_at', { ascending: false });
            setVisits(data || []);
        };
        fetchVisits();
    }, []);

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                <img src="/EarthyLogo.JPG" width="100" />
                <h1 style={{ color: '#2F4F4F' }}>Marketing Performance Admin</h1>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#2F4F4F', color: 'white' }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Time</th>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Executive</th>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Client/Shop</th>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Outcome</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Proof</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Map</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visits.map((v) => (
                            <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{new Date(v.created_at).toLocaleString()}</td>
                                <td style={{ padding: '12px' }}><strong>{v.executive_name}</strong></td>
                                <td style={{ padding: '12px' }}>{v.shop_name}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ 
                                        padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: v.outcome === 'Order Placed' ? '#d4edda' : '#eee',
                                        color: v.outcome === 'Order Placed' ? '#155724' : '#666'
                                    }}>{v.outcome}</span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {v.photo_url ? <a href={v.photo_url} target="_blank" style={{ color: '#007bff' }}>View Photo</a> : 'No Photo'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => window.open(`https://www.google.com/maps?q=${v.latitude},${v.longitude}`, '_blank')}
                                        style={{ background: '#2F4F4F', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
                                    >📍 View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}