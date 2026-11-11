
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type RouteContext = {
  params: { id: string };
};

function jsonError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET: distributor profile, order history, active products and saved SKU rates.
export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  try {
    const supabase = await createAdminClient();
    const id = params.id;

    if (!id) return jsonError("Missing distributor ID.", 400);

    const [
      profileResult,
      ordersResult,
      productsResult,
      pricesResult,
    ] = await Promise.all([
      supabase
        .from("distributors")
        .select("*")
        .eq("id", id)
        .maybeSingle(),

      supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total_payable_amount,
          amount_paid,
          pending_amount,
          status,
          uorn,
          order_items (
            product_name,
            qty_boxes
          )
        `)
        .eq("distributor_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("products")
        .select("id, name, volume_ml, units_per_box, bottles_per_box, is_active")
        .eq("is_active", true)
        .order("volume_ml", { ascending: false })
        .order("name", { ascending: true }),

      supabase
        .from("distributor_prices")
        .select("id, distributor_id, product_id, price_per_box")
        .eq("distributor_id", id),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (productsResult.error) throw productsResult.error;

    // A missing rate table is a setup error; surface it rather than silently
    // pretending that all distributor rates are blank.
    if (pricesResult.error) throw pricesResult.error;

    const profile = profileResult.data;
    if (!profile) {
      return jsonError("Distributor not found in DB.", 404);
    }

    const orders = ordersResult.data || [];
    const currentDue = orders.reduce(
      (sum, order: any) => sum + (Number(order.pending_amount) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        profile,
        orders,
        current_due: currentDue,
        products: productsResult.data || [],
        distributor_prices: pricesResult.data || [],
      },
    });
  } catch (err: any) {
    console.error("Distributor details GET error:", err);
    return jsonError(err?.message || "Unable to load distributor details.");
  }
}

// PATCH: save or clear optional rates for this distributor.
// Send every active product in `prices`; null/blank clears that product's special rate.
export async function PATCH(
  req: Request,
  { params }: RouteContext
) {
  try {
    const supabase = await createAdminClient();
    const distributorId = params.id;

    if (!distributorId) {
      return jsonError("Missing distributor ID.", 400);
    }

    let body: { prices?: Array<{ product_id?: string; price_per_box?: number | string | null }> };
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON request body.", 400);
    }

    if (!Array.isArray(body.prices)) {
      return jsonError("Prices must be provided as an array.", 400);
    }

    // Confirm the distributor exists.
    const { data: distributor, error: distributorError } = await supabase
      .from("distributors")
      .select("id")
      .eq("id", distributorId)
      .maybeSingle();

    if (distributorError) throw distributorError;
    if (!distributor) return jsonError("Distributor not found.", 404);

    const normalized: Array<{ product_id: string; price_per_box: number | null }> = [];

    for (const row of body.prices) {
      const productId = String(row.product_id || "").trim();
      const raw = row.price_per_box;

      if (!productId) {
        return jsonError("Every rate row must include a product ID.", 400);
      }

      if (raw === null || raw === undefined || String(raw).trim() === "") {
        normalized.push({ product_id: productId, price_per_box: null });
        continue;
      }

      const price = Number(raw);
      if (!Number.isFinite(price) || price <= 0) {
        return jsonError("Each entered rate must be a number greater than zero.", 400);
      }

      normalized.push({ product_id: productId, price_per_box: price });
    }

    const uniqueProductIds = new Set(normalized.map((row) => row.product_id));
    if (uniqueProductIds.size !== normalized.length) {
      return jsonError("Duplicate product IDs were submitted.", 400);
    }

    if (normalized.length > 0) {
      const { data: activeProducts, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("is_active", true)
        .in("id", [...uniqueProductIds]);

      if (productError) throw productError;

      const activeIds = new Set((activeProducts || []).map((p: any) => p.id));
      const invalidId = normalized.find((row) => !activeIds.has(row.product_id));

      if (invalidId) {
        return jsonError("One or more selected products are missing or inactive.", 400);
      }
    }

    // Upsert non-empty rates. Blank values delete only that distributor/SKU rate.
    const toUpsert = normalized
      .filter((row) => row.price_per_box !== null)
      .map((row) => ({
        distributor_id: distributorId,
        product_id: row.product_id,
        price_per_box: row.price_per_box,
        updated_at: new Date().toISOString(),
      }));

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("distributor_prices")
        .upsert(toUpsert, { onConflict: "distributor_id,product_id" });

      if (upsertError) throw upsertError;
    }

    const toClear = normalized.filter((row) => row.price_per_box === null);
    for (const row of toClear) {
      const { error: deleteError } = await supabase
        .from("distributor_prices")
        .delete()
        .eq("distributor_id", distributorId)
        .eq("product_id", row.product_id);

      if (deleteError) throw deleteError;
    }

    const { data: savedPrices, error: savedError } = await supabase
      .from("distributor_prices")
      .select("id, distributor_id, product_id, price_per_box")
      .eq("distributor_id", distributorId);

    if (savedError) throw savedError;

    return NextResponse.json({
      success: true,
      message: "Distributor SKU-wise rates saved.",
      distributor_prices: savedPrices || [],
    });
  } catch (err: any) {
    console.error("Distributor details PATCH error:", err);
    return jsonError(err?.message || "Unable to save distributor rates.", 500);
  }
}


