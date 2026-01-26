import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select("id, name, volume_ml, units_per_box")
      .eq("is_active", true)
      .order("volume_ml", { ascending: false }); // 1L, then 500, then 200

    if (error) {
      console.error("products-basic error:", error);
      return NextResponse.json(
        { error: "Failed to load products" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("products-basic fatal:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
