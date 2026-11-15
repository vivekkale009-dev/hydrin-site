
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;

export async function GET() {
  try {
    const supabase = createAdminClient();

    const employees: {
      id: number;
      full_name: string;
      role: string | null;
      contact_number: string | null;
      is_active: boolean | null;
    }[] = [];

    let offset = 0;
    let totalCount = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("employees")
        .select(
          "id, full_name, role, contact_number, is_active",
          { count: "exact" }
        )
        .order("full_name", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (count !== null) {
        totalCount = count;
      }

      const page = data ?? [];

      if (page.length === 0) break;

      employees.push(...page);
      offset += page.length;

      if (employees.length >= totalCount) break;
    }

    return NextResponse.json(
      {
        success: true,
        databaseCount: totalCount,
        returnedCount: employees.length,
        employees,
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
        error:
          error instanceof Error
            ? error.message
            : "Unable to load employee records.",
      },
      { status: 500 }
    );
  }
}
