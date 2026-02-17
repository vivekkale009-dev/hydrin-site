import { NextResponse } from "next/server";
// Use the exact name from your server file
import { createServerSupabaseClient } from "@/lib/supabase/server"; 

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { grossRevenue, taxAmount, deliveryFee, totalPayable, reason } = await req.json();

    // 1. Initialize the client using your specific function
    const supabase = await createServerSupabaseClient();

    // 2. Update the Order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        gross_revenue: grossRevenue,
        delivery_fee: deliveryFee,
        total_payable_amount: totalPayable,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error("Order Update Error:", updateError.message);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // 3. Create History Entry
    const logDetails = `Fee Edit: Subtotal ₹${grossRevenue}, Tax ₹${taxAmount}, Delivery ₹${deliveryFee}. Total: ₹${totalPayable}. Reason: ${reason}`;
    
    const { error: historyError } = await supabase
      .from('order_history')
      .insert({
        order_id: id,
        action: 'FEE_OVERRIDE',
        details: logDetails
      });

    if (historyError) {
      console.error("History Log Error:", historyError.message);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Server Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}