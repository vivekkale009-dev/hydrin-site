// /api/products-basic/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic'; // Prevent stale "0" stock from caching

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select(`
        id, 
        name, 
        volume_ml, 
        units_per_box,
        inventory_products (
          available_boxes
        )
      `)
      .eq("is_active", true);

    if (error) throw error;

    // DEBUG: Check your console log to see if it's an array [] or object {}
    console.log("Raw Supabase Data:", JSON.stringify(data[0], null, 2));

    const formattedData = data.map((product: any) => {
      const inv = product.inventory_products;
      
      // FIX: Handle both Array and Object response formats
      let stock = 0;
      if (Array.isArray(inv)) {
        stock = inv[0]?.available_boxes || 0;
      } else if (inv && typeof inv === 'object') {
        stock = inv.available_boxes || 0;
      }

      return {
        ...product,
        available_boxes: stock
      };
    });

    return NextResponse.json(formattedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}