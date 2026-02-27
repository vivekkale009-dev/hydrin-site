"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function ExperienceLetterPage() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [gender, setGender] = useState("Male");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
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
   if (!name || !role || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs or Invalid Admin PIN.");

    setLoading(true);
    const p = gender === "Male" ? { pro: "He", pos: "His", obj: "him", sal: "Mr." } 
                                : { pro: "She", pos: "Her", obj: "her", sal: "Ms." };

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [21, 128, 61]; 

      // --- 1. IMAGE WATERMARK ---
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage("/OnlyESLogo.png", "PNG", 55, 100, 100, 100);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 })); 
      } catch (e) { console.log("Watermark image missing"); }

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
        //"CIN: U15400MH2026PTC000000 | ISO 9001:2015 Certified",
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });

      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.8);
      doc.line(20, 48, 190, 48);

      // --- 4. DOCUMENT METADATA ---
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`REF ID: ESFB/HR/EXP/2026/${serial}`, 20, 60);
      doc.text(`ISSUANCE DATE: ${dateStr.toUpperCase()}`, 190, 60, { align: "right" });

      // --- 5. MAIN TITLE ---
      doc.setFontSize(24);
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.text("EXPERIENCE CERTIFICATE", 105, 82, { align: "center", charSpace: 1 });
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(65, 85, 145, 85);

      // --- 6. CONTENT BODY (GENERALIZED) ---
      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text("TO WHOM IT MAY CONCERN", 20, 105);

      doc.setFont("helvetica", "normal");
      doc.setLineHeightFactor(1.7);
      
      const bodyText = [
        `This is to formally certify that ${p.sal} ${name.toUpperCase()} was associated with Earthy Source Foods And Beverages in a full-time professional capacity from ${start} to ${end}.`,
        "",
        `During the tenure of ${p.pos.toLowerCase()} service, ${p.pro} held the position of ${role}.`,
        "",
        `Through the course of ${p.pos.toLowerCase()} engagement, we found ${p.obj} to be hardworking, dedicated, and professionally committed to the organizational goals. ${p.pos} conduct and character were found to be excellent and aligned with the values of Earthy Source.`,
        "",
        `${p.pro} is leaving the services of the company on ${p.pos.toLowerCase()} own accord for better prospects. We appreciate the contributions made during ${p.pos.toLowerCase()} service and wish ${p.obj} every success in all future endeavors.`
      ];

      doc.text(doc.splitTextToSize(bodyText.join('\n'), 170), 20, 115);

      // --- 7. AUTHENTICATION FOOTER ---
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
      doc.text(`Authorized by: HR Department`, 24, footY + 11);
      doc.text(`Location: Shrirampur Facility [UNIT-01]`, 24, footY + 15);
      doc.text(`Timestamp: ${dateStr} @ ${now.toLocaleTimeString()}`, 24, footY + 19);

      // QR Code with Frame
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
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("For Earthy Source Foods And Beverages", 20, footY + 38);
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.line(20, footY + 41, 85, footY + 41);
      doc.text("Human Resources Manager", 20, footY + 46);

      // --- 8. DISCLAIMER & FOOTER BAND ---
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(140);
      const disclaimer = "This document is electronically generated and authenticated. It carries a digital signature and a unique identification serial for integrity purposes. No physical signature is required. Alteration of this document is a punishable offense.";
      doc.text(doc.splitTextToSize(disclaimer, 170), 105, 278, { align: "center" });

      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("SHRIRAMPUR FACILITY   |   OFFICIAL RECORD OF SERVICE   |   VALIDATION PORTAL: WWW.EARTHYSOURCE.IN", 105, 292, { align: "center" });

      // Save & Sync
      const blob = doc.output('blob');
      const cleanFileName = `ESFB_EXP_2026_${serial}.pdf`;
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', cleanFileName);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_no: serial, category: 'EXPERIENCE CERTIFICATE', document_url: uploadResult.url })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Certificate Generated and Stored Successfully!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 10px 0' }}>Experience Certificate Portal</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b', letterSpacing:'1px'}}>Reference Number</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ESFB-EXP-2026-{serial}</b>
          </div>

          <input placeholder="Full Name" style={s.input} onChange={e => setName(e.target.value)} />
          <div style={{display:'flex', gap:'10px'}}>
             <select style={{...s.input, flex: 1}} onChange={e => setGender(e.target.value)}>
               <option value="Male">Male</option>
               <option value="Female">Female</option>
             </select>
             <input placeholder="Designation" style={{...s.input, flex: 2}} onChange={e => setRole(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <div style={{flex: 1}}><label style={s.label}>Join Date</label><input type="date" style={s.input} onChange={e => setStart(e.target.value)} /></div>
             <div style={{flex: 1}}><label style={s.label}>Relief Date</label><input type="date" style={s.input} onChange={e => setEnd(e.target.value)} /></div>
          </div>
          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "ISSUING CERTIFICATE..." : "GENERATE OFFICIAL CERTIFICATE"}
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
  input: { width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' },
  btn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' as 'bold', marginTop: '10px' }
};