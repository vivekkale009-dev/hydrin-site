
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAdminClient();
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID" },
        { status: 400 }
      );
    }

    // 1. Fetch Distributor Profile
    const { data: profile, error: pErr } = await supabase
      .from("distributors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (pErr) throw pErr;

    if (!profile) {
      return NextResponse.json(
        { error: "Distributor not found in DB" },
        { status: 404 }
      );
    }

    // 2. Fetch Orders with SKU-wise Order Items
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        total_payable_amount,
        amount_paid,
        pending_amount,
        status,
        uorn,
        order_items (
          product_name,
          qty_boxes
        )
      `)
      .eq("distributor_id", id)
      .order("created_at", { ascending: false });

    if (oErr) throw oErr;

    // 3. Calculate Total Outstanding Balance
    // Existing payment calculation remains unchanged.
    const currentDue =
      orders?.reduce(
        (sum, order) =>
          sum + (Number(order.pending_amount) || 0),
        0
      ) || 0;

    // 4. Return Profile, Orders and SKU Details
    return NextResponse.json({
      data: {
        profile,
        orders: orders || [],
        current_due: currentDue
      }
    });

  } catch (err: any) {
    console.error("API Error Detail:", err);

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
