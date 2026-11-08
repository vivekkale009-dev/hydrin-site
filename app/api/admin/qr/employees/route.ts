
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, role, contact_number")
      .order("full_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      employees: data || [],
    });
  } catch (error) {
    console.error("Employee API error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load employee records." },
      { status: 500 }
    );
  }
}
