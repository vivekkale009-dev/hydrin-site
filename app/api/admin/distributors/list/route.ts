export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    // We use createAdminClient because RLS is now enabled 
    // and we need the Service Role to bypass it safely.
    const supabase = await createAdminClient();
    
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

   let query = supabase
      .from("distributors")
      .select("*")
      .order("created_at", { ascending: false });

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data: distributors, error: distError } = await query;
    if (distError) throw distError;

    const { data: orders, error: ordError } = await supabase
      .from("orders")
      .select("distributor_id, pending_amount");

    if (ordError) {
      console.error("Error fetching orders for calculation:", ordError);
    }

    const formattedData = (distributors || []).map((d: any) => {
      const distributorOrders = (orders || []).filter(
        (o: any) => o.distributor_id === d.id
      );

      const total_pending = distributorOrders.reduce(
        (sum: number, o: any) => sum + Number(o.pending_amount || 0),
        0
      );

      return { ...d, total_pending };
    });
    return NextResponse.json({ data: formattedData });
  } catch (err) {
    console.error("Distributor list error", err);
    return NextResponse.json(
      { error: "Failed to fetch distributors" },
      { status: 500 }
    );
  }
}