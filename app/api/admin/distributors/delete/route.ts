import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await req.json();

    const { error } = await supabase
      .from("distributors")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}