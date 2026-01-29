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

    const isGST = order.is_gst === true || order.is_gst === 'true';
    const bucket = isGST ? 'tax-invoices' : 'non-tax-invoices';

    if (order.invoice_generated) {
      const { data: existing } = supabase.storage.from(bucket).getPublicUrl(order.invoice_url);
      return NextResponse.json({ success: true, url: existing.publicUrl });
    }

    // 2. Lookup State Code
    const { data: stateData } = await supabase
      .from("india_states")
      .select("state_code")
      .ilike("name", order.shipping_state || "") 
      .single();

    const isMaharashtra = (order.shipping_state || "").toLowerCase() === "maharashtra";
    const stateCode = stateData?.state_code || "N/A";
    const slateGreen: [number, number, number] = [47, 79, 79];

    // 3. Get Invoice Number
    const { data: invoiceNo } = await supabase.rpc('get_next_invoice_number', { 
      is_gst_invoice: isGST 
    });

    // Helper to load images
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
    
    if (logoBase64) {
        doc.addImage(logoBase64, "JPEG", 10, 5, 35, 35);
    }

    doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
    doc.rect(50, 0, 160, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EARTHY SOURCE FOODS AND BEVERAGES", 55, 18);
    
    // REDUCED GSTIN FONT SIZE
    doc.setFontSize(10); 
    doc.text("GSTIN: 27BGJPK0016J1ZK", 55, 24);
    
    doc.setFontSize(12);
    doc.text(isGST ? "TAX INVOICE" : "BILL OF SUPPLY", 55, 34);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNo}`, 140, 50);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 56);
    doc.text(`State Code: ${stateCode}`, 140, 62);

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

    const tableHeaders = [[ 'Product', 'HSN', 'Qty (Boxes)', 'Rate / Box', 'GST %', 'Total']];
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

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // FINANCIAL CALCULATIONS: Use subtotal (gross_revenue) from DB
    const subtotal = Math.abs(order.gross_revenue || 0);
    
    let totalTaxAmount = 0;
    order.order_items.forEach((item: any) => {
        const taxable = (item.qty_boxes || 0) * (item.price_per_box || 0);
        totalTaxAmount += (taxable * (order.tax_rate || 0) / 100);
    });
    
    // Grand Total is strictly Total Amount (Products) + Calculated Tax
    const grandTotal = subtotal + totalTaxAmount;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Amount: Rs.${subtotal.toFixed(2)}`, 140, finalY);
    
    if (isGST) {
        if (isMaharashtra) {
            doc.text(`CGST (${order.tax_rate/2}%): Rs.${(totalTaxAmount/2).toFixed(2)}`, 140, finalY + 6);
            doc.text(`SGST (${order.tax_rate/2}%): Rs.${(totalTaxAmount/2).toFixed(2)}`, 140, finalY + 12);
        } else {
            doc.text(`IGST (${order.tax_rate}%): Rs.${totalTaxAmount.toFixed(2)}`, 140, finalY + 6);
        }
    }

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

    if (signBase64) {
        doc.addImage(signBase64, "JPEG", 150, finalY + 45, 30, 15);
    }

    doc.line(140, finalY + 65, 195, finalY + 65);
    doc.setFontSize(9);
    doc.text("Authorized Signatory for", 140, finalY + 70);
    doc.setFont("helvetica", "bold");
    doc.text("Earthy Source Foods & Beverages", 140, finalY + 75);

    // --- COLORED FOOTER SECTION ---
    const footerY = 280;
    doc.setFillColor(slateGreen[0], slateGreen[1], slateGreen[2]);
    doc.rect(0, footerY, 210, 17, 'F'); // Full width footer
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // Footer Content
    const companyAddress = "Gut No 253, Puntamba Road, Nimgaon Khairi, Shrirampur, Ahilyanagar 413709";
    const contactInfo = "Phone: 7758877307 | Web: www.earthysource.in | Email: accounts@earthysource.in";
    
    // Center alignment in footer
    const addressWidth = doc.getTextWidth(companyAddress);
    const contactWidth = doc.getTextWidth(contactInfo);
    doc.text(companyAddress, (210 - addressWidth) / 2, footerY + 6);
    doc.text(contactInfo, (210 - contactWidth) / 2, footerY + 11);

    // 5. Save & Update
    const pdfData = doc.output('arraybuffer'); 
    const fileName = `${order.uorn}_${invoiceNo.replace(/\//g, '-')}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, pdfData, { 
        contentType: 'application/pdf', 
        upsert: true 
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

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