import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    // In some Next.js versions, params must be awaited
    const id = params.id; 

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // 1. Fetch Profile
    const { data: profile, error: pErr } = await supabase
      .from("distributors")
      .select("*")
      .eq("id", id)
      .maybeSingle(); // Use maybeSingle to avoid throwing on 0 results

    if (pErr) throw pErr;
    
    // This is where your "Distributor not found" error is triggering
    if (!profile) {
      return NextResponse.json({ error: "Distributor not found in DB" }, { status: 404 });
    }

    // 2. Fetch Orders
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id, created_at, total_payable_amount, amount_paid, pending_amount, status, uorn")
      .eq("distributor_id", id)
      .order("created_at", { ascending: false });

    if (oErr) throw oErr;

    const currentDue = orders?.reduce((sum, o) => sum + (Number(o.pending_amount) || 0), 0) || 0;

    return NextResponse.json({ 
      data: { profile, orders: orders || [], current_due: currentDue } 
    });
  } catch (err: any) {
    console.error("API Error Detail:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}