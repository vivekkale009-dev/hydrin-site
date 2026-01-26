import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Only define these once at the top
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { id } = params;

  try {
    const { amount } = await req.json();

    const { error } = await supabase
      .from("van_payouts")
      .insert([{ 
        van_id: id, 
        amount: Number(amount), 
        payment_method: 'cash' 
      }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Payout Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}