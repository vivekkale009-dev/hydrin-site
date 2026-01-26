import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    let query = supabase
      .from("distributors")
      .select("*")
      .order("created_at", { ascending: false });

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Distributor list error", err);
    return NextResponse.json(
      { error: "Failed to fetch distributors" },
      { status: 500 }
    );
  }
}
