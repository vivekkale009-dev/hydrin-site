import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "vivek.kale90@gmail.com",
      subject: `New Complaint from ${body.name}`,
      text: `
New complaint received.

Name: ${body.name}
Phone: ${body.phone}
Email: ${body.email}
Message: ${body.message || "N/A"}
      `,
    });

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ success: false, error: err.toString() }, { status: 500 });
  }
}
