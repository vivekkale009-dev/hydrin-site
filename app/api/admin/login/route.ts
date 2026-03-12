import { NextResponse } from "next/server";

// Using require because otplib's ESM exports are inconsistent in production bundles
const otplib = require("otplib");

export const dynamic = 'force-dynamic';

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
      return NextResponse.json(
        { success: false, error: "Invalid username or password" }, 
        { status: 401 }
      );
    }

    // 2. 2FA Check
    // In production, require('otplib') returns the authenticator directly 
    // or as a property. This check handles both scenarios.
    const authenticator = otplib.authenticator || otplib;
    
    const isValidToken = authenticator.check(totpCode, secret);
    const isRecoveryUsed = recovery && totpCode === recovery;

    if (!isValidToken && !isRecoveryUsed) {
      return NextResponse.json(
        { success: false, error: "Invalid 6-digit Auth Code" }, 
        { status: 401 }
      );
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
    console.error("Login Error:", e);
    return NextResponse.json(
      { success: false, error: "Authentication system error" }, 
      { status: 500 }
    );
  }
}