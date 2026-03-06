export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    // We use createAdminClient because RLS is now enabled 
    // and we need the Service Role to bypass it safely.
    const supabase = await createAdminClient();
    
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