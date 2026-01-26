import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ data: [] });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc(
      "search_distributors_with_dues",
      { search_text: q }
    );

    if (error) {
      console.error("❌ RPC ERROR:", error);
      throw error;
    }

    // 🔒 Normalize output (no undefined, no null surprises)
    const normalized = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      pending_amount: Number(d.pending_amount || 0),
      unpaid_order_count: Number(d.unpaid_order_count || 0),
      credit_enabled: Boolean(d.credit_enabled),
      delivery_rate_per_km: Number(d.delivery_rate_per_km || 0)
    }));

    console.log("✅ DISTRIBUTOR SEARCH RESULT:", normalized);

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error("❌ Distributor search failed", err);
    return NextResponse.json(
      { error: "Failed to search distributors" },
      { status: 500 }
    );
  }
}
