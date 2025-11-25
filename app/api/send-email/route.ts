import nodemailer from "nodemailer";
import { customerTemplate, adminTemplate } from "./email-templates";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER!,
        pass: process.env.MAIL_PASS!,
      },
    });

    // Generate Ticket ID
    function generateTicketId() {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");

      const shortHash = (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
      )
        .slice(-4)
        .toUpperCase();

      return `OH${yy}${mm}${dd}${shortHash}`;
    }

    const ticketId = generateTicketId();

    // Send admin email
    await transporter.sendMail({
      from: process.env.MAIL_USER!,
      to: process.env.MAIL_TO!,
      subject: `New Complaint | ${ticketId}`,
      html: adminTemplate({
        name: body.name,
        phone: body.phone,
        email: body.email,
        message: body.message,
        ticketId,
      }),
    });

    // Send customer email
    await transporter.sendMail({
      from: process.env.MAIL_USER!,
      to: body.email,
      subject: `Complaint Received | ${ticketId}`,
      html: customerTemplate(body.name, ticketId),
    });

    return Response.json({ success: true, ticketId });

  } catch (err: any) {
    console.error("SEND EMAIL ERROR:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
