import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password, totpCode } = await req.json();

    // 1. Basic Credential Check
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid Credentials" }, { status: 401 });
    }

    // 2. 2FA Check (Dynamic Import to bypass build errors)
    // This 'require' happens at runtime, so the build won't fail.
    const otplib = require("otplib");
    const authenticator = otplib.authenticator;
    
    const secret = (process.env.ADMIN_TOTP_SECRET || "").replace(/\s+/g, "");
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    const isValidToken = authenticator.check(totpCode, secret);
    const isRecoveryUsed = recovery && totpCode === recovery;

    if (!isValidToken && !isRecoveryUsed) {
      return NextResponse.json({ success: false, error: "Invalid Auth Code" }, { status: 401 });
    }

    // 3. Success Logic
    const res = NextResponse.json({ success: true });
    res.cookies.set("oxy_admin", "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 Hour Session
    });

    return res;
  } catch (e: any) {
    console.error("Login Error:", e.message);
    return NextResponse.json({ success: false, error: "Authentication system error" }, { status: 500 });
  }
}