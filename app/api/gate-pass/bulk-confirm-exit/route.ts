
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
      ids.some((id: unknown) => typeof id !== "string") ||
      new Set(ids).size !== ids.length ||
      ids.length > 100
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
    }[] = [];

    for (const id of ids as string[]) {
      try {
        // Load the current order from the database.
        const { data: order, error: orderReadError } =
          await supabase
            .from("orders")
            .select(
              "id, uorn, status, exit_confirmed_at, gate_pass_printed_at"
            )
            .eq("id", id)
            .single();

        if (orderReadError || !order) {
          results.push({
            id,
            success: false,
            message: "Order not found.",
          });
          continue;
        }

        if (order.exit_confirmed_at) {
          results.push({
            id,
            success: false,
            message: "Vehicle already exited.",
          });
          continue;
        }

        if (
          order.status === "delivered" ||
          order.status === "cancelled"
        ) {
          results.push({
            id,
            success: false,
            message: `Order is ${order.status}.`,
          });
          continue;
        }

   


        // Load actual order items; never trust browser-supplied quantities.
        const { data: items, error: itemsError } =
          await supabase
            .from("order_items")
            .select("product_id, qty_boxes")
            .eq("order_id", id);

        if (itemsError || !items || items.length === 0) {
          results.push({
            id,
            success: false,
            message: "Could not load order items.",
          });
          continue;
        }

        const validItems = items.every(
          (item: any) =>
            item.product_id &&
            Number.isFinite(Number(item.qty_boxes)) &&
            Number(item.qty_boxes) > 0
        );

        if (!validItems) {
          results.push({
            id,
            success: false,
            message: "Order contains invalid item quantities.",
          });
          continue;
        }

        // Claim this order so concurrent requests cannot both proceed.
        // The update succeeds only while exit_confirmed_at is NULL.
        const exitTime = new Date().toISOString();
        const notes = "Bulk vehicle exit confirmed by admin";

        const { data: claimedOrder, error: claimError } =
          await supabase
            .from("orders")
            .update({
              exit_confirmed_at: exitTime,
              exit_notes: notes,
              status: "delivered",
            })
            .eq("id", id)
            .is("exit_confirmed_at", null)
            .not("status", "in", '("delivered","cancelled")')
            .select("id")
            .maybeSingle();

        if (claimError) throw claimError;

        if (!claimedOrder) {
          results.push({
            id,
            success: false,
            message: "Order already processed or no longer eligible.",
          });
          continue;
        }

        // Record deductions and clear reservations.
        for (const item of items) {
          const qty = Number(item.qty_boxes);

          const { error: movementError } = await supabase
            .from("inventory_movements")
            .insert({
              product_id: item.product_id,
              order_id: id,
              order_number: order.uorn,
              movement_type: "deduct",
              qty_boxes: qty,
              notes: `Vehicle Exit Confirmed: ${notes}`,
            });

          if (movementError) throw movementError;

          const { error: rpcError } = await supabase.rpc(
            "clear_reservation",
            {
              p_product_id: item.product_id,
              p_qty: qty,
            }
          );

          if (rpcError) throw rpcError;
        }

        results.push({
          id,
          success: true,
          message: "Vehicle exit recorded.",
        });
      } catch (error: any) {
        console.error("Bulk exit failed for order", id, error);

        results.push({
          id,
          success: false,
          message:
            error?.message ||
            "Processing failed. Check inventory before retrying.",
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
