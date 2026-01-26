// lib/profitEngine.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProfitInput = {
  productId: string;
  channel: "end_consumer" | "distributor" | "bulk" | "custom";
  pincode: string;
  qtyBoxes: number;
  requestedDeliveryType: "delivery" | "pickup";
};

export async function calculateOrderPAndL(input: ProfitInput) {
  const s = await createServerSupabaseClient();

  // ---------------------------
  // 1. Product
  // ---------------------------
  const { data: product, error: prodErr } = await s
    .from("products")
    .select("*")
    .eq("id", input.productId)
    .maybeSingle();

  if (prodErr || !product) {
    console.error("P&L: product not found", prodErr);
    throw new Error("Product not found");
  }

  const unitsPerBox = Number(product.units_per_box);
  const volumeMl = Number(product.volume_ml);

  // ---------------------------
  // 2. Production cost per bottle
  // ---------------------------
  const { data: components } = await s
    .from("product_cost_components")
    .select("*")
    .eq("product_id", input.productId)
    .eq("is_active", true);

  const productionCostPerBottle =
    components?.reduce(
      (sum: number, c: any) => sum + Number(c.cost_per_unit),
      0
    ) ?? 0;

  const costPerBox = productionCostPerBottle * unitsPerBox;
  const estProductCost = costPerBox * input.qtyBoxes;

  // ---------------------------
  // 3. Business rules (min margins, MOQ, radius)
  // ---------------------------
  const volumeKey = `${volumeMl}ml`;
  const ruleKeys = [
    `min_margin_per_bottle_${volumeKey}_${input.channel}`,
    `min_margin_per_box_${volumeKey}_${input.channel}`,
    `min_boxes_for_delivery_${input.channel}`,
    `max_delivery_radius_km_${input.channel}`,
  ];

  const { data: rules } = await s
    .from("business_rules")
    .select("key, value_number")
    .in("key", ruleKeys);

  const ruleMap: Record<string, number> = {};
  (rules || []).forEach((r: any) => {
    ruleMap[r.key] = Number(r.value_number ?? 0);
  });

  const minMarginPerBottle =
    ruleMap[`min_margin_per_bottle_${volumeKey}_${input.channel}`] ?? 0;
  const minMarginPerBox =
    ruleMap[`min_margin_per_box_${volumeKey}_${input.channel}`] ?? 0;
  const minBoxesForDelivery =
    ruleMap[`min_boxes_for_delivery_${input.channel}`] ?? 0;
  const maxRadiusRuleKm =
    ruleMap[`max_delivery_radius_km_${input.channel}`] ?? 0;

  // ---------------------------
  // 4. Delivery decision (distributor + pincode_geo + slabs)
  // ---------------------------
  let effectiveDeliveryType: "delivery" | "pickup" =
    input.requestedDeliveryType;
  let distanceKm: number | null = null;
  let deliveryFee = 0;
  let estDeliveryCost = 0;
  let deliveryReason = "";
  const warnings: string[] = [];

  // only end_consumer uses this engine right now
  if (input.channel === "end_consumer") {
    if (input.requestedDeliveryType === "delivery") {
      // 4.1 find distributor mapping
      const { data: mappings } = await s
        .from("pincode_mapping")
        .select("distance_km, distributors(*)")
        .eq("pincode", input.pincode);

      if (!mappings || mappings.length === 0) {
        effectiveDeliveryType = "pickup";
        deliveryReason =
          "This pincode is not serviceable by any distributor. Plant pickup only.";
      } else {
        // choose nearest distributor
        mappings.sort((a, b) => Number(a.distance_km) - Number(b.distance_km));
        const nearest = mappings[0];
        const distributor = nearest.distributors;

        // 4.2 get pincode geo
        const { data: geo } = await s
          .from("pincode_geo")
          .select("*")
          .eq("pincode", input.pincode)
          .maybeSingle();

        // 4.3 compute distance (haversine) if coords exist, else fallback to stored distance_km
        if (
          geo &&
          distributor?.latitude != null &&
          distributor?.longitude != null
        ) {
          const dist = haversineKm(
            Number(distributor.latitude),
            Number(distributor.longitude),
            Number(geo.latitude),
            Number(geo.longitude)
          );
          distanceKm = dist;
        } else {
          distanceKm = nearest.distance_km
            ? Number(nearest.distance_km)
            : null;
        }

        // 4.4 radius checks
        const distributorRadiusKm = Number(distributor?.service_radius_km ?? 0);
        const maxAllowedRadiusKm =
          maxRadiusRuleKm > 0
            ? Math.min(distributorRadiusKm || 9999, maxRadiusRuleKm)
            : distributorRadiusKm || maxRadiusRuleKm;

        if (
          distanceKm == null ||
          (maxAllowedRadiusKm > 0 && distanceKm > maxAllowedRadiusKm)
        ) {
          effectiveDeliveryType = "pickup";
          deliveryReason =
            "Delivery not available for this distance. Plant pickup only.";
        }
      }
    }

    // 4.5 MOQ check
    if (
      effectiveDeliveryType === "delivery" &&
      minBoxesForDelivery > 0 &&
      input.qtyBoxes < minBoxesForDelivery
    ) {
      effectiveDeliveryType = "pickup";
      deliveryReason = `Delivery requires minimum ${minBoxesForDelivery} boxes. Plant pickup only.`;
    }

    // 4.6 delivery fee slabs (only if still delivery)
    if (effectiveDeliveryType === "delivery") {
      const { data: slabs } = await s
        .from("delivery_fee_slabs")
        .select("*")
        .eq("channel", "end_consumer")
        .eq("is_active", true);

      if (!slabs || slabs.length === 0) {
        effectiveDeliveryType = "pickup";
        deliveryReason =
          "No delivery fee slabs defined. Delivery disabled. Plant pickup only.";
      } else {
        let matched: any = null;
        for (const slab of slabs) {
          if (
            distanceKm != null &&
            distanceKm >= Number(slab.min_distance_km) &&
            distanceKm <= Number(slab.max_distance_km)
          ) {
            matched = slab;
          }
        }
        if (!matched) {
          effectiveDeliveryType = "pickup";
          deliveryReason =
            "No delivery fee slab found for this distance. Plant pickup only.";
        } else {
          deliveryFee = Number(matched.fee);
          estDeliveryCost = Number(matched.estimated_cost || 0);
        }
      }
    }
  }

  // ---------------------------
  // 5. Price configuration
  // ---------------------------
  let channelKey: string;
  if (input.channel === "end_consumer") {
    channelKey =
      effectiveDeliveryType === "delivery"
        ? "end_consumer_delivery"
        : "plant_pickup";
  } else {
    channelKey = input.channel;
  }

  const { data: priceRow, error: priceErr } = await s
    .from("price_config")
    .select("*")
    .eq("product_id", input.productId)
    .eq("channel", channelKey)
    .eq("is_active", true)
    .maybeSingle();

  if (priceErr || !priceRow) {
    console.error("P&L: price config missing", priceErr);
    throw new Error("Price config not found for this channel/product");
  }

  const pricePerBox = Number(priceRow.price_per_box);

  // ---------------------------
  // 6. Revenue & margins
  // ---------------------------
  const revenueProducts = pricePerBox * input.qtyBoxes;
  const revenueDelivery = deliveryFee;
  const grossRevenue = revenueProducts + revenueDelivery;

  const totalCost = estProductCost + estDeliveryCost;
  const marginAmount = grossRevenue - totalCost;
  const marginPerBox = marginAmount / input.qtyBoxes;
  const marginPerBottle = marginPerBox / unitsPerBox;

  const isLoss = marginAmount < 0;
  const isBelowMinBottle =
    minMarginPerBottle > 0 && marginPerBottle < minMarginPerBottle;
  const isBelowMinBox =
    minMarginPerBox > 0 && marginPerBox < minMarginPerBox;
  const isBelowMinMargin = isBelowMinBottle || isBelowMinBox;
  const ok = !isLoss && !isBelowMinMargin;

  if (isLoss) {
    warnings.push(
      `Order is LOSS-MAKING: margin ₹${marginAmount.toFixed(2)} total.`
    );
  }
  if (isBelowMinBottle) {
    warnings.push(
      `Margin per bottle ₹${marginPerBottle.toFixed(
        2
      )} is below rule ₹${minMarginPerBottle.toFixed(2)}.`
    );
  }
  if (isBelowMinBox) {
    warnings.push(
      `Margin per box ₹${marginPerBox.toFixed(
        2
      )} is below rule ₹${minMarginPerBox.toFixed(2)}.`
    );
  }

  return {
    ok,
    isLoss,
    isBelowMinMargin,
    warnings,

    productName: product.name as string,
    volumeMl,
    unitsPerBox,
    qtyBoxes: input.qtyBoxes,

    distanceKm,
    effectiveDeliveryType,
    deliveryFee,
    deliveryReason,

    productionCostPerBottle,
    costPerBox,
    estProductCost,

    pricePerBox,
    revenueProducts,
    revenueDelivery,
    grossRevenue,

    estDeliveryCost,
    totalCost,
    marginAmount,
    marginPerBox,
    marginPerBottle,
    minMarginPerBox,
    minMarginPerBottle,
  };
}

// simple haversine in KM
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
