import { NextResponse } from "next/server";
import { verify } from "otplib";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, totpCode } = body;

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_TOTP_SECRET || "";
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    // 1. Basic Credentials Check
    if (username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    // 2. 2FA Check
    // otplib v13 verify() returns { valid: boolean }
    const result = await verify({
      token: totpCode,
      secret: secret
    });

    const isRecoveryUsed = recovery && totpCode === recovery;

    // result.valid is what tells us if the 6-digit code is correct
    if (!result && !isRecoveryUsed) {
      return NextResponse.json({ success: false, error: "Invalid Auth Code" }, { status: 401 });
    }

    // 3. Successful Login
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
    console.error("Login Error:", e.message);
    return NextResponse.json({ success: false, error: "Auth System Error" }, { status: 500 });
  }
}