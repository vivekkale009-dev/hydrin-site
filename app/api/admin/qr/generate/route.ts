
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getIndiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    let body: { quantity?: number };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const quantity = Number(body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return NextResponse.json(
        { success: false, error: "Quantity must be between 1 and 500." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const today = getIndiaDate();

    const { data: batch, error: batchError } = await supabase
      .from("qr_batches")
      .select("id")
      .eq("batch_date", today)
      .eq("status", "active")
      .order("batch_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batchError) throw batchError;

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Generate today's PIN before generating QR labels.",
        },
        { status: 400 }
      );
    }

    const tokens = Array.from(
      { length: quantity },
      () => randomBytes(32).toString("hex")
    );

    const { data: labels, error: insertError } = await supabase.rpc(
      "generate_qr_labels",
      {
        p_batch_id: batch.id,
        p_tokens: tokens,
      }
    );

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `${labels?.length || 0} QR labels generated successfully.`,
      labels: (labels || []).map(
        (label: { id: string; qr_token: string }) => ({
          id: label.id,
          qr_token: label.qr_token,
        })
      ),
    });
  } catch (error) {
    console.error("QR generation error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to generate QR labels." },
      { status: 500 }
    );
  }
}
