
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { count, error: countError } = await supabase
      .from("qr_batches")
      .select("*", { count: "exact", head: true });

    const { data, error } = await supabase
      .from("qr_batches")
      .select("id, batch_date, batch_number, status, total_labels")
      .order("batch_date", { ascending: false });

    if (countError) throw countError;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      databaseCount: count,
      returnedCount: data?.length ?? 0,
      batches: data ?? [],
    });
  } catch (error) {
    console.error("QR batch diagnostic error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 }
    );
  }
}
