
import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPin, decryptPin } from "@/lib/qr-pin-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIndiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function getTomorrowMidnightIndia(): string {
  const today = getIndiaDate();

  const midnight = new Date(`${today}T00:00:00+05:30`);
  midnight.setDate(midnight.getDate() + 1);

  return midnight.toISOString();
}

function createPin(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letter = letters[randomInt(letters.length)];
  const digits = String(randomInt(0, 10000)).padStart(4, "0");

  return `${letter}${digits}`;
}

// GET: retrieve the currently active PIN.
export async function GET() {
  try {
    const supabase = createAdminClient();
    const today = getIndiaDate();

    const { data, error } = await supabase
      .from("qr_batches")
      .select(
        "id, batch_date, batch_number, pin_encrypted, pin_expires_at"
      )
      .eq("batch_date", today)
      .eq("status", "active")
      .order("batch_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        success: true,
        exists: false,
        pin: null,
      });
    }

    if (!data.pin_encrypted) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This PIN was created before encrypted storage was installed. Regenerate today's PIN once.",
        },
        { status: 409 }
      );
    }

    if (new Date(data.pin_expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: "Today's PIN has expired.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: true,
      pin: decryptPin(data.pin_encrypted),
      batch: {
        id: data.id,
        batch_date: data.batch_date,
        batch_number: data.batch_number,
        pin_expires_at: data.pin_expires_at,
      },
    });
  } catch (error) {
    console.error("PIN retrieval error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to retrieve today's PIN." },
      { status: 500 }
    );
  }
}

// POST: create a new PIN and invalidate the old one.
export async function POST() {
  try {
    const supabase = createAdminClient();

    const today = getIndiaDate();
    const pin = createPin();

    const pinHash = await bcrypt.hash(pin, 12);
    const pinEncrypted = encryptPin(pin);
    const expiry = getTomorrowMidnightIndia();

    const { data, error } = await supabase.rpc(
      "regenerate_daily_qr_pin",
      {
        p_batch_date: today,
        p_pin_hash: pinHash,
        p_pin_encrypted: pinEncrypted,
        p_pin_expires_at: expiry,
      }
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "New PIN generated. Previous PIN invalidated.",
      pin,
      batch: {
        id: data.id,
        batch_date: data.batch_date,
        batch_number: data.batch_number,
        pin_expires_at: data.pin_expires_at,
      },
    });
  } catch (error) {
    console.error("PIN generation error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to generate a new PIN." },
      { status: 500 }
    );
  }
}
