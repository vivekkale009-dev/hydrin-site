import nodemailer from "nodemailer";

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
    const ticketId =
      "OX-" + String(Math.floor(Math.random() * 9999)).padStart(4, "0");

    // --- EMAIL TO YOU (ADMIN) ---
    await transporter.sendMail({
      from: process.env.MAIL_USER!,
      to: process.env.MAIL_TO!, // your email
      subject: `New Complaint Received | ${ticketId}`,
      text: `
A new complaint has been submitted.

Ticket ID: ${ticketId}

Name: ${body.name}
Phone: ${body.phone}
Email: ${body.email}

Message:
${body.message}
      `,
    });

    // --- AUTO-REPLY TO CUSTOMER ---
    await transporter.sendMail({
      from: process.env.MAIL_USER!,
      to: body.email,
      subject: `Your Complaint Received | ${ticketId}`,
      text: `
Hi ${body.name},

We have received your complaint.

Your Ticket ID: ${ticketId}

Our team will get back to you shortly.
      
Thanks,
OxyHydra Support
`,
    });

    return Response.json({ success: true, ticketId });
  } catch (error: any) {
    console.error("Email error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
