"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  FileText, History, PlusCircle, Download, ExternalLink, 
  Search, RefreshCcw, GraduationCap, Briefcase, Mail, 
  Building2, MapPin, LogOut, Filter, Calendar, ShoppingCart, 
  ChevronDown 
} from 'lucide-react';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LettersAdminDashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'generate'>('history');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Advanced Filters
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('issued_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  // Filter Logic
  const filteredDocs = useMemo(() => {
    let result = documents.filter(doc => 
      doc.serial_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (categoryFilter !== "All") {
      result = result.filter(doc => doc.category === categoryFilter);
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.issue_date).getTime();
      const dateB = new Date(b.issue_date).getTime();
      return dateSort === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [documents, searchTerm, categoryFilter, dateSort]);

  // Updated List based on your folder screenshot
  const letterTypes = [
    { name: "Project Completion", path: "/admin/letters/project-completion-certificate", icon: <GraduationCap size={22} />, color: "#2f4f4f", desc: "For industrial training completion" },
    { name: "Experience Letter", path: "/admin/letters/experience", icon: <Briefcase size={22} />, color: "#4F7942", desc: "For former employees" },
    { name: "Internship Letter", path: "/admin/letters/internship-letter", icon: <FileText size={22} />, color: "#3e6b6b", desc: "For ongoing/finished internships" },
    { name: "Offer Letter", path: "/admin/letters/offer-letter", icon: <Mail size={22} />, color: "#2f4f4f", desc: "New candidate recruitment" },
    { name: "Project Sponsorship", path: "/admin/letters/project-sponsorship", icon: <Building2 size={22} />, color: "#4F7942", desc: "Academic sponsorship letters" },
    { name: "Industrial Visit", path: "/admin/letters/industrial-visit", icon: <MapPin size={22} />, color: "#3e6b6b", desc: "IV permission & certificates" },
    { name: "Relieving Letter", path: "/admin/letters/relieving-letter", icon: <LogOut size={22} />, color: "#8b0000", desc: "Official exit documentation" },
    { name: "Purchase Order", path: "/admin/letters/purchase-order", icon: <ShoppingCart size={22} />, color: "#1e3a3a", desc: "Vendor procurement orders" },
    { name: "Letterhead", path: "/admin/letters/letterhead", icon: <FileText size={22} />, color: "#5a8a54", desc: "Blank official letterheads" },
  ];

  const uniqueCategories = ["All", ...Array.from(new Set(documents.map(d => d.category)))];

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brandContainer}>
           <img src="/EarthyLogo.JPG" alt="Logo" style={styles.logoImg} />
           <div style={styles.brandDivider} />
           <p style={styles.brandTagline}>Industrial Division</p>
        </div>

        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('history')} style={{...styles.navItem, ...(activeTab === 'history' ? styles.navItemActive : {})}}>
            <History size={18} /> <span>Document Vault</span>
          </button>
          <button onClick={() => setActiveTab('generate')} style={{...styles.navItem, ...(activeTab === 'generate' ? styles.navItemActive : {})}}>
            <PlusCircle size={18} /> <span>Issue Center</span>
          </button>
        </nav>
        
        <div style={styles.sidebarFooter}>
            <p>© 2026 Earthy Source Foods</p>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>{activeTab === 'history' ? "Vault Records" : "Select Document Type"}</h1>
            <nav style={styles.breadcrumb}>Portal / <span style={{color: '#4F7942'}}>{activeTab}</span></nav>
          </div>

          <div style={styles.headerActions}>
            {activeTab === 'history' && (
                <div style={styles.searchContainer}>
                    <Search size={16} color="#64748b" />
                    <input type="text" placeholder="Search serial ID..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            )}
            <button onClick={fetchDocuments} style={styles.refreshIconBtn}>
                <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {activeTab === 'history' ? (
          <>
            {/* Filters Row */}
            <div style={styles.filterRow}>
                <div style={styles.filterGroup}>
                    <Filter size={14} />
                    <span style={styles.filterLabel}>Category:</span>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={styles.select}>
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <Calendar size={14} />
                    <span style={styles.filterLabel}>Date:</span>
                    <select value={dateSort} onChange={(e) => setDateSort(e.target.value as any)} style={styles.select}>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
                <div style={{flex: 1}} />
                <div style={styles.statCount}>{filteredDocs.length} Records Found</div>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                <thead>
                    <tr>
                    <th style={styles.th}>Serial ID</th>
                    <th style={styles.th}>Document Type</th>
                    <th style={styles.th}>Issue Date</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={4} style={styles.loader}>Accessing Vault...</td></tr>
                    ) : filteredDocs.map((doc) => (
                    <tr key={doc.id} style={styles.tr}>
                        <td style={styles.td}><span style={styles.serialBadge}>#{doc.serial_no}</span></td>
                        <td style={styles.td}>
                            <div style={styles.typeContainer}>
                                <div style={styles.typeDot} />
                                {doc.category}
                            </div>
                        </td>
                        <td style={styles.td}>{new Date(doc.issue_date).toLocaleDateString('en-GB')}</td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                        <a href={doc.document_url} target="_blank" rel="noreferrer" style={styles.downloadLink}>
                            <Download size={14} /> View
                        </a>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </>
        ) : (
          <div style={styles.grid}>
            {letterTypes.map((letter) => (
              <Link href={letter.path} key={letter.name} style={styles.gridCard}>
                <div style={{...styles.iconWrapper, backgroundColor: letter.color + '10', color: letter.color}}>
                  {letter.icon}
                </div>
                <div style={{flex: 1}}>
                    <h4 style={styles.cardTitle}>{letter.name}</h4>
                    <p style={styles.cardSub}>{letter.desc}</p>
                </div>
                <div style={styles.cardArrow}><ExternalLink size={16} /></div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { display: 'flex', minHeight: '100vh', backgroundColor: '#fcfdfa', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#fff', borderRight: '1px solid #eef0f2', padding: '40px 24px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
  brandContainer: { textAlign: 'center', marginBottom: '40px' },
  logoImg: { width: '170px', marginBottom: '15px' },
  brandDivider: { height: '1px', background: 'linear-gradient(to right, transparent, #d1d5db, transparent)', width: '100%', margin: '0 auto 10px' },
  brandTagline: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', color: '#94a3b8', fontWeight: 'bold' },
  nav: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '16px', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: '600', transition: '0.3s' },
  navItemActive: { backgroundColor: '#2f4f4f', color: '#fff', boxShadow: '0 10px 20px rgba(47, 79, 79, 0.2)' },
  sidebarFooter: { color: '#cbd5e1', fontSize: '11px', textAlign: 'center' },
  content: { flex: 1, padding: '50px 80px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { fontSize: '32px', fontWeight: '800', color: '#1a202c', margin: 0 },
  breadcrumb: { color: '#94a3b8', fontSize: '14px', marginTop: '4px' },
  headerActions: { display: 'flex', gap: '15px' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', width: '320px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  refreshIconBtn: { background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '15px', cursor: 'pointer', color: '#2f4f4f' },
  filterRow: { display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', backgroundColor: '#f1f5f9', padding: '8px 15px', borderRadius: '12px' },
  filterLabel: { fontWeight: '600' },
  select: { border: 'none', background: 'transparent', outline: 'none', color: '#2f4f4f', fontWeight: 'bold', cursor: 'pointer' },
  statCount: { fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' },
  tableCard: { backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #eef0f2', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.04)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '20px 30px', backgroundColor: '#fafafa', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' },
  td: { padding: '22px 30px', borderBottom: '1px solid #f8fafc', fontSize: '15px', color: '#334155' },
  serialBadge: { fontFamily: 'monospace', backgroundColor: '#f8fafc', color: '#2f4f4f', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' },
  typeContainer: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' },
  typeDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4F7942' },
  downloadLink: { color: '#2f4f4f', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' },
  gridCard: { display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #eef0f2', textDecoration: 'none', transition: '0.3s', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  iconWrapper: { width: '60px', height: '60px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#2f4f4f' },
  cardSub: { margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' },
  cardArrow: { color: '#cbd5e1' },
  loader: { textAlign: 'center', padding: '100px', color: '#94a3b8', fontStyle: 'italic' },
  tr: { transition: '0.2s cursor' }
};