import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { id } = params;

  try {
    // 1. Fetch Order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) throw orderError;

    // 2. Fetch products linked to this order
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, qty_boxes")
      .eq("order_id", id);

    if (itemsError) console.error("Items Error:", itemsError);

    // 3. Combine them into finalData
    const finalData = {
      ...order,
      items: items || []
    };

    // 4. Return with strict no-cache headers
    return new NextResponse(JSON.stringify({ data: finalData }), {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json',
      },
    });
  } catch (e: any) {
    console.error("Route GET Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}