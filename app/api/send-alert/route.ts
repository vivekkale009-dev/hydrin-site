import { NextResponse } from "next/server";

// ⚠️ Stub: logs to server. Replace with Resend / SMTP later.
async function sendEmailStub(subject: string, body: string) {
  console.warn("ALERT EMAIL (stub) ::", subject, body);
  // TODO:
  // - integrate Resend, SendGrid, SMTP, etc.
  // - use process.env.ALERT_EMAIL_TO / FROM
}

export async function POST(req: Request) {
  const { type, payload } = await req.json();

  const subject = `[OxyHydra] Scan Alert: ${type}`;
  const body = JSON.stringify(payload, null, 2);

  await sendEmailStub(subject, body);

  return NextResponse.json({ ok: true });
}
