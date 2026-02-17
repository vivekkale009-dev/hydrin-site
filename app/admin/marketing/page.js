"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xyyirkwiredufamtnqdu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eWlya3dpcmVkdWZhbXRucWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzU4NTMsImV4cCI6MjA3ODYxMTg1M30.224kMghJSknWvvTNeJdhFr_iDvnaU-IXh5MdPmN2XSQ');

export default function AdminDashboard() {
    const [allData, setAllData] = useState([]);
    const [employees, setEmployees] = useState([]); // Added to store contact numbers
    const [selectedExec, setSelectedExec] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => { 
        fetchData();
        fetchEmployees(); // Fetch employee details on load
    }, [date]);

    async function fetchEmployees() {
        const { data } = await supabase.from('employees').select('full_name, contact_number');
        setEmployees(data || []);
    }

    async function fetchData() {
        const { data } = await supabase.from('marketing_visits')
            .select('*')
            .gte('created_at', `${date}T00:00:00.000Z`)
            .lte('created_at', `${date}T23:59:59.999Z`)
            .order('created_at', { ascending: true });
        setAllData(data || []);
        if (data && data.length > 0 && !selectedExec) setSelectedExec(data[0].executive_name);
    }

    const updateVisitStatus = async (id, newStatus) => {
        const { error } = await supabase.from('marketing_visits').update({ admin_status: newStatus }).eq('id', id);
        if (!error) fetchData();
    };

    const executives = [...new Set(allData.map(v => v.executive_name))];
    const filteredVisits = allData.filter(v => v.executive_name === selectedExec);

    const getWorkDuration = () => {
        if (filteredVisits.length < 2) return "0h 0m";
        const start = new Date(filteredVisits[0].created_at);
        const end = new Date(filteredVisits[filteredVisits.length - 1].created_at);
        const diff = Math.abs(end - start);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const openMapRoute = () => {
        if(filteredVisits.length === 0) return;
        const points = filteredVisits.map(v => `${v.latitude},${v.longitude}`).join('/');
        window.open(`https://www.google.com/maps/dir/${points}`, '_blank');
    };

    // START OF DAY: Send Link
    const shareToWhatsapp = (name) => {
        const emp = employees.find(e => e.full_name === name);
        const phone = emp?.contact_number || "";
        const msg = `Hi ${name}, please use this link to report your shop visits for today: ${window.location.origin}/marketing`; 
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // END OF DAY: Send Summary
    const sendEndDaySummary = () => {
        const emp = employees.find(e => e.full_name === selectedExec);
        const phone = emp?.contact_number || "";
        const total = filteredVisits.length;
        const approved = filteredVisits.filter(v => v.admin_status === 'Approved').length;
        
        let report = `*Daily Visit Summary (${date})*\n`;
        report += `Executive: ${selectedExec}\n`;
        report += `Total Stops: ${total}\n`;
        report += `Approved: ${approved}\n`;
        report += `Duration: ${getWorkDuration()}\n\n`;
        report += `*Details:*\n`;
        filteredVisits.forEach((v, i) => {
            report += `${i+1}. ${v.shop_name} - ${v.admin_status || 'Pending'}\n`;
        });

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(report)}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial', backgroundColor: '#f0f2f5' }}>
            <div style={{ width: '320px', backgroundColor: '#2F4F4F', color: 'white', padding: '25px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'white', padding: '15px', borderRadius: '15px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                    <img src="/EarthyLogo.JPG" width="140" alt="Earthy Source" />
                </div>
                <h3>SELECT DATE</h3>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={dateInput} />
                <h3>STAFF</h3>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {executives.map(name => (
                        <div key={name} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', 
                            cursor: 'pointer', borderRadius: '10px', marginBottom: '10px', transition: '0.3s',
                            backgroundColor: selectedExec === name ? '#007bff' : 'rgba(255,255,255,0.05)',
                            border: selectedExec === name ? '1px solid #007bff' : '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div onClick={() => setSelectedExec(name)} style={{ flex: 1 }}>👤 {name}</div>
                            <button onClick={(e) => { e.stopPropagation(); shareToWhatsapp(name); }} style={waBtnStyle}>💬</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {!selectedExec ? (
                    <div style={{ textAlign: 'center', marginTop: '100px', color: '#888' }}><h2>No visits recorded.</h2></div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div>
                                <h1 style={{ margin: 0 }}>{selectedExec}'s Route</h1>
                                <small style={{color: '#666'}}>Date: {date}</small>
                            </div>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button onClick={sendEndDaySummary} style={{...btnRoute, background: '#25D366'}}>📲 Send End Day Report</button>
                                <button onClick={openMapRoute} style={btnRoute}>🗺️ Trace Sequence Route</button>
                            </div>
                        </div>

                        <div style={statsRow}>
                            <div style={statCard}>Stops<br/><strong>{filteredVisits.length}</strong></div>
                            <div style={statCard}>Work Duration<br/><strong>{getWorkDuration()}</strong></div>
                            <div style={statCard} onClick={() => window.location.href='/admin/expenses'} style={{...statCard, cursor:'pointer', border:'1px solid #007bff'}}>
                                💰 Billing<br/><span style={{fontSize:'12px', color:'#007bff'}}>Enter Manual Amount ➔</span>
                            </div>
                        </div>

                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    <th style={th}>#</th><th style={th}>Time</th><th style={th}>Shop</th><th style={th}>Remark</th><th style={th}>Proof</th><th style={th}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisits.map((v, index) => {
                                    const isSameLoc = index > 0 && v.latitude === filteredVisits[index-1].latitude && v.longitude === filteredVisits[index-1].longitude;
                                    return (
                                        <tr key={v.id} style={{ borderBottom: '1px solid #eee', background: isSameLoc ? '#fff3cd' : 'white' }}>
                                            <td style={td}>{isSameLoc && '⚠️'} <strong>{index + 1}</strong></td>
                                            <td style={td}>{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td style={td}>{v.shop_name}</td>
                                            <td style={td}><span style={badge}>{v.outcome}</span></td>
                                            <td style={td}><a href={v.photo_url} target="_blank">🖼️ View</a></td>
                                            <td style={td}>
                                                <select value={v.admin_status || "Pending"} onChange={(e) => updateVisitStatus(v.id, e.target.value)} style={{...actionSelect, backgroundColor: getStatusColor(v.admin_status)}}>
                                                    <option value="Pending">⌛ Pending</option>
                                                    <option value="Approved">✅ Approved</option>
                                                    <option value="Invalid">❌ Invalid</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

const getStatusColor = (s) => (s === 'Approved' ? '#d4edda' : s === 'Invalid' ? '#f8d7da' : '#fff');
const waBtnStyle = { background: '#25D366', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '10px' };
const dateInput = { width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: 'none' };
const btnRoute = { padding: '12px 25px', background: '#2F4F4F', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const statsRow = { display: 'flex', gap: '20px', marginBottom: '30px' };
const statCard = { flex: 1, background: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', borderRadius: '15px', overflow: 'hidden' };
const th = { padding: '18px', textAlign: 'left', color: '#777', fontSize: '12px', textTransform: 'uppercase' };
const td = { padding: '18px', textAlign: 'left', fontSize: '14px' };
const badge = { background: '#f0f2f5', padding: '5px 10px', borderRadius: '5px', fontSize: '12px' };
const actionSelect = { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' };