"use client";
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
const EXPECTED_LETTER_KEY = process.env.NEXT_PUBLIC_LETTER_KEY;

interface PORow {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
}

export default function PurchaseOrderPage() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [adminKey, setAdminKey] = useState("");
  
  const [terms, setTerms] = useState(
    "1. Scope: Supply strictly as per quotation and specs.\n2. Payment: 20-30% advance; balance after installation & trial.\n3. Delivery: Supplier responsible for site installation.\n4. Inspection: PO cancellable for delay or non-compliance.\n5. Legal: Jurisdiction Shrirampur; PO valid after sign & stamp."
  );

  const [rows, setRows] = useState<PORow[]>([{ id: 1, description: "", qty: 1, unitPrice: 0 }]);

  const fetchSerial = async () => {
    try {
      const res = await fetch(`/api/get-next-serial?t=${Date.now()}`);
      const data = await res.json();
      setSerial(data.nextSerial);
    } catch (e) { console.error("Fetch failed"); }
  };

  useEffect(() => { fetchSerial(); }, []);

  const updateRow = (index: number, field: keyof PORow, value: string | number) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const subTotal = rows.reduce((acc, row) => acc + (row.qty * row.unitPrice), 0);
  const gstAmount = (subTotal * gstRate) / 100;
  const grandTotal = subTotal + gstAmount;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || adminKey !== EXPECTED_LETTER_KEY) return alert("Check inputs/key");

    setLoading(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const slateGreen = [47, 79, 79]; 
      const forestGreen = [21, 128, 61]; 

      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage("/OnlyESLogo.png", "PNG", 55, 100, 100, 100);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 })); 
      } catch (e) { }

      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.rect(5, 5, 200, 287); 

      try { doc.addImage("/EarthyLogo.JPG", "JPEG", 20, 15, 58, 26); } catch (e) { }

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
        "GSTIN: 27BGJPK0016J1ZK", // Added Firm GSTIN
        "Web: www.earthysource.in | Email: info@earthysource.in"
      ], 190, 27, { align: "right" });

      doc.setDrawColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setLineWidth(0.8);
      doc.line(20, 52, 190, 52); // Adjusted line for extra GSTIN row

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`PO REF: ESFB/PO/2026/${serial}`, 20, 62);
      doc.text(`DATE: ${dateStr.toUpperCase()}`, 190, 62, { align: "right" });

      doc.setFontSize(24);
      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.text("PURCHASE ORDER", 105, 82, { align: "center", charSpace: 1 });
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(75, 85, 135, 85);

      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text("VENDOR DETAILS:", 20, 100);
      doc.setFont("helvetica", "normal");
      doc.text([
        `Name: ${vendorName.toUpperCase()}`,
        `GSTIN: ${vendorGstin}`,
        `Address: ${vendorAddress}`
      ], 20, 105);

      let currentY = 125;
      doc.setFillColor(245, 245, 245);
      doc.rect(20, currentY, 170, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Description", 25, currentY + 5.5);
      doc.text("Qty", 130, currentY + 5.5);
      doc.text("Price", 150, currentY + 5.5);
      doc.text("Total", 175, currentY + 5.5);

      doc.setFont("helvetica", "normal");
      currentY += 8;
      rows.forEach(row => {
        doc.setDrawColor(230);
        doc.line(20, currentY + 8, 190, currentY + 8);
        doc.text(row.description, 25, currentY + 5);
        doc.text(row.qty.toString(), 130, currentY + 5);
        doc.text(row.unitPrice.toFixed(2), 150, currentY + 5);
        doc.text((row.qty * row.unitPrice).toFixed(2), 175, currentY + 5);
        currentY += 8;
      });

      currentY += 10;
      doc.setFont("helvetica", "bold");
      doc.text(`Sub-Total: INR ${subTotal.toFixed(2)}`, 190, currentY, { align: "right" });
      doc.text(`GST (${gstRate}%): INR ${gstAmount.toFixed(2)}`, 190, currentY + 6, { align: "right" });
      doc.setFontSize(12);
      doc.text(`GRAND TOTAL: INR ${Math.round(grandTotal).toLocaleString('en-IN')}`, 190, currentY + 14, { align: "right" });

      currentY += 22;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS:", 20, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const splitTerms = doc.splitTextToSize(terms, 170);
      doc.text(splitTerms, 20, currentY + 5);

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
      doc.text([
        `Authorized by: Procurement Dept`,
        `Location: Shrirampur Facility [UNIT-01]`,
        `Timestamp: ${dateStr} @ ${now.toLocaleTimeString()}`
      ], 24, footY + 11);

      // QR Code - Made Smaller (18x18)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PO-${serial}`;
      try {
        doc.setDrawColor(220);
        doc.rect(170, footY - 2, 21, 21); // Smaller frame
        doc.addImage(qrUrl, "PNG", 171.5, footY - 0.5, 18, 18); // Smaller QR
        doc.setFontSize(6);
        doc.text("SCAN FOR AUTHENTICITY", 180, footY + 23, { align: "center" });
      } catch (e) {}

      doc.setTextColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("For Earthy Source Foods And Beverages", 20, footY + 38);
      doc.line(20, footY + 41, 85, footY + 41);
      doc.text("Authorized Signatory", 20, footY + 46);

      doc.line(140, footY + 41, 190, footY + 41);
      doc.text("Supplier's Seal & Sign", 140, footY + 46);

      doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.text("SHRIRAMPUR FACILITY   |   OFFICIAL PURCHASE RECORD   |   VALIDATION: WWW.EARTHYSOURCE.IN", 105, 292, { align: "center" });

      const blob = doc.output('blob');
      const cleanFileName = `ESFB_PO_2026_${serial}.pdf`;
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob);
      uploadFormData.append('fileName', cleanFileName);

      const uploadRes = await fetch("/api/upload-pdf", { method: "POST", body: uploadFormData });
      const uploadResult = await uploadRes.json();
      
      const syncRes = await fetch("/api/issue-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_no: serial, category: 'PURCHASE ORDER', document_url: uploadResult.url })
      });

      if (syncRes.ok) {
        setPdfUrl(uploadResult.url);
        alert("Purchase Order Issued Successfully!");
        await fetchSerial(); 
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2F4F4F', margin: '0 0 10px 0' }}>Purchase Order Portal</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign:'center' }}>
            <span style={{fontSize:'10px', textTransform:'uppercase', color:'#64748b', letterSpacing:'1px'}}>PO Reference</span><br/>
            <b style={{color:'#2F4F4F', fontSize:'16px'}}>#ESFB-PO-2026-{serial}</b>
          </div>

          <input placeholder="Vendor Entity Name" style={s.input} onChange={e => setVendorName(e.target.value)} />
          <div style={{display:'flex', gap:'10px'}}>
             <input placeholder="Vendor GSTIN" style={{...s.input, flex: 1}} onChange={e => setVendorGstin(e.target.value)} />
             <select style={{...s.input, flex: 1}} onChange={e => setGstRate(Number(e.target.value))}>
               <option value="18">GST 18%</option>
               <option value="12">GST 12%</option>
               <option value="5">GST 5%</option>
               <option value="0">No GST (0%)</option> {/* Added No GST option */}
             </select>
          </div>
          <input placeholder="Vendor Address" style={s.input} onChange={e => setVendorAddress(e.target.value)} />

          <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <label style={s.label}>ITEM LIST</label>
            {rows.map((row, index) => (
              <div key={row.id} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                <input placeholder="Description" style={{...s.input, flex: 3, padding: '10px'}} onChange={e => updateRow(index, 'description', e.target.value)} />
                <input type="number" placeholder="Qty" style={{...s.input, flex: 1, padding: '10px'}} onChange={e => updateRow(index, 'qty', Number(e.target.value))} />
                <input type="number" placeholder="Rate" style={{...s.input, flex: 1.5, padding: '10px'}} onChange={e => updateRow(index, 'unitPrice', Number(e.target.value))} />
              </div>
            ))}
            <button onClick={() => setRows([...rows, { id: Date.now(), description: "", qty: 1, unitPrice: 0 }])} style={{ background: '#f1f5f9', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>+ Add Row</button>
          </div>

          <div>
            <label style={s.label}>TERMS & CONDITIONS (EDITABLE)</label>
            <textarea 
              style={{...s.input, height: '80px', fontSize: '12px', resize: 'none'}} 
              value={terms} 
              onChange={e => setTerms(e.target.value)} 
            />
          </div>

          <div style={{ background: '#2F4F4F', color: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'right' }}>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>GRAND TOTAL: </span>
            <b style={{ fontSize: '18px' }}>₹{Math.round(grandTotal).toLocaleString('en-IN')}</b>
          </div>

          <input type="password" placeholder="Admin PIN" style={s.input} onChange={e => setAdminKey(e.target.value)} />
          
          <button onClick={handleGenerate} disabled={loading} style={{...s.btn, background: loading ? '#cbd5e1' : '#2F4F4F'}}>
            {loading ? "ISSUING PO..." : "GENERATE OFFICIAL PURCHASE ORDER"}
          </button>
        </div>

        {pdfUrl && (
          <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: '#f0fdf4', borderRadius: '10px' }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 'bold', textDecoration: 'none' }}>
              VIEW FINAL PO PDF ↗
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