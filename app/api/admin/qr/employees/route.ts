
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { count, error: countError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    const { data: jayvant, error: jayvantError } = await supabase
      .from("employees")
      .select("id, full_name, employee_no, is_active")
      .eq("id", 30)
      .maybeSingle();

    if (jayvantError) throw jayvantError;

    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, role, contact_number, is_active")
      .order("full_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        databaseCount: count,
        returnedCount: data?.length ?? 0,
        jayvantFound: !!jayvant,
        jayvant,
        employees: data ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Employee diagnostic error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
