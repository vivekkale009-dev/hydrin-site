import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function todayYYMMDD() {
  const d = new Date();
  return d.toISOString().slice(2, 10).replace(/-/g, "");
}

async function generateSequence(prefix: string) {
  const today = todayYYMMDD();
  const sequenceKey = `${prefix}-${today}`;
  const { data: next, error } = await supabase.rpc('get_next_sequence', { 
    p_key: sequenceKey 
  });
  if (error) throw new Error(`Sequence Error: ${error.message}`);
  return `${prefix}-${today}-${String(next).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderType, deliveryType, distributorId, vanId, items,
      distanceKm, ratePerKm, paidAmount, paymentMethod,
      transactionId, gstEnabled, hsnCode, taxRate,
      billing, shipping, allowCreditOverride, customerPhone
    } = body;

    // 1. Financial Calculations

    let itemsSubtotal = 0;
    items.forEach((i: any) => {
      itemsSubtotal += Number(i.qty_boxes) * Number(i.price_per_box);
    });

    const deliveryFee = Number(distanceKm || 0) * Number(ratePerKm || 0);
    
    // Tax is calculated ONLY on product subtotal
    const taxableAmount = itemsSubtotal;
    const taxValue = gstEnabled ? (taxableAmount * Number(taxRate || 0)) / 100 : 0;
    
    // Grand Total = (Products + Tax) + Delivery (untaxed)
    const finalGrandTotal = taxableAmount + taxValue + deliveryFee;
    
    const amountPaid = Number(paidAmount || 0);

    const uorn = await generateSequence("ESU");
    const orderNo = await generateSequence("ESO");

    // 2. Insert Order Header
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_type: orderType,
        delivery_type: deliveryType,
        distributor_id: distributorId,
        phone: customerPhone,
        van_id: vanId || null,
        uorn: uorn,
        order_number: orderNo,
        status: amountPaid >= finalGrandTotal ? "payment_verified" : "pending_verification",
        gross_revenue: itemsSubtotal,
        delivery_fee: deliveryFee,
        total_payable_amount: finalGrandTotal,
        amount_paid: amountPaid,
        pending_amount: finalGrandTotal - amountPaid,
        created_by_admin: true,
        price_overridden: false,
        credit_override_applied: allowCreditOverride || false,
        is_loss: false,
        is_below_min_margin: false,
        override_applied: false,
        payment_method: paymentMethod || null,
        transaction_id: transactionId || null,
        is_gst: gstEnabled || false,
        tax_rate: taxRate || 0,
        hsn_code: hsnCode || null,
        buyer_gstin: billing.gstin || null,
        billing_name: billing.name,
        billing_address: billing.address,
        billing_state: billing.state,
        shipping_name: shipping.name,
        shipping_address: shipping.address,
        shipping_state: shipping.state,
        shipping_gstin: shipping.gstin || null
      })
      .select().single();

    if (orderErr) throw orderErr;

    // 3. Insert Order Items
    const itemInserts = items.map((i: any) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.name,
      qty_boxes: i.qty_boxes,
      price_per_box: i.price_per_box
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemInserts);
    if (itemsErr) throw itemsErr;

    // 4. --- INVENTORY RESERVATION LOGIC ---
    // We loop through the items from the request to update stock levels
    for (const item of items) {
      if (!item.product_id) continue;

      // Create Movement Log (Trail)
      await supabase.from("inventory_movements").insert({
        product_id: item.product_id,
        order_id: order.id,
        order_number: uorn,
        movement_type: 'reserve', // Removing from 'Available'
        qty_boxes: Number(item.qty_boxes),
        notes: `Reserved for Order ${uorn}`
      });

      // Call the Database Function to move Available -> Reserved
      const { error: rpcError } = await supabase.rpc('reserve_inventory', { 
        p_product_id: item.product_id, 
        p_qty: Number(item.qty_boxes) 
      });

      if (rpcError) console.error("Inventory RPC Error:", rpcError.message);
    }

    return NextResponse.json({ success: true, uorn, order_number: orderNo, orderId: order.id });

  } catch (e: any) {
    console.error("Order Creation Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}