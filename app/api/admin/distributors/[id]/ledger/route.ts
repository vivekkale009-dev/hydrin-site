
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAdminClient();
    const distributorId = params.id;

    if (!distributorId) {
      return NextResponse.json(
        { error: "Missing distributor ID" },
        { status: 400 }
      );
    }

    // Verify distributor and get their name.
    const { data: profile, error: profileError } = await supabase
      .from("distributors")
      .select("id, name")
      .eq("id", distributorId)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return NextResponse.json(
        { error: "Distributor not found" },
        { status: 404 }
      );
    }

    // Get this distributor's orders.
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, uorn")
      .eq("distributor_id", distributorId);

    if (ordersError) throw ordersError;

    const orderIds = (orders || []).map((order) => order.id);

    if (orderIds.length === 0) {
      return NextResponse.json({
        data: {
          distributorName: profile.name,
          payments: [],
        },
      });
    }

    // Get payment transactions belonging to those orders.
    const { data: payments, error: paymentsError } = await supabase
      .from("order_payments")
      .select(
        "id, order_id, amount, created_at, payment_method, note, transaction_id"
      )
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    const orderMap = new Map(
      (orders || []).map((order) => [
        order.id,
        order.uorn || order.id.slice(0, 8),
      ])
    );

    const ledger = (payments || []).map((payment) => ({
      id: payment.id,
      order_id: payment.order_id,
      order_number:
        orderMap.get(payment.order_id) || payment.order_id.slice(0, 8),
      amount: Number(payment.amount) || 0,
      created_at: payment.created_at,
      payment_method: payment.payment_method || "Not specified",
      note: payment.note || "",
      transaction_id: payment.transaction_id || "",
    }));

    return NextResponse.json({
      data: {
        distributorName: profile.name,
        payments: ledger,
      },
    });
  } catch (err: any) {
    console.error("Distributor ledger API error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to load distributor ledger" },
      { status: 500 }
    );
  }
}
