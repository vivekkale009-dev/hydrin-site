"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function InternshipLetterPortal() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [dept, setDept] = useState("Production & Quality");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [adminKey, setAdminKey] = useState("");
  
  // Responsibilities State
  const [tasks, setTasks] = useState([
    "Assisting in daily production monitoring and documentation.",
    "Conducting basic quality checks under senior supervision."
  ]);

  const fetchSerial = async () => {
    try {
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  };

  useEffect(() => { fetchSerial(); }, []);

  const addTask = () => setTasks([...tasks, ""]);
  const removeTask = () => { if (tasks.length > 1) setTasks(tasks.slice(0, -1)); };
  const updateTask = (i: number, val: string) => {
    const newTasks = [...tasks];
    newTasks[i] = val;
    setTasks(newTasks);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs/key");

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
      doc.text(`REF ID: ESFB/INT/2026/${serial}`, 20, 58);
      doc.text(`ISSUANCE DATE: ${dateStr.toUpperCase()}`, 190, 58, { align: "right" });

      // --- 4. CONTENT ---
      doc.setFontSize(10.5);
      doc.text([
        "To,",
        name.toUpperCase(),
        address.toUpperCase()
      ], 20, 70);

      doc.setFont("helvetica", "bold");
      doc.text("Subject: Internship Offer / Completion Letter", 105, 95, { align: "center" });
      doc.line(65, 96, 145, 96);

      doc.setFont("helvetica", "normal");
      doc.text(`Dear ${name},`, 20, 105);
      
      const intro = `We are pleased to offer you an internship opportunity at Earthy Source Foods And Beverages. This internship is designed to provide you with hands-on experience in the food and beverage industry.`;
      doc.text(doc.splitTextToSize(intro, 170), 20, 112);

      // Internship Stats Box
      doc.setFillColor(249, 250, 251);
      doc.rect(20, 122, 170, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Internship Details:", 25, 128);
      doc.setFont("helvetica", "normal");
      doc.text(`• Duration: ${start || "___"} to ${end || "___"}`, 25, 134);
      doc.text(`• Department: ${dept}`, 25, 139);

      let currentY = 152;
      doc.text("During your tenure, you will be responsible for the following tasks:", 20, currentY);
      currentY += 6;

      tasks.forEach((task) => {
        if(!task) return;
        doc.text("•", 25, currentY);
        doc.text(doc.splitTextToSize(task, 160), 30, currentY);
        currentY += 6;
      });

      doc.text("We expect you to maintain the highest standards of professional conduct and confidentiality regarding our proprietary processes. We look forward to a productive association.", 20, currentY + 5, { maxWidth: 170 });

      // --- 5. AUTHENTICATION FOOTER ---
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

      // --- SIGNATORY (FIXED) ---
      const sigY = footY + 38; // DEFINED sigY variable
      
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Yours Sincerely,", 20, sigY);
      doc.text("For Earthy Source Foods And Beverages", 20, sigY + 5);
      
      // Signature line placed clearly below the text
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.3);
      doc.line(20, sigY + 12, 85, sigY + 12); 
      
      doc.setFontSize(9);
      doc.text("(Authorized Signatory)", 20, sigY + 17);

      // --- DISCLAIMER & FOOTER ---
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(140);
      const disclaimer = "This is an electronically generated internship document with a digital signature and unique tracking ID. No physical signature required. Alteration is a punishable offense.";
      doc.text(doc.splitTextToSize(disclaimer, 170), 105, 280, { align: "center" });

      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(7.5);
      doc.text("SHRIRAMPUR FACILITY   |   CAREER DEVELOPMENT   |   EARTHY SOURCE FOODS AND BEVERAGES", 105, 292, { align: "center" });

      // --- SAVE & SYNC ---
      const blob = doc.output('blob');
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', `ESFB_INT_2026_${serial}.pdf`);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            serial_no: serial, 
            category: 'Internship Letter', 
            document_url: uploadResult.url 
        })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Internship Letter Issued Successfully!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 10px 0' }}>Internship Letter Manager</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b'}}>Tracking Reference</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ES-INT-2026-{serial}</b>
          </div>

          <input placeholder="Intern Full Name" style={s.input} onChange={e => setName(e.target.value)} />
          <input placeholder="Intern Address" style={s.input} onChange={e => setAddress(e.target.value)} />
          
          <div style={{display:'flex', gap:'10px'}}>
             <div style={{flex: 1}}><label style={s.label}>Start Date</label><input type="date" style={s.input} onChange={e => setStart(e.target.value)} /></div>
             <div style={{flex: 1}}><label style={s.label}>End Date</label><input type="date" style={s.input} onChange={e => setEnd(e.target.value)} /></div>
          </div>

          <input placeholder="Department (e.g. Quality Control)" style={s.input} value={dept} onChange={e => setDept(e.target.value)} />

          <div style={{border:'1px solid #e2e8f0', padding:'15px', borderRadius:'10px'}}>
            <label style={s.label}>Responsibilities / Tasks</label>
            {tasks.map((task, i) => (
                <div key={i} style={{display:'flex', gap:'10px', marginBottom:'8px'}}>
                    <input placeholder="Task Description" style={s.input} value={task} onChange={e => updateTask(i, e.target.value)} />
                </div>
            ))}
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={addTask} style={s.miniBtn}>+ Add Responsibility</button>
                <button onClick={removeTask} style={{...s.miniBtn, background:'#fee2e2', color:'#b91c1c'}}>Remove Last</button>
            </div>
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "ISSUING LETTER..." : "GENERATE INTERNSHIP LETTER"}
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