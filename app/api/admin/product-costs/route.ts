import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Returns aggregated production cost PER BOTTLE for each product
 * Used ONLY for admin margin preview (not invoice, not final calc)
 */
export async function GET() {
  try {
    const s = await createServerSupabaseClient();

    const { data, error } = await s
      .from("product_cost_components")
      .select("product_id, cost_per_unit")
      .eq("is_active", true);

    if (error) throw error;

    // Aggregate cost per product
    const costMap: Record<string, number> = {};

    for (const row of data || []) {
      const pid = row.product_id;
      const cost = Number(row.cost_per_unit || 0);
      costMap[pid] = (costMap[pid] || 0) + cost;
    }

    return NextResponse.json({ data: costMap });

  } catch (err) {
    console.error("product-costs api error", err);
    return NextResponse.json(
      { error: "Failed to load product costs" },
      { status: 500 }
    );
  }
}
