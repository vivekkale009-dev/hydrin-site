import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { id, ...updates } = body;

    const { error } = await supabase
      .from("distributors")
      .update({
        name: updates.name,
        phone: updates.phone,
        city: updates.city,
        delivery_rate_per_km: updates.delivery_rate_per_km,
        credit_limit: updates.credit_limit,
        // Add other columns here if needed
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}