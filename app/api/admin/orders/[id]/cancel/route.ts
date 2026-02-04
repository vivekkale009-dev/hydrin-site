import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  
  try {
    const { action, reason } = await req.json();

    if (action === 'cancel') {
      // 1. Fetch order items
// ... inside the if (action === 'cancel') block ...
  // 1. Fetch items AND the order number for the logs
  const { data: orderData, error: orderFetchErr } = await supabase
    .from('orders')
    .select('uorn, order_items(product_id, qty_boxes)')
    .eq('id', id)
    .single();

  if (orderFetchErr || !orderData) throw new Error("Could not fetch order details for cancellation");

  const items = orderData.order_items;
  const orderNumber = orderData.uorn;

  // 2. Process each item
  if (items && items.length > 0) {
    for (const item of items) {
      const { error: rpcError } = await supabase.rpc('handle_order_cancellation', {
        row_id: item.product_id,
        qty: item.qty_boxes,
        p_order_id: id,          // New Parameter
        p_order_number: orderNumber // New Parameter
      });

      if (rpcError) throw new Error(`Inventory log failed: ${rpcError.message}`);
    }
  }

  // 3. Update Order Status
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ 
      status: 'cancelled', 
      cancel_reason: reason,
      pending_amount: 0 
    })
    .eq('id', id);

  if (updateErr) throw updateErr;
} 
    
    else if (action === 'refund') {
      const { error: refundErr } = await supabase
        .from('orders')
        .update({ 
          status: 'refunded',
          amount_paid: 0,
          pending_amount: 0 
        })
        .eq('id', id);

      if (refundErr) throw new Error(`Refund error: ${refundErr.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Final Cancellation API Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}