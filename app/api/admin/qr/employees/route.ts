
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, role, contact_number, is_active")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Employee database query error:", error);
      throw error;
    }

    console.log("QR employees loaded:", data?.length ?? 0);

    return NextResponse.json(
      {
        success: true,
        employees: data ?? [],
        total: data?.length ?? 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Employee API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load employee records.",
      },
      { status: 500 }
    );
  }
}
