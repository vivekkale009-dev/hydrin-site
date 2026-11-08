import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const batchId = request.nextUrl.searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: "Batch ID is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("qr_labels")
      .select(
        "id, qr_batch_id, qr_token, status, created_at, registered_at, cancelled_at, cancellation_reason, sku_detail, product_id"
      )
      .eq("qr_batch_id", batchId)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      labels: data || [],
    });
  } catch (error) {
    console.error("QR labels fetch error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load QR labels." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let body: { labelId?: string; reason?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    const labelId = body.labelId?.trim();
    const reason = body.reason?.trim();

    if (!labelId || !reason) {
      return NextResponse.json(
        { success: false, error: "QR label ID and cancellation reason are required." },
        { status: 400 }
      );
    }

    if (reason.length > 300) {
      return NextResponse.json(
        { success: false, error: "Reason must be under 300 characters." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Only an unused label can be cancelled. SKU metadata is not modified.
    const { data, error } = await supabase
      .from("qr_labels")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", labelId)
      .eq("status", "unused")
      .select("id, status, cancelled_at, cancellation_reason")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This QR label cannot be cancelled. It may already be registered, cancelled or expired.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "QR label cancelled successfully.",
      label: data,
    });
  } catch (error) {
    console.error("QR label cancellation error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to cancel QR label." },
      { status: 500 }
    );
  }
}
