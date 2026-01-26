import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // 1. Fetch all vans
    const { data: vans, error: vanError } = await supabase
      .from("vans")
      .select("*")
      .order('created_at', { ascending: false });
    
    if (vanError) throw vanError;

    // 2. Fetch all orders and payouts to calculate totals
    const { data: orders } = await supabase.from("orders").select("van_id, delivery_fee");
    const { data: payouts } = await supabase.from("van_payouts").select("van_id, amount");

    // 3. Map totals to each van
    const enrichedVans = vans.map(van => {
      const total_earned = orders
        ?.filter(o => o.van_id === van.id)
        .reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0) || 0;

      const total_paid = payouts
        ?.filter(p => p.van_id === van.id)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

      return {
        ...van,
        total_earned,
        total_paid,
        balance: total_earned - total_paid
      };
    });

    return NextResponse.json({ data: enrichedVans });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}