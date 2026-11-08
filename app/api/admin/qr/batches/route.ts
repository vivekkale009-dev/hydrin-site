
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("qr_batches")
      .select(
        "id, batch_date, batch_number, status, total_labels, created_at"
      )
      .order("batch_date", { ascending: false })
      .order("batch_number", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      batches: data || [],
    });
  } catch (error) {
    console.error("QR batch history error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load QR batch history." },
      { status: 500 }
    );
  }
}
