"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Fixed import
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function ProjectSponsorshipPortal() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Form State
  const [collegeName, setCollegeName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [city, setCity] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [students, setStudents] = useState([{ name: "", roll: "" }]);

  const fetchSerial = async () => {
    try {
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  };

  useEffect(() => { fetchSerial(); }, []);

  const addStudent = () => setStudents([...students, { name: "", roll: "" }]);
  const removeStudent = () => {
    if (students.length > 1) setStudents(students.slice(0, -1));
  };

  const updateStudent = (index: number, field: string, value: string) => {
    const newStudents = [...students];
    (newStudents[index] as any)[field] = value;
    setStudents(newStudents);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName || !projectTitle || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs/key");

    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [21, 128, 61]; 

      // --- 1. IMAGE WATERMARK ---
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
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
      doc.text(`REF NO: ES/PROJ/2026/${serial}`, 20, 60);
      doc.text(`DATE: ${dateStr.toUpperCase()}`, 190, 60, { align: "right" });

      // --- 5. ADDRESS & SUBJECT ---
      doc.setFontSize(10.5);
      doc.text([
        "To,",
        "The Head of Department / Principal,",
        collegeName.toUpperCase(),
        `${deptName}, ${city}`
      ], 20, 75);

      doc.setFont("helvetica", "bold");
      doc.text("Subject: Confirmation of Industrial Project Sponsorship for Final Year Students", 105, 100, { align: "center" });
      doc.setLineWidth(0.2);
      doc.line(45, 101, 165, 101);

      // --- 6. BODY CONTENT ---
      doc.setFont("helvetica", "normal");
      doc.text("Dear Sir/Madam,", 20, 110);
      
      const introText = "With reference to the request received from your institution, we are pleased to inform you that Earthy Source Foods And Beverages has decided to sponsor and provide industrial guidance for the final year project of the following students:";
      doc.text(doc.splitTextToSize(introText, 170), 20, 118);

      // Student Table - Fixed function call
      autoTable(doc, {
        startY: 130,
        head: [['Sr. No.', 'Student Name', 'Roll Number']],
        body: students.map((s, i) => [i + 1, s.name.toUpperCase(), s.roll]),
        theme: 'grid',
        headStyles: { fillColor: [249, 249, 249], textColor: [47, 79, 79], fontStyle: 'bold' },
        styles: { fontSize: 9.5, cellPadding: 4, font: 'helvetica' },
        margin: { left: 20, right: 20 }
      });

      // Get Y position after table safely
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.text(`Project Title: ${projectTitle.toUpperCase()}`, 20, finalY);

      doc.setFont("helvetica", "normal");
      const closingText = "During the tenure of this project, the students will be allowed to access our facility at Shrirampur for data collection, observation, and technical research under the supervision of our technical team. We expect the students to maintain strict industrial discipline and adhere to our safety and confidentiality protocols.\n\nWe wish the students the very best for their academic endeavor.";
      doc.text(doc.splitTextToSize(closingText, 170), 20, finalY + 10);

      // --- 7. AUTHENTICATION FOOTER ---
      const footY = 220;
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
      doc.text(`Authorized by: HR/Technical Dept`, 24, footY + 11);
      doc.text(`Location: Shrirampur Facility [UNIT-01]`, 24, footY + 15);
      doc.text(`Timestamp: ${dateStr} @ ${now.toLocaleTimeString()}`, 24, footY + 19);

      const qrData = `https://earthysource.in/verify/${serial}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      try {
        doc.setDrawColor(220);
        doc.rect(165, footY - 2, 26, 26); 
        doc.addImage(qrUrl, "PNG", 166.5, footY - 0.5, 23, 23);
        doc.setFontSize(6);
        doc.text("SCAN FOR AUTHENTICITY", 178, footY + 28, { align: "center" });
      } catch (e) {}

      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(["Yours Sincerely,", "For Earthy Source Foods And Beverages"], 20, footY + 40);
      doc.text("(Authorized Signatory)", 20, footY + 55);

      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.text("SHRIRAMPUR FACILITY   |   ACADEMIC COLLABORATION   |   WWW.EARTHYSOURCE.IN", 105, 292, { align: "center" });

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
        body: JSON.stringify({ 
            serial_no: serial, 
            category: 'PROJECT SPONSORSHIP', 
            document_url: uploadResult.url 
        })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Sponsorship Letter Generated and Stored!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 10px 0' }}>Project Sponsorship Portal</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b', letterSpacing:'1px'}}>Reference Number</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ES/PROJ/2026-{serial}</b>
          </div>

          <input placeholder="College Name" style={s.input} value={collegeName} onChange={e => setCollegeName(e.target.value)} />
          <div style={{display:'flex', gap:'10px'}}>
             <input placeholder="Department" style={{...s.input, flex: 2}} value={deptName} onChange={e => setDeptName(e.target.value)} />
             <input placeholder="City" style={{...s.input, flex: 1}} value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <input placeholder="Project Title" style={s.input} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />

          <div style={{border:'1px solid #e2e8f0', padding:'15px', borderRadius:'10px'}}>
            <label style={s.label}>STUDENT LIST</label>
            {students.map((st, i) => (
                <div key={i} style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                    <input placeholder="Name" style={s.input} value={st.name} onChange={e => updateStudent(i, 'name', e.target.value)} />
                    <input placeholder="Roll No" style={{...s.input, width:'120px'}} value={st.roll} onChange={e => updateStudent(i, 'roll', e.target.value)} />
                </div>
            ))}
            <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                <button onClick={addStudent} style={s.miniBtn}>+ Add Student</button>
                <button onClick={removeStudent} style={{...s.miniBtn, background:'#fee2e2', color:'#b91c1c'}}>Remove Last</button>
            </div>
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#4F7942'}}>
            {loading ? "GENERATING..." : "GENERATE OFFICIAL SPONSORSHIP"}
          </button>
        </div>

        {pdfUrl && (
          <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: '#f0fdf4', borderRadius: '10px' }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 'bold', textDecoration: 'none' }}>
              VIEW FINAL DOCUMENT ↗
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
  btn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' as 'bold', marginTop: '10px' },
  miniBtn: { padding: '8px 12px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' as 'bold' }
};