import { NextResponse } from "next/server";
import { authenticator } from "otplib";

export async function POST(req: Request) {
  try {
    const { username, password, totpCode } = await req.json();

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_TOTP_SECRET;
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    // 1. Basic Auth Check
    if (username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
    }

    // 2. 2FA Check (Zoho Code OR Recovery Code)
    const isValidToken = authenticator.check(totpCode, secret || "");
    const isRecoveryUsed = totpCode === recovery && recovery !== undefined;

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
      maxAge: 60 * 60 * 2, // 2-hour session
    });

    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}