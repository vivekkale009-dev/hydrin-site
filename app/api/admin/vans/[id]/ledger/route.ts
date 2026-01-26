import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Only define these once at the top
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { data: van } = await supabase.from("vans").select("*").eq("id", id).single();

    const { data: orders } = await supabase
      .from("orders")
      .select("id, uorn, created_at, delivery_fee")
      .eq("van_id", id);

    const { data: payouts } = await supabase
      .from("van_payouts")
      .select("*")
      .eq("van_id", id)
      .order('paid_at', { ascending: false });

    const totalEarned = orders?.reduce((acc, curr) => acc + (Number(curr.delivery_fee) || 0), 0) || 0;
    const totalPaid = payouts?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

    return NextResponse.json({
      data: {
        van,
        orders: orders || [],
        payouts: payouts || [],
        summary: {
          total_earned: totalEarned,
          total_paid: totalPaid,
          balance: totalEarned - totalPaid
        }
      }
    });
  } catch (e: any) {
    console.error("Ledger API Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}