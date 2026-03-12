import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password, totpCode } = await req.json();

    // 1. Basic Credential Check
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid Credentials" }, { status: 401 });
    }

    // 2. Dynamic Library Discovery
    const lib = require("otplib");
    
    // This looks for 'authenticator' in 4 different places to handle all bundle types
    const authenticator = lib.authenticator || 
                          (lib.default && lib.default.authenticator) || 
                          lib || 
                          lib.default;

    if (!authenticator || typeof authenticator.check !== 'function') {
      console.error("Library Error: Authenticator not found in bundle", lib);
      throw new Error("Authenticator library failed to load properly.");
    }
    
    const secret = (process.env.ADMIN_TOTP_SECRET || "").replace(/\s+/g, "");
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    // 3. Strict 2FA Validation
    const isValidToken = authenticator.check(totpCode, secret);
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