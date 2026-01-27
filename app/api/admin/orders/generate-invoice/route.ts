import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    const supabase = await createServerSupabaseClient();

    // 1. Fetch Order with Items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`*, order_items!order_items_order_id_fkey (*)`)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");

    if (order.invoice_generated) {
      const bucket = order.is_gst ? 'tax-invoices' : 'non-tax-invoices';
      const { data: existing } = supabase.storage.from(bucket).getPublicUrl(order.invoice_url);
      return NextResponse.json({ success: true, url: existing.publicUrl });
    }

    // 2. Lookup State Code
    const { data: stateData } = await supabase
      .from("india_states")
      .select("state_code")
      .ilike("name", order.shipping_state || "") 
      .single();

    const isGST = order.is_gst === true || order.is_gst === 'true';
    const isMaharashtra = (order.shipping_state || "").toLowerCase() === "maharashtra";
    const stateCode = stateData?.state_code || "N/A";
    const slateGreen: [number, number, number] = [47, 79, 79];

    // 3. Get Invoice Number
    const { data: invoiceNo } = await supabase.rpc('get_next_invoice_number', { 
      is_gst_invoice: isGST 
    });

    // --- NEW: Helper to load images from public folder on server ---
    const getBase64Image = (fileName: string) => {
      try {
        const filePath = path.join(process.cwd(), "public", fileName);
        const fileBuffer = fs.readFileSync(filePath);
        return `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
      } catch (e) {
        console.error(`Image Load Error (${fileName}):`, e);
        return null;
      }
    };

    const logoBase64 = getBase64Image("EarthyLogo.JPG");
    const signBase64 = getBase64Image("Vivek_Sign.JPG");

    // 4. PDF Generation
    const doc = new jsPDF();
    
    // Brand Logo & Header
    if (logoBase64) {
        doc.addImage(logoBase64, "JPEG", 10, 5, 35, 35);
    }

    doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
    doc.rect(50, 0, 160, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EARTHY SOURCE FOODS AND BEVERAGES", 55, 18);
    
    // Separated the Invoice title to prevent mixing
    doc.setFontSize(12);
    doc.text(isGST ? "TAX INVOICE" : "BILL OF SUPPLY", 55, 34);

    // Invoice Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNo}`, 140, 50);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 56);
    doc.text(`State Code: ${stateCode}`, 140, 62);

    // Address Sections
    autoTable(doc, {
      startY: 70,
      head: [['Billed To', 'Shipped To']],
      body: [[
        `${order.billing_name}\n${order.billing_address}\nGSTIN: ${order.shipping_gstin || 'N/A'}`,
        `${order.shipping_name}\n${order.shipping_address}\nState: ${order.shipping_state}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: slateGreen },
      styles: { fontSize: 9 }
    });

    // Items Table
    const tableHeaders = [[ 'Product', 'HSN', 'Qty', 'Rate', 'GST %', 'Total']];
    const tableBody = order.order_items.map((item: any) => {
      const qty = item.qty_boxes || 0;
      const rate = item.price_per_box || 0;
      const taxRate = order.tax_rate || 0;
      const taxableAmt = qty * rate;
      const rowTotal = taxableAmt + (taxableAmt * taxRate / 100);

      return [
        item.product_name,
        order.hsn_code || 'N/A',
        qty,
        `Rs.${Math.abs(rate).toFixed(2)}`,
        `${taxRate}%`,
        `Rs.${Math.abs(rowTotal).toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: slateGreen },
      styles: { fontSize: 8 }
    });

    // Calculations
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    
    const deliveryFee = Math.abs(order.delivery_fee || 0);
    const grandTotal = Math.abs(order.total_payable_amount || 0);
    
    let totalTaxAmount = 0;
    order.order_items.forEach((item: any) => {
        const taxable = (item.qty_boxes || 0) * (item.price_per_box || 0);
        totalTaxAmount += (taxable * (order.tax_rate || 0) / 100);
    });
    
    const subtotal = grandTotal - deliveryFee - totalTaxAmount;

    doc.text(`Subtotal: Rs.${Math.abs(subtotal).toFixed(2)}`, 140, finalY);
    
    if (isGST) {
        if (isMaharashtra) {
            doc.text(`CGST (${order.tax_rate/2}%): Rs.${(totalTaxAmount/2).toFixed(2)}`, 140, finalY + 6);
            doc.text(`SGST (${order.tax_rate/2}%): Rs.${(totalTaxAmount/2).toFixed(2)}`, 140, finalY + 12);
        } else {
            doc.text(`IGST (${order.tax_rate}%): Rs.${totalTaxAmount.toFixed(2)}`, 140, finalY + 6);
        }
    }

    doc.text(`Delivery Fee: Rs.${deliveryFee.toFixed(2)}`, 140, finalY + 18);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: Rs.${grandTotal.toFixed(2)}`, 140, finalY + 26);

    // Terms & Conditions
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const terms = [
      "1. Goods once sold will not be taken back.",
      "2. Interest @18% p.a. will be charged if payment is not made within 7 days.",
      "3. All disputes are subject to local jurisdiction only.",
      "4. This is a computer generated invoice."
    ];
    doc.text("Terms & Conditions:", 15, finalY + 40);
    terms.forEach((line, i) => doc.text(line, 15, finalY + 45 + (i * 4)));

    // Signature Area
    if (signBase64) {
        doc.addImage(signBase64, "JPEG", 150, finalY + 45, 30, 15);
    }

    doc.line(140, finalY + 65, 195, finalY + 65);
    doc.setFontSize(9);
    doc.text("Authorized Signatory for", 140, finalY + 70);
    doc.setFont("helvetica", "bold");
    doc.text("Earthy Source Foods & Beverages", 140, finalY + 75);

    // Confidentiality Message at bottom
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text("Confidentiality Note: This document contains private information intended only for the recipient. Unauthorized use or distribution is prohibited.", 15, 285);

    // 5. Save & Update
    const pdfBlob = doc.output('blob');
    const bucket = isGST ? 'tax-invoices' : 'non-tax-invoices';
    const fileName = `${order.uorn}_${invoiceNo.replace(/\//g, '-')}.pdf`;

    await supabase.storage.from(bucket).upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });
    await supabase.from("orders").update({
      invoice_no: invoiceNo,
      invoice_generated: true,
      invoice_url: fileName
    }).eq("id", orderId);

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return NextResponse.json({ success: true, url: publicUrlData.publicUrl });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}