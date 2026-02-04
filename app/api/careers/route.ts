import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const userEmail = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const role = formData.get("role") as string;
    const resume = formData.get("resume") as File;

    const buffer = Buffer.from(await resume.arrayBuffer());

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: true, 
      auth: {
        user: process.env.CAREERS_AUTH_USER,
        pass: process.env.CAREERS_AUTH_PASS,
      },
    });

    // 1. NOTIFICATION TO ADMIN (Simple & Functional)
    await transporter.sendMail({
      from: `"EarthySource Hiring" <${process.env.CAREERS_AUTH_USER}>`,
      to: process.env.CAREERS_MAIL_TO, 
      replyTo: userEmail,
      subject: `New Application: ${role} - ${name}`,
      text: `New application received.\n\nName: ${name}\nEmail: ${userEmail}\nPhone: ${phone}\nRole: ${role}`,
      attachments: [{ filename: resume.name, content: buffer }],
    });

    // 2. ACKNOWLEDGEMENT TO CANDIDATE (Attractive & Professional)
    const candidateHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #fdfcf9;">
        <div style="background-color: #166534; padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">EarthySource</h1>
        </div>
        <div style="padding: 40px; color: #111827;">
          <h2 style="color: #166534; margin-top: 0;">Hi ${name},</h2>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for your interest in joining the <strong>EarthySource</strong> team. We've successfully received your application for the <strong>${role}</strong> position.</p>
          <p style="font-size: 16px; line-height: 1.6;">Our mission is to reconnect the world with nature's purity, and we're excited to see how your talents can help us flow toward that goal.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-radius: 12px; border-left: 4px solid #166534;">
            <p style="margin: 0; font-weight: bold; color: #166534;">Next Steps:</p>
            <p style="margin: 5px 0 0; font-size: 14px; color: #4b5563;">Our hiring team will review your resume. If your profile matches our current needs, we will reach out to you within 5-7 business days.</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Stay hydrated and stay grounded.</p>
          <p style="margin-top: 40px; font-size: 14px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Best Regards,<br />
            <strong>The EarthySource Talent Team</strong><br />
            <a href="https://earthysource.in" style="color: #166534; text-decoration: none;">earthysource.in</a>
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"EarthySource Careers" <${process.env.CAREERS_AUTH_USER}>`,
      to: userEmail,
      replyTo: "careers@earthysource.in", 
      subject: `We've received your application - EarthySource`,
      html: candidateHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mail Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}