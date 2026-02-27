"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function LetterheadPortal() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Content State
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [adminKey, setAdminKey] = useState("");

  const fetchSerial = async () => {
    try {
      // Added a timestamp to bust any browser cache
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  };

  useEffect(() => { fetchSerial(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || adminKey !== EXPECTED_LETTER_KEY) return alert("Please enter content and valid Admin PIN");

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

      // --- 2. SECURITY BORDER ---
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.rect(5, 5, 200, 287); 

      // --- 3. HEADER ---
      try { doc.addImage("/EarthyLogo.JPG", "JPEG", 20, 15, 58, 26); } catch (e) { }

      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Earthy Source Foods And Beverages", 190, 22, { align: "right" });
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text([
        "Regd. Office: Gut no 253, Nimgaon Khairi, Puntamba road,",
        "Shrirampur, Dist - Ahilyanagar, MH 413709",
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });

      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.8);
      doc.line(20, 48, 190, 48);

      // --- 4. METADATA ---
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`REF: ESFB/LTR/2026/${serial}`, 20, 60);
      doc.text(`DATE: ${dateStr.toUpperCase()}`, 190, 60, { align: "right" });

      // --- 5. RECIPIENT & SUBJECT ---
      let currentY = 75;
      
      if(recipient) {
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.text("To,", 20, currentY);
        doc.text(recipient.toUpperCase(), 20, currentY + 5);
        currentY += 18;
      }

      if(subject) {
        doc.setFont("helvetica", "bold");
        doc.text(`Subject: ${subject.toUpperCase()}`, 20, currentY);
        doc.setLineWidth(0.2);
        doc.line(20, currentY + 1, 20 + doc.getTextWidth(`Subject: ${subject}`), currentY + 1);
        currentY += 12;
      }

      // --- 6. BODY CONTENT ---
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setLineHeightFactor(1.6);
      const splitContent = doc.splitTextToSize(content, 170);
      doc.text(splitContent, 20, currentY);
      
      // Calculate dynamic footer position
      const bodyHeight = (splitContent.length * 7);
      const footY = Math.max(220, currentY + bodyHeight + 15);

      // --- 7. AUTHENTICATION FOOTER ---
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
      doc.text(`Authorized by: Earthy Source Admin`, 24, footY + 11);
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

      // Signatory
      const sigY = footY + 38;
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("For Earthy Source Foods And Beverages", 20, sigY);
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.line(20, sigY + 3, 85, sigY + 3);
      doc.text("Authorized Signatory", 20, sigY + 8);

      // --- 8. FOOTER BAND ---
      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.text("SHRIRAMPUR FACILITY   |   OFFICIAL COMMUNICATION   |   WWW.EARTHYSOURCE.IN", 105, 292, { align: "center" });

      // --- SAVE & SYNC (WITH SERIAL REFRESH) ---
      const blob = doc.output('blob');
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', `ESFB_LTR_${serial}.pdf`);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            serial_no: serial, 
            category: 'OFFICIAL LETTERHEAD', 
            document_url: uploadResult.url 
        })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Document Issued Successfully!");
        // CRITICAL: Fetching next serial after successful issue
        await fetchSerial();
      }
    } catch (err: any) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', marginBottom: '20px' }}>Letterhead Management</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b', letterSpacing:'1px'}}>Current Ref Serial</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ESFB-LTR-2026-{serial}</b>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input placeholder="To / Recipient Name" style={{...s.input, flex: 1}} onChange={e => setRecipient(e.target.value)} />
            <input placeholder="Subject" style={{...s.input, flex: 1}} onChange={e => setSubject(e.target.value)} />
          </div>

          <textarea 
            placeholder="Enter letter content here..." 
            style={{...s.input, height: '250px', lineHeight: '1.6'}} 
            onChange={e => setContent(e.target.value)} 
          />

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "PROCESSING..." : "GENERATE OFFICIAL LETTER"}
          </button>
        </div>

        {pdfUrl && (
          <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: '#f0fdf4', borderRadius: '10px' }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 'bold', textDecoration: 'none' }}>
              VIEW GENERATED PDF ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  input: { width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' },
  btn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' as 'bold', marginTop: '10px' }
};