import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createAdminClient();
    // Added low_stock_threshold to the incoming request body
    const { id, current_stock, name, low_stock_threshold } = await req.json();

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Dynamically build the update object based on what was sent
    const updateData: any = {};
    if (current_stock !== undefined) updateData.current_stock = Number(current_stock);
    if (name !== undefined) updateData.name = name;
    
    // NEW: Allow updating the threshold
    if (low_stock_threshold !== undefined) {
      updateData.low_stock_threshold = Number(low_stock_threshold);
    }

    // Safety check: if no valid fields were sent, don't ping the DB
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from('raw_materials')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}