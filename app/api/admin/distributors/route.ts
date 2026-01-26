import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const s = await createServerSupabaseClient();

  let query = s
    .from("distributors")
    .select(`
      id,
      name,
      phone,
      city,
      pincode,
      is_active,
      distance_km,
      delivery_rate_per_km,
      created_by_admin,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
