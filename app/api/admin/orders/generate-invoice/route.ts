export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import fs from 'fs';
import path from 'path';

// --- ROBUST HELPER: Indian Numbering System ---
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const formatAmount = (n) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  };

  if (num === 0) return 'Zero Only';
  let str = '';
  let n = Math.floor(num);

  if (n >= 10000000) { str += formatAmount(Math.floor(n / 10000000)) + 'Crore '; n %= 10000000; }
  if (n >= 100000) { str += formatAmount(Math.floor(n / 100000)) + 'Lakh '; n %= 100000; }
  if (n >= 1000) { str += formatAmount(Math.floor(n / 1000)) + 'Thousand '; n %= 1000; }
  if (n >= 100) { str += formatAmount(Math.floor(n / 100)) + 'Hundred '; n %= 100; }
  if (n > 0) { if (str !== '') str += 'and '; str += formatAmount(n); }

  return str.trim() + ' Only';
}

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    const supabase = createAdminClient();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`*, order_items!order_items_order_id_fkey (*)`)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");

    const isGST = order.is_gst === true || order.is_gst === 'true';
    const bucket = isGST ? 'tax-invoices' : 'non-tax-invoices';

    if (order.invoice_generated) {
      const { data: existing } = supabase.storage.from(bucket).getPublicUrl(order.invoice_url);
      return NextResponse.json({ success: true, url: existing.publicUrl });
    }

    const { data: stateData } = await supabase.from("india_states").select("state_code").ilike("name", order.shipping_state || "").single();
    const isMaharashtra = (order.shipping_state || "").toLowerCase() === "maharashtra";
    const stateCode = stateData?.state_code || "N/A";
    const slateGreen: [number, number, number] = [47, 79, 79];
    const { data: invoiceNo } = await supabase.rpc('get_next_invoice_number', { is_gst_invoice: isGST });

    const getBase64Image = (fileName) => {
      try {
        const filePath = path.join(process.cwd(), "public", fileName);
        return `data:image/${path.extname(fileName).slice(1)};base64,${fs.readFileSync(filePath).toString("base64")}`;
      } catch (e) { return null; }
    };

    const logoBase64 = getBase64Image("EarthyLogo.JPG");
    const tickBase64 = getBase64Image("VerifiedTick.png");
    const qrBase64 = getBase64Image("qr-upi.png");

    const doc = new jsPDF();
    if (logoBase64) doc.addImage(logoBase64, "JPEG", 10, 5, 35, 35);

    doc.setFillColor(...slateGreen).rect(50, 0, 160, 40, 'F');
    doc.setTextColor(255).setFontSize(14).setFont("helvetica", "bold").text("EARTHY SOURCE FOODS AND BEVERAGES", 55, 18);
    doc.setFontSize(10).text("GSTIN: 27BGJPK0016J1ZK", 55, 24);
    doc.setFontSize(12).text(isGST ? "TAX INVOICE" : "BILL OF SUPPLY", 55, 34);

    const istDateOnly = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    doc.setTextColor(0).setFontSize(10).text(`Invoice No: ${invoiceNo}`, 140, 50);
    doc.text(`Date: ${istDateOnly}`, 140, 56);
    doc.text(`Supplier's State Code: 27`, 140, 62);

    autoTable(doc, {
      startY: 70,
      head: [['Billed To', 'Shipped To']],
      body: [[`${order.billing_name}\n${order.billing_address}\nGSTIN: ${order.shipping_gstin || 'N/A'}`, `${order.shipping_name}\n${order.shipping_address}\nPlace of Supply: ${order.shipping_state}\nState Code: ${stateCode}`]],
      theme: 'grid', headStyles: { fillColor: slateGreen }, styles: { fontSize: 9 }
    });

    const tableBody = order.order_items.map(item => {
      const taxable = (item.qty_boxes || 0) * (item.price_per_box || 0);
      return [item.product_name, order.hsn_code || 'N/A', item.qty_boxes, `Rs.${Math.abs(item.price_per_box).toFixed(2)}`, `${order.tax_rate}%`, `Rs.${(taxable * (1 + (order.tax_rate / 100))).toFixed(2)}` ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Product', 'HSN', 'Qty (Boxes)', 'Rate / Box', 'GST %', 'Total']],
      body: tableBody, theme: 'striped', headStyles: { fillColor: slateGreen }, styles: { fontSize: 8 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;
    const subtotal = Math.abs(order.gross_revenue || 0);
    let totalTax = 0;
    order.order_items.forEach(item => { totalTax += (item.qty_boxes * item.price_per_box * (order.tax_rate / 100)); });
    const grandTotal = Math.round(subtotal + totalTax);
    const rounding = (grandTotal - (subtotal + totalTax)).toFixed(2);

    doc.setFontSize(10).setFont("helvetica", "normal").text(`Total Amount: Rs.${subtotal.toFixed(2)}`, 140, currentY);
    if (isGST) {
      if (isMaharashtra) {
        doc.text(`CGST (${order.tax_rate/2}%): Rs.${(totalTax/2).toFixed(2)}`, 140, currentY + 6);
        doc.text(`SGST (${order.tax_rate/2}%): Rs.${(totalTax/2).toFixed(2)}`, 140, currentY + 12);
        currentY += 12;
      } else {
        doc.text(`IGST (${order.tax_rate}%): Rs.${totalTax.toFixed(2)}`, 140, currentY + 6);
        currentY += 6;
      }
    }
    if (parseFloat(rounding) !== 0) { doc.text(`Rounding Off: Rs.${rounding}`, 140, currentY + 6); currentY += 6; }
    doc.setFont("helvetica", "bold").text(`Grand Total: Rs.${grandTotal.toFixed(2)}`, 140, currentY + 10);

    const splitWords = doc.splitTextToSize(`Amount in Words: ${numberToWords(grandTotal)}`, 110);
    doc.setFontSize(9).text(splitWords, 15, currentY + 10);
    
    currentY += Math.max(25, (splitWords.length * 5) + 10);

    doc.setFontSize(8).setFont("helvetica", "normal").text("Terms & Conditions:", 15, currentY);
    const terms = ["1. Goods once sold will not be taken back.", "2. Interest @18% p.a. will be charged for delays.", "3. Disputes subject to local jurisdiction only.", "4. Tax payable on Reverse Charge: No", "5. This is a computer generated invoice."];
    terms.forEach((line, i) => doc.text(line, 15, currentY + 5 + (i * 4)));

    if (qrBase64) { doc.addImage(qrBase64, "PNG", 15, currentY + 28, 25, 25); doc.setFontSize(7).text("Scan to Pay via UPI", 17, currentY + 56); }

    const istFullTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    if (tickBase64) doc.addImage(tickBase64, "PNG", 140, currentY + 5, 5, 5);
    doc.setFontSize(9).setFont("helvetica", "bold").text("Digitally Signed by Vivek B Kale", 147, currentY + 9);
    doc.setFontSize(8).setFont("helvetica", "normal").text("Authorized Signatory", 140, currentY + 16);
    doc.text("Earthy Source Foods & Beverages", 140, currentY + 20);
    doc.setFontSize(7).setTextColor(100).text(`Date: ${istFullTime} (IST)`, 140, currentY + 25);

    const footerY = 280;
    doc.setFillColor(...slateGreen).rect(0, footerY, 210, 17, 'F').setTextColor(255).setFontSize(8);
    doc.text("Gut No 253, Puntamba Road, Nimgaon Khairi, Shrirampur, Ahilyanagar 413709", 105, footerY + 6, { align: "center" });
    doc.text("Phone: 7758877307 | Web: www.earthysource.in | Email: admin@earthysource.in", 105, footerY + 11, { align: "center" });

    const pdfData = doc.output('arraybuffer'); 
    const fileName = `${order.uorn}_${invoiceNo.replace(/\//g, '-')}.pdf`;
    
    // --- STEP 1: UPLOAD TO STORAGE ---
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, pdfData, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new Error("Cloud Storage Upload Failed");

    // --- STEP 2: UPDATE ORDERS TABLE ---
    await supabase.from("orders").update({ invoice_no: invoiceNo, invoice_generated: true, invoice_url: fileName }).eq("id", orderId);

// --- STEP 3: SYNC TO GST RECORDS LEDGER ---
    // We prefix the bucket name to the path so the DB knows exactly where it is
    const fullStoragePath = `${bucket}/${fileName}`;

    const { error: ledgerError } = await supabase.from("gst_records").insert([{
      order_id: orderId,
      order_number: order.order_number,
      invoice_no: invoiceNo,
      invoice_date: new Date().toISOString().split('T')[0],
      customer_name: order.billing_name,
      customer_gstin: order.shipping_gstin || 'URD',
      place_of_supply: order.shipping_state,
      is_gst_invoice: isGST,
      hsn_code: order.hsn_code || 'N/A',
      taxable_value: subtotal,
      gst_rate: isGST ? order.tax_rate : 0,
      cgst_amount: (isGST && isMaharashtra) ? (totalTax / 2) : 0,
      sgst_amount: (isGST && isMaharashtra) ? (totalTax / 2) : 0,
      igst_amount: (isGST && !isMaharashtra) ? totalTax : 0,
      total_invoice_value: grandTotal,
      // CHANGE THIS LINE:
      invoice_pdf_path: fullStoragePath 
    }]);
	
    if (ledgerError) console.error("GST Ledger Sync Error:", ledgerError);

    return NextResponse.json({ success: true, url: (supabase.storage.from(bucket).getPublicUrl(fileName)).data.publicUrl });
  } catch (error) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}