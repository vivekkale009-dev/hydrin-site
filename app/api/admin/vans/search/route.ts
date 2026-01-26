import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ data: [] });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc("search_vans", {
      search_text: q
    });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("VAN search error", err);
    return NextResponse.json(
      { error: "Failed to search vans" },
      { status: 500 }
    );
  }
}
