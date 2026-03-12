import { NextResponse } from "next/server";
import { authenticator } from "otplib";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password, totpCode } = await req.json();

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    const secret = (process.env.ADMIN_TOTP_SECRET || "").replace(/\s+/g, "");
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    // 1. Primary Credential Check
    if (username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ success: false, error: "Invalid Credentials" }, { status: 401 });
    }

    // 2. Multi-Factor Check
    // We force a strict boolean check here
    const isValidToken = authenticator.check(totpCode, secret) === true;
    const isRecoveryUsed = recovery && totpCode === recovery;

    // FAIL-SAFE: If it's not a valid token AND not the recovery code, reject.
    if (!isValidToken && !isRecoveryUsed) {
      console.log("⚠️ Security Alert: Unauthorized 2FA attempt");
      return NextResponse.json({ success: false, error: "Access Denied: Invalid Auth Code" }, { status: 401 });
    }

    // 3. Success Logic
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
    console.error("Login Crash:", e.message);
    return NextResponse.json({ success: false, error: "Auth System Error" }, { status: 500 });
  }
}