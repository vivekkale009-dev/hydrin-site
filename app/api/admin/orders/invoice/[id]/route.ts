import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id } = params;

  try {
    // 1. Fetch Order and Items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`*, order_items(*)`)
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. STOP DUPLICATES: If invoice already exists, serve existing file
    if (order.invoice_url) {
      const { data: fileData } = await supabase.storage
        .from("orders")
        .download(order.invoice_url);
      if (fileData) {
        return new NextResponse(fileData, {
          headers: { "Content-Type": "application/pdf" },
        });
      }
    }

    // 3. Financial Year Logic (FY 2526 format)
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    let fy = "";
    if (month >= 4) {
      fy = `${year % 100}${(year + 1) % 100}`;
    } else {
      fy = `${(year - 1) % 100}${year % 100}`;
    }

    // 4. Generate Serial Number & Reset Rules
    let invoiceNo = "";
    const isTax = order.is_gst === true;
    const prefix = isTax ? "EUI" : "EUBS";

    if (isTax) {
      // TAX INVOICE: Reset Yearly (April 1st)
      const fyStart = `${month >= 4 ? year : year - 1}-04-01`;
      const { count } = await supabase.from("orders")
        .select("id", { count: "exact", head: true })
        .eq('is_gst', true)
        .not('invoice_no', 'is', null)
        .gte('created_at', fyStart);
      
      invoiceNo = `${prefix}-FY${fy}-${String((count || 0) + 1).padStart(6, '0')}`;
    } else {
      // BILL OF SUPPLY: Reset Daily
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from("orders")
        .select("id", { count: "exact", head: true })
        .eq('is_gst', false)
        .not('invoice_no', 'is', null)
        .gte('created_at', today);
      
      invoiceNo = `${prefix}-FY${fy}-${String((count || 0) + 1).padStart(4, '0')}`;
    }

    // 5. PDF Creation
    const doc = new jsPDF();
    const docTitle = isTax ? "TAX INVOICE" : "BILL OF SUPPLY";

    doc.setFontSize(20);
    doc.text("EARTHY SOURCE", 105, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text(docTitle, 105, 25, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNo}`, 15, 40);
    doc.text(`Date: ${now.toLocaleDateString('en-IN')}`, 15, 46);
    doc.text(`Order Ref: ${order.uorn}`, 15, 52);

    autoTable(doc, {
      startY: 60,
      head: [['Product', 'Qty', 'Rate', 'Total']],
      body: order.order_items.map((item: any) => [
        item.product_name,
        item.qty_boxes,
        item.price_per_box,
        item.qty_boxes * item.price_per_box
      ]),
      foot: [['', '', 'Total Payable:', `INR ${order.total_payable_amount}`]],
      theme: 'grid',
      headStyles: { fillColor: [47, 79, 79] }
    });

    const pdfBuffer = doc.output("arraybuffer");
    const filePath = `invoices/${order.uorn}/${invoiceNo}.pdf`;

    // 6. Upload and Update DB
    await supabase.storage.from("orders").upload(filePath, pdfBuffer, { upsert: true });
    await supabase.from("orders").update({ 
      invoice_no: invoiceNo, 
      invoice_url: filePath 
    }).eq("id", id);

    return new NextResponse(pdfBuffer, {
      headers: { "Content-Type": "application/pdf" }
    });

  } catch (error: any) {
    console.error("Invoice Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}