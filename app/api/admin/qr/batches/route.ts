
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error, count } = await supabase
      .from("qr_batches")
      .select(
        "id, batch_date, batch_number, status, total_labels",
        { count: "exact" }
      )
      .order("batch_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        diagnostic: {
          projectHost: process.env.NEXT_PUBLIC_SUPABASE_URL
            ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
            : "MISSING",
          databaseCount: count,
          returnedCount: data?.length ?? 0,
          checkedAt: new Date().toISOString(),
        },
        batches: data ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
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
