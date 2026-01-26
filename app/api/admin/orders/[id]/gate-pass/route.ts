import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { id } = params;

  let orderData: any = null;

  try {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("order_items").select("product_name, qty_boxes").eq("order_id", id)
    ]);

    if (orderRes.error || !orderRes.data) throw new Error("ORDER_NOT_FOUND");
    orderData = orderRes.data;

    // CHECK SECURITY LOCKDOWN
    if (orderData.exit_confirmed_at) {
      throw new Error("ALREADY_EXITED");
    }

    const items = itemsRes.data || [];
    // CALCULATION FOR TOTAL BOXES
    const totalBoxes = items.reduce((sum, item) => sum + (Number(item.qty_boxes) || 0), 0);
    const newPrintCount = (Number(orderData.gate_pass_print_count) || 0) + 1;

    const origin = new URL(req.url).origin;
    const verificationUrl = `${origin}/verify-gp/${id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    try {
      const logoPath = path.join(process.cwd(), "public", "EarthyLogo.JPG");
      const logoData = fs.readFileSync(logoPath).toString("base64");
      doc.addImage(`data:image/jpeg;base64,${logoData}`, "JPEG", 10, 8, 35, 15);
    } catch (e) {
      doc.setFontSize(14).setFont("helvetica", "bold").text("EARTHY SOURCE", 10, 15);
    }

    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(44, 62, 80);
    doc.text("OUTWARD GATE PASS", pageWidth - 10, 15, { align: "right" });
    
    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100);
    doc.text("OFFICIAL LOGISTICS DOCUMENT - NON TRANSFERABLE", pageWidth - 10, 20, { align: "right" });

    doc.setDrawColor(200).setLineWidth(0.2);
    doc.line(10, 25, pageWidth - 10, 25);

    doc.setFontSize(9).setTextColor(0);
    doc.setFont("helvetica", "bold").text("PASS DETAILS", 12, 32);
    doc.setFont("helvetica", "normal");
    doc.text(`Gate Pass No  : ${orderData.uorn}`, 12, 38);
    doc.text(`Order Ref     : ${orderData.order_number || 'N/A'}`, 12, 43);
    doc.text(`Printed On    : ${new Date().toLocaleString()}`, 12, 48);
    doc.text(`Print Count   : ${newPrintCount}`, 12, 53);

    doc.setFont("helvetica", "bold").text("VEHICLE & DESTINATION", 100, 32);
    doc.setFont("helvetica", "normal");
    doc.text(`Vehicle No    : ${orderData.vehicle_number || 'Internal'}`, 100, 38);
    doc.text(`Driver Name   : ${orderData.driver_name || 'N/A'}`, 100, 43);
    doc.text(`Consignee     : ${orderData.distributor_name || 'Direct Sale'}`, 100, 48);

    let y = 58;
    doc.setFillColor(44, 62, 80);
    doc.rect(10, y, pageWidth - 20, 8, 'F');
    doc.setFont("helvetica", "bold").setTextColor(255).setFontSize(9);
    doc.text("Sr.", 13, y + 5.5);
    doc.text("Item Description", 25, y + 5.5);
    doc.text("Quantity (Boxes)", pageWidth - 45, y + 5.5);

    y += 8;
    doc.setTextColor(0).setFont("helvetica", "normal");
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245).rect(10, y, pageWidth - 20, 8, 'F');
      }
      doc.text((index + 1).toString(), 13, y + 5.5);
      doc.text(item.product_name || "N/A", 25, y + 5.5);
      doc.text(item.qty_boxes?.toString() || "0", pageWidth - 25, y + 5.5, { align: 'right' });
      y += 8;
    });

    // TOTAL BOXES ROW IN PDF
    doc.setDrawColor(44, 62, 80).setLineWidth(0.3);
    doc.line(10, y, pageWidth - 10, y);
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("TOTAL DISPATCHED BOXES", 25, y + 6);
    doc.text(totalBoxes.toString(), pageWidth - 25, y + 6, { align: 'right' });

    const qrSize = 25;
    doc.addImage(qrCodeDataUrl, "PNG", 10, pageHeight - 35, qrSize, qrSize);
    doc.setFontSize(6).setTextColor(100);
    doc.text("SCAN TO VERIFY EXIT", 10, pageHeight - 8);

    const footerY = pageHeight - 25;
    doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(0);
    doc.text("____________________", 45, footerY);
    doc.text("Prepared By", 52, footerY + 5);

    doc.text("____________________", pageWidth / 2 + 5, footerY);
    doc.text("Driver Signature", pageWidth / 2 + 12, footerY + 5);

    doc.text("____________________", pageWidth - 50, footerY);
    doc.text("Security Officer", pageWidth - 43, footerY + 5);

    await supabase.from("orders").update({ 
      gate_pass_printed_at: new Date().toISOString(),
      gate_pass_print_count: newPrintCount 
    }).eq("id", id);

    return new NextResponse(doc.output("arraybuffer"), {
      headers: { 
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      },
    });

  } catch (e: any) {
    if (e.message === "ALREADY_EXITED") {
        const exitTime = orderData?.exit_confirmed_at 
            ? new Date(orderData.exit_confirmed_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              })
            : "N/A";
        const exitNotes = orderData?.exit_notes || "No notes provided.";

        return new NextResponse(
          `<html>
            <body style="font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f4f4f4;">
              <div style="background:white; padding:40px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); text-align:center; max-width:500px; width:90%;">
                <div style="font-size:60px; margin-bottom:20px;">⛔</div>
                <h2 style="color:#d32f2f; margin:0 0 10px 0; letter-spacing:1px;">SECURITY LOCKDOWN</h2>
                <p style="color:#333; font-size:16px; margin-bottom:20px;">
                    Reprinting is disabled. This vehicle has already cleared the gate.
                </p>
                
                <div style="background:#fff3f3; border:1px solid #ffcdd2; border-radius:8px; padding:15px; text-align:left; margin-bottom:25px;">
                    <div style="margin-bottom:10px;">
                        <span style="color:#777; font-size:12px; font-weight:bold; text-transform:uppercase;">Exit Timestamp</span><br/>
                        <span style="color:#333; font-weight:600;">${exitTime}</span>
                    </div>
                    <div>
                        <span style="color:#777; font-size:12px; font-weight:bold; text-transform:uppercase;">Security Notes</span><br/>
                        <span style="color:#333; font-style:italic;">"${exitNotes}"</span>
                    </div>
                </div>

                <button onclick="window.close()" style="background:#443e50; color:white; border:none; padding:12px 30px; border-radius:6px; cursor:pointer; font-weight:bold;">
                    Close This Window
                </button>
              </div>
            </body>
          </html>`,
          { headers: { "Content-Type": "text/html" }, status: 403 }
        );
    }

    return new NextResponse(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}