import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids = body.ids;

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 100 ||
      ids.some((id: unknown) => typeof id !== "string") ||
      new Set(ids).size !== ids.length
    ) {
      return NextResponse.json(
        { error: "Provide a valid list of up to 100 unique order IDs." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const results: {
      id: string;
      success: boolean;
      message: string;
      data?: any;
    }[] = [];

    for (const id of ids as string[]) {
      try {
        const { data, error } = await supabase.rpc(
          "confirm_order_exit_atomic",
          {
            p_order_id: id,
            p_notes: "Bulk vehicle exit confirmed by admin",
            p_performed_by: "Bulk Gate Pass",
          }
        );

        if (error) {
          throw error;
        }

        results.push({
          id,
          success: true,
          message: data?.message || "Vehicle exit processed.",
          data,
        });
      } catch (error: any) {
        console.error("Bulk exit failed for order:", id, error);

        results.push({
          id,
          success: false,
          message: error?.message || "Order processing failed.",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;

    return NextResponse.json({
      success: failed === 0,
      succeeded,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("Bulk exit API error:", error);

    return NextResponse.json(
      { error: error?.message || "Bulk exit request failed." },
      { status: 500 }
    );
  }
}