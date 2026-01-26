import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // Initialize the query builder
    let query = supabase
      .from("inventory_movements")
      .select("id, created_at, product_id, movement_type, qty_boxes, order_number, notes")
      .order("created_at", { ascending: false });

    // Apply date filters if provided
    if (start && start !== "") {
      query = query.gte("created_at", `${start}T00:00:00`);
    }
    if (end && end !== "") {
      query = query.lte("created_at", `${end}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}