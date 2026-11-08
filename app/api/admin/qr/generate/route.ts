
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIndiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    let body: {
      quantity?: number;
      product_id?: string;
      productId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const quantity = Number(body.quantity);

    // Accept the product ID sent by the updated frontend.
    const productId =
      typeof body.product_id === "string"
        ? body.product_id.trim()
        : typeof body.productId === "string"
          ? body.productId.trim()
          : "";

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return NextResponse.json(
        { success: false, error: "Quantity must be between 1 and 500." },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID was not received. Please select a SKU.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch the actual product from the products master.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, volume_ml, units_per_box, bottles_per_box")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError) {
      console.error("QR product lookup error:", productError);
      throw productError;
    }

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected product was not found or is inactive in Products Master.",
        },
        { status: 400 }
      );
    }

    // Find today's active PIN batch.
    const today = getIndiaDate();

    const { data: batch, error: batchError } = await supabase
      .from("qr_batches")
      .select("id")
      .eq("batch_date", today)
      .eq("status", "active")
      .order("batch_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batchError) throw batchError;

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Generate today's PIN before generating QR labels.",
        },
        { status: 400 }
      );
    }

    // Generate secure, unique QR tokens.
    const tokens = Array.from(
      { length: quantity },
      () => randomBytes(32).toString("hex")
    );

    // Preserve the existing database RPC and registration flow.
    const { data: generated, error: insertError } = await supabase.rpc(
      "generate_qr_labels",
      {
        p_batch_id: batch.id,
        p_tokens: tokens,
      }
    );

    if (insertError) throw insertError;

    const generatedLabels = (generated || []) as Array<{
      id: string;
      qr_token: string;
    }>;

    const labelIds = generatedLabels
      .map((label) => label.id)
      .filter(Boolean);

    if (labelIds.length !== quantity) {
      throw new Error(
        `Expected ${quantity} QR labels, but database generated ${labelIds.length}.`
      );
    }

    // Save actual product ID and product-name snapshot on every label.
    const { data: savedLabels, error: metadataError } = await supabase
      .from("qr_labels")
      .update({
        product_id: product.id,
        sku_detail: product.name,
      })
      .in("id", labelIds)
      .select("id, qr_token, created_at, product_id, sku_detail");

    if (metadataError) {
      console.error("QR SKU metadata save error:", metadataError);
      throw metadataError;
    }

    if (!savedLabels || savedLabels.length !== quantity) {
      throw new Error(
        "QR labels were generated, but SKU details could not be saved for every label."
      );
    }

    return NextResponse.json({
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
    console.error("QR generation error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate QR labels.",
      },
      { status: 500 }
    );
  }
}
