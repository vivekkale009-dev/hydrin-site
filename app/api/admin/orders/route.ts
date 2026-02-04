import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Keep these if you want to ensure the browser never caches the order list
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // Ensure these match your .env variable names
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("orders_with_details") 
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    return NextResponse.json({ data }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (e: any) {
    console.error("API 500 Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}