import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id, notes, items, orderUorn } = await req.json();
    const supabase = createAdminClient();

    // 1. Update Order Table (EXACTLY YOUR LOGIC)
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        exit_confirmed_at: new Date().toISOString(),
        exit_notes: notes,
        status: 'delivered'
      })
      .eq("id", id);

    if (orderError) throw orderError;

    // 2. Log final DEDUCT and Clear Inventory (EXACTLY YOUR LOOP)
    for (const item of items) {
      if (item.product_id && item.qty_boxes) {
        
        // Audit trail entry for the final deduction
        await supabase.from("inventory_movements").insert({
          product_id: item.product_id,
          order_id: id,
          order_number: orderUorn,
          movement_type: 'deduct', 
          qty_boxes: Number(item.qty_boxes),
          notes: `Vehicle Exit Confirmed: ${notes}`
        });

        // Clear the reservation in DB
        const { error: rpcError } = await supabase.rpc('clear_reservation', { 
          p_product_id: item.product_id, 
          p_qty: Number(item.qty_boxes) 
        });
        
        if (rpcError) console.error(`Inventory Error for ${item.product_id}:`, rpcError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Critical Exit Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}