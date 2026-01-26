import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: inventory, error: invError } = await supabase
      .from("inventory_products")
      .select("*");

    if (invError) throw invError;

    // Fetching id, name, AND units_per_box for bottle calculations
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, name, units_per_box");

    if (prodError) throw prodError;

    const formatted = inventory.map((inv: any) => {
      const prod = products.find((p) => p.id === inv.product_id);
      return {
        product_id: inv.product_id,
        available_boxes: Number(inv.available_boxes || 0),
        reserved_boxes: Number(inv.reserved_boxes || 0),
        product_name: prod ? prod.name : "Unknown Product SKU",
        units_per_box: prod ? Number(prod.units_per_box || 0) : 0, // Passed to frontend
      };
    });

    return NextResponse.json({ data: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}