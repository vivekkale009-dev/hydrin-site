import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id, is_active, blocked_reason } = await req.json();

    const { error } = await supabase
      .from("distributors")
      .update({ 
        is_active, 
        blocked_reason: is_active ? null : blocked_reason 
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}