"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function RelievingLetterPage() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [adminKey, setAdminKey] = useState("");

  const fetchSerial = async () => {
    try {
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  };

  useEffect(() => { fetchSerial(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeId || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs/key");

    setLoading(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [21, 128, 61]; 

      // --- 1. IMAGE WATERMARK ---
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
        doc.addImage("/OnlyESLogo.png", "PNG", 55, 100, 100, 100);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 })); 
      } catch (e) { }

      // --- 2. SECURITY BORDER ---
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.rect(5, 5, 200, 287); 

      // --- 3. LOGO & HEADER ---
      try {
        doc.addImage("/EarthyLogo.JPG", "JPEG", 20, 15, 58, 26); 
      } catch (e) { }

      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Earthy Source Foods And Beverages", 190, 22, { align: "right" });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text([
        "Regd. Office: Gut no 253, Nimgaon Khairi, Puntamba road,",
        "Shrirampur, Dist - Ahilyanagar, MH 413709",
        "GSTIN: 27BGJPK0016J1ZK",
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });

      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.8);
      doc.line(20, 48, 190, 48);

      // --- 4. PUNCHLINE ---
      doc.setFillColor(252, 253, 252);
      doc.setDrawColor(79, 121, 66);
      doc.setLineWidth(0.2);
      doc.rect(20, 52, 170, 8, "FD");
      doc.setTextColor(79, 121, 66);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text('"Nourishing the Planet, Rooted in Purity — From Earth to Your Soul."', 105, 57.5, { align: "center" });

      // --- 5. DOCUMENT METADATA ---
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`REF: ESFB/HR/REL/2026/${serial}`, 20, 70);
      doc.text(`DATE: ${dateStr.toUpperCase()}`, 190, 70, { align: "right" });

      // --- 6. MAIN TITLE ---
      doc.setFontSize(22);
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.text("RELIEVING LETTER", 105, 92, { align: "center", charSpace: 1 });
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(65, 95, 145, 95);

      // --- 7. CONTENT BODY ---
      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      
      let currentY = 110;
      doc.text("To,", 20, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(name.toUpperCase(), 20, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(`Employee ID: ${employeeId}`, 20, currentY + 12);

      currentY += 25;
      doc.setFont("helvetica", "bold");
      doc.text(`Dear ${name},`, 20, currentY);
      doc.setFont("helvetica", "normal");
      
      const bodyText = [
        `This has reference to your resignation letter dated ${resignationDate}. We would like to inform you that your resignation has been accepted and you are hereby relieved from the services of Earthy Source Foods And Beverages at the close of business hours on ${lastWorkingDay}.`,
        "",
        "We confirm that you have completed all exit formalities and handed over all company assets and records in your possession. There are no outstanding dues between you and the company.",
        "",
        "We take this opportunity to thank you for your services and wish you the very best in your future career."
      ];

      const splitText = doc.splitTextToSize(bodyText.join('\n'), 170);
      doc.text(splitText, 20, currentY + 10);

      // --- 8. AUTHENTICATION FOOTER ---
      const footY = 220;

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
      doc.text([
        `Authorized by: HR Department`,
        `Location: Shrirampur Facility [UNIT-01]`,
        `Timestamp: ${dateStr} @ ${now.toLocaleTimeString()}`
      ], 24, footY + 11);

      // QR Code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=REL-${serial}`;
      try {
        doc.setDrawColor(220);
        doc.rect(170, footY - 2, 21, 21);
        doc.addImage(qrUrl, "PNG", 171.5, footY - 0.5, 18, 18);
        doc.setFontSize(6);
        doc.text("SCAN FOR AUTHENTICITY", 180, footY + 23, { align: "center" });
      } catch (e) {}

      // Manual Signatory Space
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("For Earthy Source Foods And Beverages", 20, footY + 38);
      doc.line(20, footY + 41, 85, footY + 41);
      doc.text("Authorized Signatory", 20, footY + 46);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Human Resources Department", 20, footY + 51);

      // --- 9. FOOTER BAND ---
      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.text("SHRIRAMPUR FACILITY   |   OFFICIAL RECORD OF SERVICE   |   WWW.EARTHYSOURCE.IN", 105, 292, { align: "center" });

      // Save & Sync
      const blob = doc.output('blob');
      const cleanFileName = `ESFB_REL_2026_${serial}.pdf`;
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', cleanFileName);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_no: serial, category: 'RELIEVING LETTER', document_url: uploadResult.url })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Relieving Letter Issued Successfully!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 10px 0' }}>Relieving Letter Portal</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b', letterSpacing:'1px'}}>Relieving Serial</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ESFB-REL-2026-{serial}</b>
          </div>

          <input placeholder="Employee Full Name" style={s.input} onChange={e => setName(e.target.value)} />
          <input placeholder="Employee ID (e.g. ES-104)" style={s.input} onChange={e => setEmployeeId(e.target.value)} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
             <div style={{flex: 1}}><label style={s.label}>Resignation Date</label>
             <input type="text" placeholder="20 Jan 2026" style={s.input} onChange={e => setResignationDate(e.target.value)} /></div>
             
             <div style={{flex: 1}}><label style={s.label}>Last Working Day</label>
             <input type="text" placeholder="28 Feb 2026" style={s.input} onChange={e => setLastWorkingDay(e.target.value)} /></div>
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "PROCESSING..." : "GENERATE RELIEVING LETTER"}
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
  label: { fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display:'block', fontWeight:'bold' as 'bold' },
  input: { width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' },
  btn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' as 'bold', marginTop: '10px' }
};