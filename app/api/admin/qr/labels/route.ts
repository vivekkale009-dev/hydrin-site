
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;

export async function GET() {
  try {
    const supabase = createAdminClient();

    const allBatches = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("qr_batches")
        .select(
          "id, batch_date, batch_number, status, total_labels, created_at"
        )
        .order("batch_date", { ascending: false })
        .order("batch_number", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const page = data || [];

      allBatches.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    console.log("QR batches loaded:", allBatches.length);

    return NextResponse.json({
      success: true,
      batches: allBatches,
      total: allBatches.length,
    });

  } catch (error) {
    console.error("QR batch history error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load QR batch history.",
      },
      { status: 500 }
    );
  }
}
