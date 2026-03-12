import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password, totpCode } = await req.json();

    // 1. Basic Credential Check
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid Credentials" }, { status: 401 });
    }

    // 2. Load v13 API
    const otplib = require("otplib");
    
    // In v13, 'verifySync' is the direct replacement for 'authenticator.check'
    const verifyFunc = otplib.verifySync || otplib.verify;

    if (!verifyFunc) {
      console.error("Library Error: verify function not found in bundle", otplib);
      throw new Error("MFA Library configuration error.");
    }
    
    const secret = (process.env.ADMIN_TOTP_SECRET || "").replace(/\s+/g, "");
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    // 3. Strict 2FA Validation using v13 verifySync
    // The arguments for verifySync are (token, secret) or an options object.
    // Standard usage for v13: verifySync({ token, secret })
    const isValidToken = verifyFunc({
      token: totpCode,
      secret: secret
    });

    const isRecoveryUsed = recovery && totpCode === recovery;

    if (!isValidToken && !isRecoveryUsed) {
      return NextResponse.json({ success: false, error: "Invalid Auth Code" }, { status: 401 });
    }

    // 4. Success Logic
    const res = NextResponse.json({ success: true });
    res.cookies.set("oxy_admin", "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    return res;
  } catch (e: any) {
    console.error("Critical Login Error:", e.message);
    return NextResponse.json({ success: false, error: "System Error: " + e.message }, { status: 500 });
  }
}