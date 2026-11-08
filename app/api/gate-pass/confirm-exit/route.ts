import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, notes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid order ID is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      "confirm_order_exit_atomic",
      {
        p_order_id: id,
        p_notes: notes || "Vehicle exit confirmed by admin",
        p_performed_by: "Single Gate Pass",
      }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Single exit API error:", error);

    return NextResponse.json(
      { error: error?.message || "Vehicle exit failed." },
      { status: 500 }
    );
  }
}