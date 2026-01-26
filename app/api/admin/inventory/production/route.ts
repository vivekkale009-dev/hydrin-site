import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const { productId, qtyAdded } = await req.json();

    // 1. Log the movement using 'release' to satisfy the DB constraint
    const { error: logErr } = await supabase.from("inventory_movements").insert({
      product_id: productId,
      movement_type: 'release', 
      qty_boxes: Number(qtyAdded),
      notes: "Manual Production Entry"
    });
    if (logErr) throw logErr;

    // 2. Update the balance using the RPC
    const { error: rpcErr } = await supabase.rpc('increment_inventory', { 
      row_id: productId, 
      qty: Number(qtyAdded) 
    });
    if (rpcErr) throw rpcErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}