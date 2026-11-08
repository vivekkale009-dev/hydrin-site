
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productId = String(body.productId || "");
    const qtyAdded = Number(body.qtyAdded);

    // Generate an ID if the frontend has not supplied one.
    const entryId = String(body.entryId || randomUUID());

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product is required" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      return NextResponse.json(
        { success: false, error: "Invalid product ID" },
        { status: 400 }
      );
    }

    if (!Number.isSafeInteger(qtyAdded) || qtyAdded <= 0) {
      return NextResponse.json(
        { success: false, error: "Enter a valid positive whole-number quantity" },
        { status: 400 }
      );
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entryId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid production entry ID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "register_manual_production",
      {
        p_entry_id: entryId,
        p_product_id: productId,
        p_qty_boxes: qtyAdded,
      }
    );

    if (error) {
      console.error("Manual production error:", error);

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Production API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Production entry failed",
      },
      { status: 500 }
    );
  }
}
