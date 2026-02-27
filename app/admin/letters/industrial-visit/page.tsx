"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function IndustrialVisitPortal() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  const [collegeName, setCollegeName] = useState("");
  const [city, setCity] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [adminKey, setAdminKey] = useState("");
  
  const [rows, setRows] = useState([
    { label: "Date of Visit", value: "" },
    { label: "Reporting Time", value: "10:30 AM" },
    { label: "No. of Students", value: "" },
    { label: "Faculty Coordinators", value: "" },
    { label: "Earthy Source Contact", value: "" }
  ]);

  const fetchSerial = async () => {
    try {
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  };

  useEffect(() => { fetchSerial(); }, []);

  const addRow = () => setRows([...rows, { label: "", value: "" }]);
  const removeRow = () => { if (rows.length > 1) setRows(rows.slice(0, -1)); };

  const updateRow = (index: number, field: 'label' | 'value', val: string) => {
    const newRows = [...rows];
    newRows[index][field] = val;
    setRows(newRows);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs/key");

    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [21, 128, 61]; 

      // --- 1. WATERMARK ---
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage("/OnlyESLogo.png", "PNG", 55, 100, 100, 100);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 })); 
      } catch (e) { }

      // --- 2. HEADER ---
      try { doc.addImage("/EarthyLogo.JPG", "JPEG", 20, 15, 58, 26); } catch (e) { }

      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Earthy Source Foods And Beverages", 190, 22, { align: "right" });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text([
        "Gut no 253, Nimgaon Khairi, Puntamba road,",
        "Shrirampur, Dist - Ahilyanagar, MH 413709",
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });

      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.8);
      doc.line(20, 48, 190, 48);

      // --- 3. METADATA ---
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`REF ID: ESFB/IV/2026/${serial}`, 20, 58);
      doc.text(`ISSUANCE DATE: ${dateStr.toUpperCase()}`, 190, 58, { align: "right" });

      // --- 4. CONTENT ---
      doc.setFontSize(10.5);
      doc.text([
        "To,",
        "The Principal / Training & Placement Officer,",
        collegeName.toUpperCase(),
        city.toUpperCase()
      ], 20, 70);

      doc.setFont("helvetica", "bold");
      doc.text("Subject: Permission for Industrial Visit to Our Shrirampur Facility", 105, 95, { align: "center" });
      doc.line(55, 96, 155, 96);

      doc.setFont("helvetica", "normal");
      doc.text("Dear Sir/Madam,", 20, 105);
      
      const intro = `With reference to your formal request dated ${requestDate || "____"}, we are pleased to grant permission for your students to visit our plant for an educational tour.`;
      doc.text(doc.splitTextToSize(intro, 170), 20, 112);

      // Compact Visit Table
      autoTable(doc, {
        startY: 120,
        head: [['Particulars', 'Details']],
        body: rows.map(r => [r.label, r.value]),
        theme: 'grid',
        headStyles: { fillColor: [249, 249, 249], textColor: slateGreen, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
        margin: { left: 20, right: 20 }
      });

      const tableY = (doc as any).lastAutoTable.finalY + 6;

      // Rules Box
      doc.setFillColor(252, 253, 252);
      doc.rect(20, tableY, 170, 20, "F");
      doc.setDrawColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setLineWidth(0.6);
      doc.line(20, tableY, 20, tableY + 20);
      
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("Safety & Plant Guidelines:", 24, tableY + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.text([
        "- Visitors must wear head caps and aprons (provided at entry).",
        "- Photography is strictly prohibited inside the production area.",
        "- Discipline must be maintained throughout the plant visit."
      ], 24, tableY + 10);

      doc.text("Our technical team will guide students through our automated lines to understand industrial workflow and quality standards.", 20, tableY + 28, { maxWidth: 170 });

      // --- 5. AUTHENTICATION FOOTER ---
      const footY = tableY + 40; // Spacing adjusted to prevent overflow

      // Digital Signature Box
      doc.setDrawColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setFillColor(248, 255, 248);
      doc.setLineWidth(0.4);
      doc.roundedRect(20, footY, 75, 22, 1, 1, "FD");
      
      doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("VERIFIED DIGITAL SIGNATURE", 24, footY + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.text(`Authorized by: Plant Manager`, 24, footY + 11);
      doc.text(`Location: Shrirampur Facility [UNIT-01]`, 24, footY + 15);
      doc.text(`Timestamp: ${dateStr} @ ${now.toLocaleTimeString()}`, 24, footY + 19);

      // QR Code
      const qrData = `https://earthysource.in/verify/${serial}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      try {
        doc.setDrawColor(220);
        doc.rect(165, footY - 2, 26, 26); 
        doc.addImage(qrUrl, "PNG", 166.5, footY - 0.5, 23, 23);
        doc.setFontSize(6);
        doc.text("SCAN FOR AUTHENTICITY", 178, footY + 28, { align: "center" });
      } catch (e) {}

      // --- SIGNATORY (POSITION FIXED) ---
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Yours Sincerely,", 20, footY + 36);
      doc.text("For Earthy Source Foods And Beverages", 20, footY + 41);
      
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.3);
      doc.line(20, footY + 44, 85, footY + 44); // Signature line
      
      doc.setFontSize(9);
      doc.text("(Authorized Signatory)", 20, footY + 49);

      // Disclaimer (Pushed slightly lower to sit just above band)
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(140);
      const disclaimer = "This is an electronically authenticated document with a digital signature and unique serial. No physical signature required. Alteration is a punishable offense.";
      doc.text(doc.splitTextToSize(disclaimer, 170), 105, 280, { align: "center" });

      // Footer Band
      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(7.5);
      doc.text("SHRIRAMPUR FACILITY   |   INDUSTRIAL OUTREACH   |   WWW.EARTHYSOURCE.IN", 105, 292, { align: "center" });

      // --- SAVE & SYNC ---
      const blob = doc.output('blob');
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', `ESFB_IV_2026_${serial}.pdf`);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            serial_no: serial, 
            category: 'Industrial Visit Permission', 
            document_url: uploadResult.url 
        })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Visit Permission Issued!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 10px 0' }}>Industrial Visit Manager</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b'}}>Reference Number</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ES-IV-2026-{serial}</b>
          </div>

          <input placeholder="College/Institute Name" style={s.input} onChange={e => setCollegeName(e.target.value)} />
          <div style={{display:'flex', gap:'10px'}}>
             <input placeholder="City" style={{...s.input, flex: 1}} onChange={e => setCity(e.target.value)} />
             <input placeholder="Request Letter Date" style={{...s.input, flex: 1}} onChange={e => setRequestDate(e.target.value)} />
          </div>

          <div style={{border:'1px solid #e2e8f0', padding:'15px', borderRadius:'10px'}}>
            <label style={s.label}>Visit Schedule Details</label>
            {rows.map((r, i) => (
                <div key={i} style={{display:'flex', gap:'10px', marginBottom:'8px'}}>
                    <input placeholder="Label" style={{...s.input, flex:1}} value={r.label} onChange={e => updateRow(i, 'label', e.target.value)} />
                    <input placeholder="Value" style={{...s.input, flex:1.5}} value={r.value} onChange={e => updateRow(i, 'value', e.target.value)} />
                </div>
            ))}
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={addRow} style={s.miniBtn}>+ Add Row</button>
                <button onClick={removeRow} style={{...s.miniBtn, background:'#fee2e2', color:'#b91c1c'}}>Remove Last</button>
            </div>
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "ISSUING PERMISSION..." : "GENERATE OFFICIAL PERMISSION"}
          </button>
        </div>

        {pdfUrl && (
          <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: '#f0fdf4', borderRadius: '10px' }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 'bold', textDecoration: 'none' }}>
              VIEW FINAL PDF ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  label: { fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display:'block', fontWeight:'bold' as 'bold', textTransform: 'uppercase' as 'uppercase' },
  input: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' },
  btn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' as 'bold' },
  miniBtn: { padding: '8px 12px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' as 'bold' }
};