import { NextResponse } from "next/server";
// Use this specific import style to bypass the 'authenticator' export error
import * as otplib from "otplib";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, totpCode } = body;

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_TOTP_SECRET || "";
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    // 1. Basic Auth Check
    if (username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    // 2. 2FA Check - Accessing via the otplib namespace
    const isValidToken = otplib.authenticator.check(totpCode, secret);
    const isRecoveryUsed = recovery && totpCode === recovery;

    if (!isValidToken && !isRecoveryUsed) {
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
  } catch (e) {
    console.error("Login Error:", e);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}