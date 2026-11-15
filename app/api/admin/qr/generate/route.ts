
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getIndiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function jsonResponse(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      quantity?: number | string;
      product_id?: string;
      productId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: "Invalid JSON request body." },
        400
      );
    }

    const quantity = Number(body.quantity);

    const productId =
      typeof body.product_id === "string"
        ? body.product_id.trim()
        : typeof body.productId === "string"
          ? body.productId.trim()
          : "";

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return jsonResponse(
        { success: false, error: "Quantity must be between 1 and 500." },
        400
      );
    }

    if (!productId) {
      return jsonResponse(
        {
          success: false,
          error: "Product ID was not received. Please select a SKU.",
        },
        400
      );
    }

    const supabase = createAdminClient();

    // 1. Verify selected product.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, volume_ml, units_per_box, bottles_per_box")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError) {
      console.error("[QR GENERATE] Product lookup failed:", productError);
      return jsonResponse(
        { success: false, error: `Product lookup failed: ${productError.message}` },
        500
      );
    }

    if (!product) {
      return jsonResponse(
        {
          success: false,
          error: "Selected product was not found or is inactive in Products Master.",
        },
        400
      );
    }

    // 2. Find today's active batch using India date.
    const today = getIndiaDate();

    const { data: batches, error: batchError } = await supabase
      .from("qr_batches")
      .select("id, batch_date, batch_number, status")
      .eq("batch_date", today)
      .eq("status", "active")
      .order("batch_number", { ascending: false })
      .limit(1);

    if (batchError) {
      console.error("[QR GENERATE] Batch lookup failed:", batchError);
      return jsonResponse(
        { success: false, error: `Batch lookup failed: ${batchError.message}` },
        500
      );
    }

    const batch = batches?.[0];

    if (!batch) {
      console.error("[QR GENERATE] No active batch found:", { today });

      return jsonResponse(
        {
          success: false,
          error: `No active QR batch found for ${today}. Generate today's PIN first.`,
        },
        400
      );
    }

    // 3. Generate secure, unique QR tokens.
    const tokens = Array.from(
      { length: quantity },
      () => randomBytes(32).toString("hex")
    );

    console.log("[QR GENERATE] Calling RPC:", {
      today,
      batchId: batch.id,
      quantity,
      productId,
    });

    // 4. Generate labels through existing database RPC.
    const { data: generated, error: insertError } = await supabase.rpc(
      "generate_qr_labels",
      {
        p_batch_id: batch.id,
        p_tokens: tokens,
      }
    );

    if (insertError) {
      console.error("[QR GENERATE] RPC failed:", insertError);

      return jsonResponse(
        {
          success: false,
          error: `QR label generation failed: ${insertError.message}`,
          code: insertError.code ?? null,
        },
        500
      );
    }

    const generatedLabels = (generated || []) as Array<{
      id: string;
      qr_token: string;
    }>;

    const labelIds = generatedLabels
      .map((label) => label.id)
      .filter((id): id is string => Boolean(id));

    if (labelIds.length !== quantity) {
      console.error("[QR GENERATE] Unexpected RPC result:", {
        expected: quantity,
        received: labelIds.length,
      });

      return jsonResponse(
        {
          success: false,
          error: `Expected ${quantity} QR labels, but database generated ${labelIds.length}.`,
        },
        500
      );
    }

    // 5. Save product details against generated labels.
    const { data: savedLabels, error: metadataError } = await supabase
      .from("qr_labels")
      .update({
        product_id: product.id,
        sku_detail: product.name,
      })
      .in("id", labelIds)
      .select("id, qr_token, created_at, product_id, sku_detail");

    if (metadataError) {
      console.error("[QR GENERATE] SKU metadata update failed:", metadataError);

      return jsonResponse(
        {
          success: false,
          error: `Labels were generated, but SKU details could not be saved: ${metadataError.message}`,
        },
        500
      );
    }

    if (!savedLabels || savedLabels.length !== quantity) {
      console.error("[QR GENERATE] Metadata verification failed:", {
        expected: quantity,
        received: savedLabels?.length ?? 0,
      });

      return jsonResponse(
        {
          success: false,
          error: "QR labels were generated, but SKU details could not be verified for every label.",
        },
        500
      );
    }

    console.log("[QR GENERATE] Success:", {
      batchId: batch.id,
      quantity: savedLabels.length,
      productId: product.id,
    });

    return jsonResponse({
      success: true,
      message: `${savedLabels.length} QR labels generated successfully.`,
      product: {
        id: product.id,
        name: product.name,
        volume_ml: product.volume_ml,
      },
      labels: savedLabels,
    });
  } catch (error) {
    console.error("[QR GENERATE] Unexpected error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate QR labels.",
      },
      500
    );
  }
}
