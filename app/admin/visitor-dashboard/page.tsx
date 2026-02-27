"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, UserPlus, LayoutDashboard, Search, 
  ExternalLink, Clock, Download, Calendar, MessageSquare, Phone
} from 'lucide-react';
import CreateVisitorPass from '../visitor-pass/page'; 

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'create'>('overview');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [securityPhone, setSecurityPhone] = useState(''); // New State for Security Phone
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();
    const subscription = supabase
      .channel('table-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_passes' }, () => {
        fetchVisitors();
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('visitor_passes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setVisitors(data);
    setLoading(false);
  };

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = v.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.serial_no.toLowerCase().includes(searchTerm.toLowerCase());
    const visitDate = new Date(v.created_at).toISOString().split('T')[0];
    const matchesStart = !startDate || visitDate >= startDate;
    const matchesEnd = !endDate || visitDate <= endDate;
    return matchesSearch && matchesStart && matchesEnd;
  });

  const totalVisits = visitors.length;
  const currentlyInside = visitors.filter(v => v.status === 'checked_in').length;

  const downloadCSV = () => {
    const headers = ["Date", "Serial No", "Visitor Name", "Phone", "Purpose", "Guests", "Status", "In-Time", "Out-Time"];
    const rows = filteredVisitors.map(v => [
      new Date(v.created_at).toLocaleDateString(),
      v.serial_no,
      v.visitor_name,
      v.phone_number,
      v.purpose,
      1 + parseInt(v.additional_guests || 0),
      v.status,
      v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString() : 'N/A',
      v.check_out_time ? new Date(v.check_out_time).toLocaleTimeString() : 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Earthy_Source_Report.csv`);
    link.click();
  };

  const sendSecurityInstructions = () => {
    if (!securityPhone) {
      alert("Please enter a security phone number first.");
      return;
    }
    // Clean phone number (remove spaces/dashes)
    const cleanPhone = securityPhone.replace(/\D/g, '');
    const gateLink = `${window.location.origin}/security/gate-control`;
    const message = `*SECURITY INSTRUCTIONS - EARTHY SOURCE*%0A%0AHello Security Team,%0A%0APlease use the following link to scan visitor QR codes for Entry/Exit:%0A%0A🔗 *Gate Scanner:* ${gateLink}%0A%0A*Instructions:*%0A1. Open link on mobile.%0A2. Allow camera access.%0A3. Scan visitor's QR code.`;
    
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <img src="/EarthyLogo.JPG" style={styles.sideLogo} alt="Logo" />
        </div>
        <p style={styles.brandTitle}>Admin Panel</p>
        
        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('overview')} style={{...styles.navItem, ...(activeTab === 'overview' ? styles.navActive : {})}}><LayoutDashboard size={20} /> Visitor Log</button>
          <button onClick={() => setActiveTab('create')} style={{...styles.navItem, ...(activeTab === 'create' ? styles.navActive : {})}}><UserPlus size={20} /> Create New Pass</button>
        </nav>

        {/* SECURITY WHATSAPP SECTION */}
        <div style={styles.securityBox}>
          <p style={styles.securityLabel}>SECURITY WHATSAPP</p>
          <div style={styles.phoneInputWrapper}>
            <Phone size={14} style={styles.phoneIcon} />
            <input 
              type="text" 
              placeholder="Guard Phone No." 
              value={securityPhone}
              onChange={(e) => setSecurityPhone(e.target.value)}
              style={styles.phoneInput}
            />
          </div>
          <button onClick={sendSecurityInstructions} style={styles.broadcastBtn}>
            <MessageSquare size={16} /> Send Scanner Link
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>{activeTab === 'overview' ? 'Visitor Log Dashboard' : 'Generate Entry Pass'}</h1>
          <button onClick={downloadCSV} style={styles.csvBtn}><Download size={16} /> Export CSV</button>
        </header>

        {activeTab === 'overview' ? (
          <>
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={{...styles.statIcon, backgroundColor: '#E0F2FE'}}><Users color="#0369A1" /></div>
                <div><p style={styles.statLabel}>Total Visits</p><h3 style={styles.statValue}>{totalVisits}</h3></div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.statIcon, backgroundColor: '#DCFCE7'}}><Clock color="#15803D" /></div>
                <div><p style={styles.statLabel}>Currently Inside</p><h3 style={styles.statValue}>{currentlyInside}</h3></div>
              </div>
            </div>

            <div style={styles.contentCard}>
              <div style={styles.toolbar}>
                <div style={styles.searchWrapper}>
                  <Search size={18} style={styles.searchIcon} />
                  <input placeholder="Search name/serial..." style={styles.searchInput} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div style={styles.dateFilters}>
                  <div style={styles.dateInputGroup}><Calendar size={14} color="#94A3B8" /><input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <span style={{color: '#CBD5E1'}}>to</span>
                  <div style={styles.dateInputGroup}><Calendar size={14} color="#94A3B8" /><input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Visitor</th>
                      <th style={styles.th}>Serial & Purpose</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>In/Out Time</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisitors.map((v) => (
                      <tr key={v.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(v.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}><div style={styles.vName}>{v.visitor_name}</div><div style={styles.vPhone}>{v.phone_number}</div></td>
                        <td style={styles.td}><div style={styles.serialBadge}>{v.serial_no}</div><div style={styles.purposeText}>{v.purpose}</div></td>
                        <td style={styles.td}>
                          <span style={{...styles.statusTag, backgroundColor: v.status === 'checked_in' ? '#DCFCE7' : v.status === 'checked_out' ? '#F1F5F9' : '#FEF3C7', color: v.status === 'checked_in' ? '#166534' : v.status === 'checked_out' ? '#475569' : '#92400E'}}>
                            {v.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                           <div style={{fontSize: '11px', fontWeight:'600'}}>In: {v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</div>
                           <div style={{fontSize: '11px', color:'#94A3B8'}}>Out: {v.check_out_time ? new Date(v.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</div>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => window.open(`/visitor/pass?id=${v.id}`, '_blank')} style={styles.iconBtn}><ExternalLink size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.createWrapper}><CreateVisitorPass /></div>
        )}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '260px', backgroundColor: '#2F4F4F', color: '#fff', padding: '30px 20px', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 10 },
  logoContainer: { backgroundColor: '#fff', padding: '10px', borderRadius: '15px', display: 'flex', justifyContent: 'center', marginBottom: '10px' },
  sideLogo: { height: '50px', width: 'auto' },
  brandTitle: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7, marginBottom: '40px', textAlign: 'center' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', color: '#CBD5E1', cursor: 'pointer', fontWeight: '600', textAlign: 'left' },
  navActive: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' },
  
  // Security Section in Sidebar
  securityBox: { marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '15px' },
  securityLabel: { fontSize: '10px', fontWeight: 'bold', color: '#94A3B8', marginBottom: '10px', letterSpacing: '1px' },
  phoneInputWrapper: { position: 'relative', marginBottom: '10px' },
  phoneIcon: { position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' },
  phoneInput: { width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: 'none', backgroundColor: '#1F3A3A', color: '#fff', fontSize: '13px', outline: 'none' },
  broadcastBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  
  main: { flex: 1, marginLeft: '260px', padding: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  headerTitle: { fontSize: '24px', fontWeight: '800', color: '#1E293B' },
  csvBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4F7942', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '20px', marginBottom: '30px' },
  statCard: { flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #E2E8F0' },
  statIcon: { padding: '12px', borderRadius: '12px' },
  statLabel: { fontSize: '12px', fontWeight: 'bold', color: '#64748B', margin: 0 },
  statValue: { fontSize: '24px', fontWeight: '900', color: '#1E293B', margin: 0 },
  contentCard: { backgroundColor: '#fff', borderRadius: '24px', padding: '25px', border: '1px solid #E2E8F0' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', gap: '20px' },
  searchWrapper: { position: 'relative', flex: 1, maxWidth: '300px' },
  searchIcon: { position: 'absolute', left: '14px', top: '12px', color: '#94A3B8' },
  searchInput: { width: '100%', padding: '11px 11px 11px 42px', borderRadius: '10px', border: '1.5px solid #E2E8F0', outline: 'none' },
  dateFilters: { display: 'flex', alignItems: 'center', gap: '10px' },
  dateInputGroup: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px' },
  dateInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '600' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', fontSize: '11px', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', borderBottom: '2px solid #F1F5F9' },
  tr: { borderBottom: '1px solid #F8FAFC' },
  td: { padding: '15px', fontSize: '14px' },
  vName: { fontWeight: '700', color: '#1E293B' },
  vPhone: { fontSize: '12px', color: '#64748B' },
  serialBadge: { fontSize: '11px', fontWeight: '800', color: '#2F4F4F' },
  purposeText: { fontSize: '12px', color: '#64748B' },
  statusTag: { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' },
  iconBtn: { padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', color: '#64748B' },
  createWrapper: { maxWidth: '1000px', margin: '0 auto' }
};