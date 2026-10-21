
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const distributorId = params.id;
    const body = await req.json();

    const amount = Number(body.amount);
    const paymentMethod = String(body.paymentMethod || "").toLowerCase();
    const transactionRef = String(body.transactionRef || "").trim();

    if (!distributorId) {
      return NextResponse.json(
        { error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      return NextResponse.json(
        { error: "Enter a valid amount greater than zero, with at most two decimal places" },
        { status: 400 }
      );
    }

    if (!["cash", "upi", "bank"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Select a valid payment method" },
        { status: 400 }
      );
    }

    if (paymentMethod !== "cash" && !transactionRef) {
      return NextResponse.json(
        { error: "Transaction reference is required for UPI or bank transfer" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "record_distributor_payment",
      {
        p_distributor_id: distributorId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_transaction_id: transactionRef || null,
      }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to record payment" },
      { status: 500 }
    );
  }
}
