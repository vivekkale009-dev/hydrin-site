import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const s = await createServerSupabaseClient();
    const body = await req.json();

    const {
      distributor_id,
      distance_km,
      delivery_rate_per_km,
      allow_credit,
    } = body;

    if (!distributor_id) {
      return NextResponse.json(
        { error: "Distributor ID required" },
        { status: 400 }
      );
    }

    await s
      .from("distributors")
      .update({
        is_approved: true,
        is_active: true,
        approved_at: new Date().toISOString(),
        distance_km,
        delivery_rate_per_km: delivery_rate_per_km ?? 15,
        allow_credit: allow_credit ?? false,
      })
      .eq("id", distributor_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("APPROVE DISTRIBUTOR ERROR", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
