import nodemailer from "nodemailer";
import { customerTemplate, adminTemplate } from "./email-templates";

// --- IN-MEMORY RATE LIMITER ---
// Stores: { "ip-address": { count: number, lastReset: number } }
const ipCache = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 3; // Max 3 emails
const WINDOW = 60 * 60 * 1000; // per 1 hour (in milliseconds)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headers = req.headers;

    // 1. GET IP ADDRESS (Works on Vercel/Netlify/Local)
    const ip = headers.get("x-forwarded-for") || "0.0.0.0";

    // 2. CHECK RATE LIMIT
    const now = Date.now();
    const userData = ipCache.get(ip) || { count: 0, lastReset: now };

    // Reset count if the hour has passed
    if (now - userData.lastReset > WINDOW) {
      userData.count = 0;
      userData.lastReset = now;
    }

    if (userData.count >= LIMIT) {
      return Response.json(
        { error: "Too many requests. Please try again later." }, 
        { status: 429 }
      );
    }

    // Update the cache
    userData.count += 1;
    ipCache.set(ip, userData);

    // 3. REFERRER CHECK (Invisible Security)
    const referer = headers.get("referer");
    const host = headers.get("host");
    const isLocal = host?.includes("localhost");
    
    // Replace with your actual domain
    if (!isLocal && referer && !referer.includes("earthysource.com")) {
       return Response.json({ error: "Unauthorized source" }, { status: 403 });
    }

    // --- NODEMAILER LOGIC ---
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
      const d = new Date();
      const dateStr = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const hash = (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(-4).toUpperCase();
      return `ES${dateStr}${hash}`;
    })();

    // Admin Notification
    await transporter.sendMail({
      from: `"${body.name} (Website Lead)" <${process.env.MAIL_USER}>`, 
      to: process.env.MAIL_TO,
      replyTo: body.email,
      subject: `New Lead | ${ticketId} | ${body.name}`,
      html: adminTemplate({
        name: body.name,
        phone: body.phone,
        email: body.email,
        message: body.message,
        ticketId,
      }),
    });

    // Customer Confirmation
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