import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { id } = params;

  try {
    const { amountPaid, paymentMethod, transactionRef, vanId } = await req.json();
    const incoming = Number(amountPaid || 0);

    const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const newTotalPaid = Number(order.amount_paid || 0) + incoming;
    const newPending = Number(order.total_payable_amount) - newTotalPaid;

    // Update Orders Table
    const { error: orderErr } = await supabase.from("orders").update({
      amount_paid: newTotalPaid,
      pending_amount: newPending,
      van_id: vanId || null,
      status: newTotalPaid >= Number(order.total_payable_amount) ? "payment_verified" : "partially_paid"
    }).eq("id", id);

    if (orderErr) throw orderErr;

    // Insert Payment with correct column name: transaction_id
    if (incoming > 0) {
      const { error: payErr } = await supabase.from("order_payments").insert({
        order_id: id,
        amount: incoming,
        payment_method: paymentMethod,
        transaction_id: transactionRef, 
        updated_by: "Admin"
      });
      if (payErr) throw payErr;
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}