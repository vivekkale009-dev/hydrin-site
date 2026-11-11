// File location:
// app/api/admin/distributors/[id]/prices/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  try {
    // In Next.js 15, dynamic route params must be awaited.
    const { id: distributorId } = await params;

    if (!distributorId) {
      return NextResponse.json(
        { success: false, error: "Missing distributor ID." },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("distributor_prices")
      .select("product_id, price_per_box")
      .eq("distributor_id", distributorId);

    if (error) {
      console.error("Distributor prices query error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("Distributor prices GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to load distributor prices.",
      },
      { status: 500 }
    );
  }
}
