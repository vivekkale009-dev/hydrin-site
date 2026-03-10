'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GSTFilingPage() {
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState('2026-03');
  const [loading, setLoading] = useState(true);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [supplyType, setSupplyType] = useState('all');

  useEffect(() => { fetchData(); }, [month]);

  async function fetchData() {
    setLoading(true);
    // Ensure your backend API selects 'hsn_code' from the database
    const res = await fetch(`/api/admin/gst?month=${month}`);
    const resData = await res.json();
    setData(resData);
    setLoading(false);
  }

  // --- FILTER LOGIC ---
  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    
    return data.records.filter((rec: any) => {
      const matchesSearch = 
        rec.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
		rec.hsn_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const isMaharashtra = rec.place_of_supply?.toLowerCase().includes('maharashtra');
      const matchesSupply = 
        supplyType === 'all' ? true :
        supplyType === 'intra' ? isMaharashtra :
        !isMaharashtra;

      return matchesSearch && matchesSupply;
    });
  }, [data, searchQuery, supplyType]);

  // --- EXPORT LOGIC ---
  
  // NEW: Download exactly what you see on the screen
  const downloadFilteredView = () => {
    if (!filteredRecords.length) return alert("No records to export");
    
    const headers = ["Date", "Order ID", "Invoice #", "Customer", "GSTIN", "HSN", "Taxable Value", "CGST", "SGST", "IGST", "Place of Supply"];
    const rows = filteredRecords.map((r: any) => [
      r.invoice_date, r.order_number, r.invoice_no, r.customer_name, 
      r.customer_gstin || "URD", r.hsn_code || "N/A", r.taxable_value, 
      r.cgst_amount, r.sgst_amount, r.igst_amount, r.place_of_supply
    ]);
    
    exportToCSV(headers, rows, `Filtered_GST_View_${month}.csv`);
  };

  const downloadB2BCSV = () => {
    const b2bOnly = data?.records?.filter((r: any) => r.is_gst_invoice && r.customer_gstin && r.customer_gstin !== 'URD');
    if (!b2bOnly?.length) return alert("No B2B records found for this month");
    
    const headers = ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date", "Invoice Value", "Place Of Supply", "Reverse Charge", "Applicable % of Tax Rate", "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"];
    const rows = b2bOnly.map((inv: any) => [
      inv.customer_gstin, inv.customer_name, inv.invoice_no, inv.invoice_date,
      inv.total_invoice_value, inv.place_of_supply || "27-Maharashtra", "N", "", "Regular", "",
      inv.gst_rate, inv.taxable_value, "0"
    ]);
    exportToCSV(headers, rows, `GSTR1_B2B_${month}.csv`);
  };

  const downloadHSNCSV = () => {
    if (!data?.hsnSummary?.length) return alert("No HSN data found");
    const headers = ["HSN", "Description", "UQC", "Total Quantity", "Total Value", "Taxable Value", "Integrated Tax", "Central Tax", "State Tax", "Cess"];
    const rows = data.hsnSummary.map((h: any) => [
      h.hsn_code, "Packaged Water", "BTL-BOTTLES", h.total_count,
      (Number(h.total_taxable) + Number(h.total_cgst) + Number(h.total_sgst) + Number(h.total_igst)).toFixed(2),
      Number(h.total_taxable).toFixed(2), Number(h.total_igst).toFixed(2),
      Number(h.total_cgst).toFixed(2), Number(h.total_sgst).toFixed(2), "0.00"
    ]);
    exportToCSV(headers, rows, `GSTR1_HSN_Table12_${month}.csv`);
  };

  const exportToCSV = (headers: string[], rows: any[], fileName: string) => {
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", fileName);
    link.click();
  };

  // --- PDF VIEWER ---
  async function handleViewPDF(fullPath: string) {
    if (!fullPath) return alert("PDF not linked to this record");
    let bucket = 'tax-invoices'; 
    let filePath = fullPath;
    if (fullPath.includes('/')) {
      const parts = fullPath.split('/');
      bucket = parts[0]; 
      filePath = parts.slice(1).join('/'); 
    }
    const cleanPath = filePath.replace(/^\/+/, '');
    const { data: signedUrl, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, 120);
    
    if (signedUrl?.signedUrl) {
      window.open(signedUrl.signedUrl, '_blank');
    } else {
      alert(`Error: ${error?.message || 'File not found'}\nBucket: ${bucket}\nPath: ${cleanPath}`);
    }
  }

  const totals = data?.totals || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };

  return (
    <div style={{ padding: "40px", background: "#f1f5f9", minHeight: "100vh", fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        
        {/* Header with Export Buttons */}
        <div style={headerContainer}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b' }}>GST Filing Hub</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Ready for GSTR-1 & GSTR-3B (2026 Compliance)</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={filterInput} />
            <button onClick={downloadFilteredView} style={viewBtnStyle}>💾 Export Current View</button>
            <button onClick={downloadB2BCSV} style={secondaryBtnStyle}>⬇️ B2B CSV</button>
            <button onClick={downloadHSNCSV} style={addBtnStyle}>⬇️ HSN Table 12 CSV</button>
          </div>
        </div>

        {/* SEARCH & STATE FILTERS */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search Invoice, Order ID, Customer Name or HSN Code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...filterInput, flex: 1 }}
          />
          <select 
            value={supplyType} 
            onChange={(e) => setSupplyType(e.target.value)} 
            style={filterInput}
          >
            <option value="all">All Supplies</option>
            <option value="intra">Intra-State (Maharashtra)</option>
            <option value="inter">Inter-State (Outside)</option>
          </select>
        </div>

        {/* GSTR-3B Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <StatCard label="Total Taxable Value" val={totals.taxable} border="#94a3b8" />
          <StatCard label="CGST (Table 3.1a)" val={totals.cgst} border="#10b981" color="#10b981" />
          <StatCard label="SGST (Table 3.1a)" val={totals.sgst} border="#10b981" color="#10b981" />
          <StatCard label="IGST (Table 3.1a)" val={totals.igst} border="#0A6CFF" color="#0A6CFF" />
        </div>

        {/* Transaction Table */}
        <div style={tableWrapperStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={tHeadStyle}>Order ID (OURN)</th>
                <th style={tHeadStyle}>Invoice #</th>
                <th style={tHeadStyle}>Recipient / GSTIN</th>
                <th style={tHeadStyle}>HSN Code</th>
                <th style={tHeadStyle}>Taxable</th>
                <th style={tHeadStyle}>GST Breakup</th>
                <th style={tHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{padding: '50px', textAlign: 'center', color: '#94a3b8'}}>Fetching records...</td></tr>
              ) : filteredRecords.map((rec: any) => (
                <tr key={rec.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tCellStyle}>
                    <div style={{fontWeight: 700, color: '#0A6CFF'}}>{rec.order_number || '---'}</div>
                    <div style={{fontSize: '0.75rem', color: '#64748b'}}>{rec.invoice_date}</div>
                  </td>
                  <td style={tCellStyle}>
                    <div style={{fontWeight: 600}}>{rec.invoice_no}</div>
                    <span style={statusBadge(rec.is_gst_invoice ? 'B2B' : 'B2C')}>
                      {rec.is_gst_invoice ? 'GST' : 'RETAIL'}
                    </span>
                  </td>
                  <td style={tCellStyle}>
                    <div style={{fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{rec.customer_name}</div>
                    <div style={{fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace'}}>{rec.customer_gstin || 'URD'}</div>
                  </td>
                  <td style={tCellStyle}>
                    <code style={{background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px'}}>{rec.hsn_code || '---'}</code>
                  </td>
                  <td style={tCellStyle}><strong>₹{rec.taxable_value.toLocaleString('en-IN')}</strong></td>
                  <td style={tCellStyle}>
                    <div style={{fontSize: '0.75rem'}}>C+S: ₹{(rec.cgst_amount + rec.sgst_amount).toFixed(2)}</div>
                    <div style={{fontSize: '0.75rem', color: '#0A6CFF'}}>IGST: ₹{rec.igst_amount.toFixed(2)}</div>
                  </td>
                  <td style={tCellStyle}>
                    <button onClick={() => handleViewPDF(rec.invoice_pdf_path)} style={viewBtnStyle}>
                      📄 View PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sub-components & Styles
function StatCard({ label, val, border, color }: any) {
  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "12px", borderLeft: `5px solid ${border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
      <span style={labelStyle}>{label}</span>
      <strong style={{ fontSize: '1.3rem', color: color || '#1e293b' }}>₹{val.toLocaleString('en-IN')}</strong>
    </div>
  );
}

const headerContainer = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const filterInput = { padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600 };
const addBtnStyle = { background: "#0A6CFF", color: "white", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" };
const secondaryBtnStyle = { background: "#f0f9ff", color: "#0A6CFF", border: "1px solid #0A6CFF", padding: "12px 24px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" };
const viewBtnStyle = { background: "white", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: '#475569' };
const tableWrapperStyle = { background: "white", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" };
const tHeadStyle: React.CSSProperties = { padding: "16px 20px", textAlign: 'left', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' };
const tCellStyle: React.CSSProperties = { padding: "16px 20px", fontSize: "0.9rem" };
const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", marginBottom: "5px", textTransform: "uppercase" as const };
const statusBadge = (type: string): React.CSSProperties => ({
  fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', display: 'inline-block',
  background: type === 'B2B' ? '#dcfce7' : '#f1f5f9', color: type === 'B2B' ? '#15803d' : '#475569'
});