import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// DELETE THESE TWO LINES:
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("orders_with_details") // Fetching from the view
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}