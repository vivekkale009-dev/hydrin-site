"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function ProjectCertificatePage() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Input States
  const [studentName, setStudentName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [department, setDepartment] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
    if (!studentName || !projectTitle || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs/key");

    setLoading(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [79, 121, 66]; 

      // --- 1. WATERMARK ---
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
        doc.addImage("/OnlyESLogo.png", "PNG", 55, 100, 100, 100);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 })); 
      } catch (e) { }

      // --- 2. HEADER LOGO ---
      try { doc.addImage("/EarthyLogo.JPG", "JPEG", 20, 15, 58, 26); } catch (e) { }

      // --- 3. COMPANY DETAILS ---
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Earthy Source Foods And Beverages", 190, 22, { align: "right" });
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text([
        "Gut no 253, Nimgaon Khairi, Puntamba road,",
        "Shrirampur, Dist - Ahilyanagar, MH 413709",
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });

      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.6);
      doc.line(20, 48, 190, 48);

      // --- 4. PUNCHLINE ---
      doc.setFillColor(252, 253, 252);
      doc.setDrawColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setLineWidth(0.1);
      doc.rect(20, 52, 170, 8, "FD");
      doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text('"Nourishing the Planet, Rooted in Purity — From Earth to Your Soul."', 105, 57.2, { align: "center" });

      // --- 5. REF & DATE ---
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`Ref: ESFB/PROJ/2026/${serial}`, 20, 72);
      doc.text(`Date: ${dateStr}`, 190, 72, { align: "right" });

      // --- 6. CERTIFICATE TITLES ---
      doc.setFontSize(28);
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICATE", 105, 95, { align: "center", charSpace: 3 });
      
      doc.setFontSize(10);
      doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.text("O F   C O M P L E T I O N", 105, 102, { align: "center" });

      // --- 7. BODY CONTENT ---
      doc.setFontSize(11.5);
      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      doc.setLineHeightFactor(1.6);

      let currentY = 118;
      doc.text("This is to formally certify that", 20, currentY);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(0);
      doc.text(`Mr./Ms. ${studentName}`, 105, currentY + 10, { align: "center" });
      doc.setLineWidth(0.3);
      doc.line(70, currentY + 12, 140, currentY + 12); 

      doc.setFontSize(11.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);

      const p1 = `enrolled in the ${department} program at ${collegeName}, has successfully completed an Industrial Project with Earthy Source Foods And Beverages.`;
      const p1Lines = doc.splitTextToSize(p1, 170);
      doc.text(p1Lines, 20, currentY + 22);

      currentY += 22 + (p1Lines.length * 7);
      doc.text("The project was conducted under the title:", 20, currentY);
      
      doc.setFont("helvetica", "bolditalic");
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.text(`"${projectTitle}"`, 105, currentY + 8, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      doc.text(`during the tenure starting from ${startDate} to ${endDate}.`, 20, currentY + 16);

      const p4 = `Throughout the project duration, the candidate exhibited exceptional dedication, a proactive learning attitude, and a high level of professional ethics. All technical objectives set for the project were met satisfactorily.`;
      const p4Lines = doc.splitTextToSize(p4, 170);
      doc.text(p4Lines, 20, currentY + 26);

      currentY += 26 + (p4Lines.length * 7);
      doc.text("We appreciate the candidate's contribution and wish them a successful career ahead.", 20, currentY);

      // --- 8. NOTE & QR CODE ---
      currentY += 12;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.setDrawColor(200);
      doc.line(20, currentY, 20, currentY + 12); 
      doc.text(doc.splitTextToSize("Note: All proprietary data, formulations, and process information used in this project remains the exclusive Intellectual Property of Earthy Source Foods and Beverages.", 160), 25, currentY + 5);

      // QR Code Position (Pushed slighty below to 235)
      const qrSize = 25;
      const qrY = 235; 
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ESFB-PROJ-VERIFY-${serial}`;
      doc.addImage(qrUrl, "PNG", 105 - (qrSize/2), qrY, qrSize, qrSize);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("SCAN TO VERIFY AUTHENTICITY", 105, qrY + qrSize + 5, { align: "center" });

      // --- 9. SIGNATURE SECTION ---
      const sigY = 265;
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.5);
      
      // Left Signature
      doc.line(20, sigY, 75, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("Industry Mentor / Supervisor", 47.5, sigY + 5, { align: "center" });
      doc.setFontSize(8);
      doc.text("(Industrial Operations)", 47.5, sigY + 9, { align: "center" });

      // Right Signature
      doc.line(135, sigY, 190, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Authorized Signatory", 162.5, sigY + 5, { align: "center" });
      doc.setFontSize(8);
      doc.text("(Management)", 162.5, sigY + 9, { align: "center" });

      // --- 10. FOOTER BAND ---
      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(7.5);
      doc.text("SHRIRAMPUR FACILITY   |   CERTIFICATE OF INDUSTRIAL TRAINING   |   EARTHY SOURCE FOODS AND BEVERAGES", 105, 292, { align: "center", charSpace: 0.2 });

      // Final Process
      const blob = doc.output('blob');
      const cleanFileName = `ESFB_PROJ_2026_${serial}.pdf`;
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', cleanFileName);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_no: serial, category: 'PROJECT CERTIFICATE', document_url: uploadResult.url })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Project Certificate Issued Successfully!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '35px', borderRadius: '20px', boxShadow: '0 15px 50px rgba(0,0,0,0.15)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 5px 0', textAlign: 'center' }}>Project Completion Portal</h2>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '25px' }}>Industrial Training Division</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b', fontWeight:'bold'}}>Certificate ID</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'18px'}}>#ESFB-PROJ-2026-{serial}</b>
          </div>

          <input placeholder="Student Full Name" style={s.input} onChange={e => setStudentName(e.target.value)} />
          <input placeholder="College / University Name" style={s.input} onChange={e => setCollegeName(e.target.value)} />
          <input placeholder="Department (e.g. B.Tech Food Tech)" style={s.input} onChange={e => setDepartment(e.target.value)} />
          <input placeholder="Project Title" style={s.input} onChange={e => setProjectTitle(e.target.value)} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
             <div style={{flex: 1}}><label style={s.label}>Start Date</label>
             <input type="text" placeholder="01 Jan 2026" style={s.input} onChange={e => setStartDate(e.target.value)} /></div>
             
             <div style={{flex: 1}}><label style={s.label}>End Date</label>
             <input type="text" placeholder="31 Jan 2026" style={s.input} onChange={e => setEndDate(e.target.value)} /></div>
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "GENERATING CERTIFICATE..." : "ISSUE OFFICIAL CERTIFICATE"}
          </button>
        </div>

        {pdfUrl && (
          <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px' }}>
              DOWNLOAD CERTIFICATE PDF ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  label: { fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display:'block', fontWeight:'bold' as 'bold', textTransform: 'uppercase' as 'uppercase' },
  input: { width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: '0.3s' },
  btn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' as 'bold', marginTop: '10px', fontSize: '14px', letterSpacing: '1px' }
};