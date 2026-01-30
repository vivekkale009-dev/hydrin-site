import nodemailer from "nodemailer";
import { customerTemplate, adminTemplate } from "./email-templates";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const ticketId = (() => {
      const now = new Date();
      const dateStr = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const hash = (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(-4).toUpperCase();
      return `ES${dateStr}${hash}`;
    })();

    // 1. ADMIN NOTIFICATION (Your Internal Copy)
    await transporter.sendMail({
      // Using support@ address to satisfy Zoho 553 relay policy
      from: `"${body.name} (Website Lead)" <${process.env.MAIL_USER}>`, 
      to: process.env.MAIL_TO,
      replyTo: body.email, // If you click 'Reply' in your inbox, it goes to the customer
      subject: `New Lead | ${ticketId} | ${body.name}`,
      html: adminTemplate({
        name: body.name,
        phone: body.phone,
        email: body.email,
        message: body.message,
        ticketId,
      }),
    });

    // 2. CUSTOMER CONFIRMATION (The Branded Auto-Response)
    // This is sent directly to the customer, so your Zoho filter doesn't need to trigger
    await transporter.sendMail({
      from: `"Earthy Source" <${process.env.MAIL_USER}>`,
      to: body.email,
      subject: `We've received your request | ${ticketId}`,
      html: customerTemplate(body.name, ticketId),
    });

    return Response.json({ success: true, ticketId });

  } catch (err: any) {
    console.error("ZOHO SMTP ERROR:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}