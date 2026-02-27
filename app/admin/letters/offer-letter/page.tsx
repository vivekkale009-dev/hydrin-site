"use client";
import React, { useEffect, useState, useCallback } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

export default function OfferLetterPortal() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [basic, setBasic] = useState(0);
  const [hra, setHra] = useState(0);
  const [special, setSpecial] = useState(0);
  const [adminKey, setAdminKey] = useState("");

  const fetchSerial = useCallback(async () => {
    try {
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  }, []);

  useEffect(() => { fetchSerial(); }, [fetchSerial]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs or Admin PIN");

    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [79, 121, 66];
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      // Consistent Page Shell Helper
      const applyPageShell = (footerTxt: string) => {
        doc.setDrawColor(230);
        doc.setLineWidth(0.1);
        doc.rect(5, 5, 200, 287); 
        try {
          doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
          doc.addImage("/OnlyESLogo.png", "PNG", 55, 100, 100, 100);
          doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        } catch (e) {}
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(136);
        doc.text(footerTxt, 105, 282, { align: "center" });
        doc.line(20, 279, 190, 279);
      };

      // Consistent Section Header Helper
      const addH2 = (text: string, y: number) => {
        doc.setFillColor(244, 247, 244);
        doc.rect(20, y, 170, 8, "F");
        doc.setDrawColor(forestGreen[0], forestGreen[1], forestGreen[2]);
        doc.setLineWidth(1);
        doc.line(20, y, 20, y + 8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
        doc.text(text, 26, y + 5.5);
        doc.setTextColor(50); // Reset color for body
      };

      // ================= PAGE 1 =================
      applyPageShell("Strictly Confidential - Earthy Source Foods And Beverages | Page 1 of 3");
      try { doc.addImage("/EarthyLogo.JPG", "JPEG", 20, 15, 58, 26); } catch (e) {}
      
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Earthy Source Foods And Beverages", 190, 22, { align: "right" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85);
       doc.text([
        "Regd. Office: Gut no 253, Nimgaon Khairi, Puntamba road,",
        "Shrirampur, Dist - Ahilyanagar, MH 413709",
        //"GSTIN: 27BGJPK0016J1ZK,
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });
      
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 45, 190, 45);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.text('"Nourishing the Planet, Rooted in Purity — From Earth to Your Soul."', 105, 52, { align: "center" });

      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.text(`Date: ${dateStr}`, 190, 62, { align: "right" });
      doc.text(`Ref: ESFB/HR/2026/APPT-${serial}`, 20, 62);

      doc.setFontSize(16);
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.text("LETTER OF APPOINTMENT", 105, 75, { align: "center" });
      doc.line(75, 77, 135, 77);

      doc.setFontSize(10.5);
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      doc.text("To,", 20, 88);
      doc.setFont("helvetica", "bold");
      doc.text(name.toUpperCase(), 20, 93);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(address, 80), 20, 98);

      doc.setFont("helvetica", "bold");
      doc.text(`Dear ${name},`, 20, 120);
      doc.setFont("helvetica", "normal");
      const intro = `We are pleased to appoint you for the post of ${role.toUpperCase()} at Earthy Source Foods And Beverages. Your employment is subject to the following terms and conditions:`;
      doc.text(doc.splitTextToSize(intro, 170), 20, 126);

      addH2("1. Employment Commencement & Verification", 140);
      doc.setFont("helvetica", "normal");
      const c1 = `Your appointment is effective from ${joiningDate}. This offer is contingent upon the satisfactory result of your educational background and previous employment verification. The Company reserves the right to terminate your services immediately without notice if any discrepancy is discovered.`;
      doc.text(doc.splitTextToSize(c1, 170), 20, 153);

      addH2("2. Probationary Period", 170);
      doc.setFont("helvetica", "normal");
      const c2 = `You will be on probation for 6 months. Management will review your performance and conduct during this period. Unless a written letter of confirmation is issued, your probation will be considered automatically extended.`;
      doc.text(doc.splitTextToSize(c2, 170), 20, 183);

      addH2("3. Confidentiality & Intellectual Property", 200);
      doc.setFont("helvetica", "normal");
      const c3 = `During your service, you will have access to proprietary trade secrets and recipes. You shall maintain absolute secrecy of this data. All inventions and formulations developed by you during your tenure shall remain the exclusive property of Earthy Source.`;
      doc.text(doc.splitTextToSize(c3, 170), 20, 213);

      // QR Code - BOTTOM LEFT
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://earthysource.in/verify/${serial}`;
      doc.setDrawColor(220);
      doc.rect(20, 240, 22, 22);
      doc.addImage(qrUrl, "PNG", 21, 241, 20, 20);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("SCAN TO VERIFY", 31, 265, { align: "center" });

      // Authorized Signatory
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("For Earthy Source Foods And Beverages", 120, 245);
      try { doc.addImage("/Vivek_Sign.png", "PNG", 120, 247, 35, 12); } catch (e) {}
      doc.text("__________________________", 120, 263);
      doc.text("Authorized Signatory", 120, 268);

      // ================= PAGE 2 =================
      doc.addPage();
      applyPageShell("Strictly Confidential - Earthy Source Foods And Beverages | Page 2 of 3");
      try { doc.addImage("/OnlyESLogo.png", "PNG", 175, 12, 15, 15); } catch (e) {}

      addH2("4. Compensation Structure (Annexure A)", 25);
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(20, 36, 170, 9, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.text("Component", 25, 42);
      doc.text("Monthly (INR)", 155, 42);

      doc.setTextColor(50);
      const monthlyVal = Number(basic) + Number(hra) + Number(special);
      const salRows = [
        ["Basic Salary", basic.toLocaleString()],
        ["HRA", hra.toLocaleString()],
        ["Special Allowance", special.toLocaleString()],
        ["Gross Monthly Take-Home", `INR ${monthlyVal.toLocaleString()}`],
        ["Total Annual CTC", `INR ${(monthlyVal * 12).toLocaleString()}`]
      ];

      salRows.forEach((row, i) => {
        const rowY = 45 + (i * 10);
        doc.setFont("helvetica", i >= 3 ? "bold" : "normal");
        if (i >= 3) { doc.setFillColor(238, 242, 239); doc.rect(20, rowY, 170, 10, "F"); }
        doc.setDrawColor(200);
        doc.rect(20, rowY, 170, 10);
        doc.line(145, rowY, 145, rowY + 10);
        doc.text(row[0], 25, rowY + 6.5);
        doc.text(row[1], 155, rowY + 6.5);
      });

      addH2("5. Statutory Exemptions (PF & ESIC)", 105);
      doc.setFont("helvetica", "normal");
      const c5 = `As the firm's current headcount is below the mandatory legal threshold of 20 employees, no deductions for Provident Fund (PF) or ESIC are being made. Statutory benefits will only be applicable once the firm reaches the legal employee count required by the Government of India.`;
      doc.text(doc.splitTextToSize(c5, 170), 20, 118);

      addH2("6. Submission of Mandatory Documents", 140);
      doc.setFont("helvetica", "normal");
      doc.text("On your joining date, you must submit self-attested copies of:", 20, 153);
      doc.setFont("helvetica", "bold");
      doc.text([
        "• Education: 10th, 12th, and Degree/Diploma Certificates.",
        "• Verification: Relieving Letter & Experience Letter from the previous employer.",
        "• Identity: Aadhar Card, PAN Card, and 4 Passport Size Photos."
      ], 25, 159);

      addH2("7. Notice Period", 185);
      doc.setFont("helvetica", "normal");
      const c7 = `Either party may terminate this relationship by giving 15 days notice during probation or 1 month's notice post-confirmation. The Company reserves the right to pay or recover salary in lieu of notice.`;
      doc.text(doc.splitTextToSize(c7, 170), 20, 198);

      doc.setFont("helvetica", "bold");
      doc.text("_______________________________", 20, 240);
      doc.text("HR Signature (Talent Acquisition)", 20, 246);
      doc.text("____________________", 140, 240);
      doc.text("Candidate Signature", 140, 246);

      // ================= PAGE 3 =================
      doc.addPage();
      applyPageShell("Strictly Confidential - Earthy Source Foods And Beverages | Page 3 of 3");
      try { doc.addImage("/OnlyESLogo.png", "PNG", 175, 12, 15, 15); } catch (e) {}

      addH2("8. Non-Compete Clause", 25);
      doc.setFont("helvetica", "normal");
      doc.text("You agree not to work for any direct competitor in the food & beverage industry within a 50km radius of Shrirampur for 6 months after leaving the Company.", 20, 38, { maxWidth: 170 });

      addH2("9. Absolute Management Right to Terminate", 55);
      doc.setFont("helvetica", "normal");
      const c9 = `The Management reserves the sole and absolute right to terminate your services at any time, with or without notice and with or without cause. This includes, but is not limited to, non-performance, breach of trust, or violation of company policies. In cases of misconduct, fraud, or disclosure of trade secrets, termination will be immediate. You hereby waive any and all rights to claim compensation, damages, or legal recourse against the Management for such termination.`;
      doc.text(doc.splitTextToSize(c9, 170), 20, 68);

      addH2("10. Leave Policy", 105);
      doc.setFont("helvetica", "normal");
      const c10 = `You are eligible for leaves as per the Company's internal policy. All leaves must be applied for and approved in writing at least 7 days in advance. Unannounced absenteeism for more than 3 consecutive days will be treated as voluntary abandonment of service, leading to immediate termination.`;
      doc.text(doc.splitTextToSize(c10, 170), 20, 118);

      // Acceptance Box
      doc.setFillColor(244, 247, 244);
      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.2);
      doc.rect(20, 155, 170, 45, "FD");
      doc.setFont("helvetica", "bold");
      doc.text("Acceptance & Declaration:", 25, 163);
      doc.setFont("helvetica", "normal");
      doc.text(`I, ________________________________, hereby accept the position of ${role.toUpperCase()} and agree to all terms mentioned above. I confirm my educational and previous employment details are 100% accurate.`, 25, 172, { maxWidth: 160 });
      doc.text(`Candidate Signature: __________________________      Date: __________________`, 25, 192);

      // Digital Signature Box
      const verifiedY = 210;
      doc.setDrawColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setFillColor(248, 255, 248);
      doc.roundedRect(20, verifiedY, 85, 22, 1, 1, "FD");
      doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("VERIFIED DIGITAL SIGNATURE", 24, verifiedY + 6);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text([`Authorized: HR Talent Team`, `Ref ID: ESFB-APPT-${serial}`, `Issued: ${dateStr} @ ${now.toLocaleTimeString()}`], 24, verifiedY + 11);

      // Disclaimer Box
      doc.setFillColor(255, 249, 230);
      doc.setDrawColor(255, 204, 0);
      doc.rect(20, 240, 170, 22, "FD");
      doc.setTextColor(0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const legalNote = "LEGAL DISCLAIMER: This document is a Letter of Intent. Employment is finalized ONLY upon: (1) Physical presence at the facility, (2) Submission of all documents, and (3) Application of the Physical Company Stamp.";
      doc.text(doc.splitTextToSize(legalNote, 160), 25, 248);

      const blob = doc.output('blob');
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', `ESFB_APPT_${serial}.pdf`);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_no: serial, category: 'OFFER LETTER', document_url: uploadResult.url })
      });

      setPdfUrl(uploadResult.url);
      alert("Offer Letter Generated Successfully!");
      await fetchSerial();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 20px 0' }}>Offer Letter Portal</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', color:'#64748b'}}>SERIAL: </span>
            <b style={{color:'#2F4F4F'}}>#ESFB-APPT-2026-{serial}</b>
          </div>

          <input placeholder="Candidate Full Name" style={s.input} onChange={e => setName(e.target.value)} />
          <textarea placeholder="Complete Address" style={{...s.input, height: '80px'}} onChange={e => setAddress(e.target.value)} />
          <input placeholder="Designation" style={s.input} onChange={e => setRole(e.target.value)} />
          <input placeholder="Joining Date (e.g., 01 March 2026)" style={s.input} onChange={e => setJoiningDate(e.target.value)} />

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
             <input type="number" placeholder="Basic" style={s.input} onChange={e => setBasic(Number(e.target.value))} />
             <input type="number" placeholder="HRA" style={s.input} onChange={e => setHra(Number(e.target.value))} />
             <input type="number" placeholder="Special" style={s.input} onChange={e => setSpecial(Number(e.target.value))} />
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "GENERATING 3-PAGE PDF..." : "GENERATE OFFICIAL OFFER LETTER"}
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
  input: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
  btn: { width: '100%', padding: '16px', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' as 'bold' }
};