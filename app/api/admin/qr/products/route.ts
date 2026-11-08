import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .select("id, name, volume_ml, units_per_box, bottles_per_box")
      .eq("is_active", true)
      .order("volume_ml", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      products: data || [],
    });
  } catch (error) {
    console.error("QR product list error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load active products." },
      { status: 500 }
    );
  }
}
