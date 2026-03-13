import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

function verifyTOTP(token: string, secret: string) {
  try {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (let i = 0; i < secret.length; i++) {
      const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
      bits += val.toString(2).padStart(5, '0');
    }
    const buffer = Buffer.from(bits.match(/.{1,8}/g)!.map(b => parseInt(b, 2)));
    const counter = Math.floor(Date.now() / 30000);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac("sha1", buffer).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24 |
                  (hmac[offset + 1] & 0xff) << 16 |
                  (hmac[offset + 2] & 0xff) << 8 |
                  (hmac[offset + 3] & 0xff)) % 1000000;
    return code.toString().padStart(6, '0') === token;
  } catch (e) { return false; }
}

export async function POST(req: Request) {
  try {
    const { username, password, totpCode, phase } = await req.json();

    // PHASE 1: Primary Credential Check
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid Credentials" }, { status: 401 });
    }

    // If only Phase 1 is requested, return success now
    if (phase === 1) {
      return NextResponse.json({ success: true });
    }

    // PHASE 2: TOTP Verification
    const secret = (process.env.ADMIN_TOTP_SECRET || "").replace(/\s+/g, "");
    const recovery = process.env.ADMIN_RECOVERY_CODE;

    const isValidToken = verifyTOTP(totpCode, secret);
    const isRecoveryUsed = recovery && totpCode === recovery;

    if (!isValidToken && !isRecoveryUsed) {
      return NextResponse.json({ success: false, error: "Invalid Security Token" }, { status: 401 });
    }

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
    return NextResponse.json({ success: false, error: "Auth System Error" }, { status: 500 });
  }
}