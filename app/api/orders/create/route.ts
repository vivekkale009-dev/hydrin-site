import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { items, subtotal, deliveryFee, total, customer, delivery, payment } =
      body || {};

    if (!customer?.name || !customer?.phone || !customer?.address) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required customer fields."
        }),
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Order items are empty."
        }),
        { status: 400 }
      );
    }

    const mode = payment?.mode;
    if (!mode || (mode !== "COD_50" && mode !== "UPI_FULL")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid payment mode."
        }),
        { status: 400 }
      );
    }

    if (!payment?.upiTxnId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UPI transaction ID is required."
        }),
        { status: 400 }
      );
    }

    const orderId = "OHY" + Date.now().toString().slice(-8);

    const { error } = await supabase.from("orders").insert({
      order_id: orderId,
      items,
      subtotal_amount: subtotal,
      delivery_fee: deliveryFee ?? 0,
      total_amount: total,
      advance_amount: payment.codAdvanceAmount ?? null,
      payment_mode: mode,
      upi_txn_id: payment.upiTxnId,
      advance_paid: false, // you set this true after manual verification
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      landmark: customer.landmark,
      pincode: customer.pincode,
      delivery_date: delivery?.date,
      delivery_slot: delivery?.slot,
      status: "pending",
      tracking_info: null
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not save order."
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Order API error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server error processing order."
      }),
      { status: 500 }
    );
  }
}
