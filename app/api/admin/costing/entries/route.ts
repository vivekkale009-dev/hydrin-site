import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const RATE_KEYS = [
  "preform", "caps", "wrapper", "labels", "labour",
  "electricity", "maintenance", "glue_chemicals",
  "other_charges", "minerals",
  "preform_1_rate_per_kg", "preform_2_rate_per_kg",
  "preform_1_weight_g", "preform_1_bag_weight_kg", "preform_1_wastage_kg_per_bag",
  "preform_2_weight_g", "preform_2_bag_weight_kg", "preform_2_wastage_kg_per_bag",
  "wrapper_roll_weight_kg", "wrapper_boxes_per_roll", "meter_factor",
] as const;

const n = (value: any, fallback = 0): number => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ success: false, error: message }, { status });

async function loadRates(supabase: any) {
  const { data, error } = await supabase
    .from("costing_rate_master")
    .select("*")
    .eq("is_active", true);

  if (error) throw error;

  const rates: Record<string, AnyRecord> = {};
  for (const row of data || []) rates[row.component_key] = row;

  return rates;
}

function calculateEntry(
  input: AnyRecord,
  rates: Record<string, AnyRecord>,
  product: AnyRecord,
  skuPreforms: AnyRecord[] = []
) {
  const rate = (key: string, field = "rate_value") =>
    n(rates[key]?.[field]);

  const productionBoxes = Math.max(0, n(input.produced_boxes));
  const rejectedBoxes = Math.max(0, n(input.rejected_boxes));
  const goodBoxes = Math.max(0, productionBoxes - rejectedBoxes);

  const bottlesPerBox = Math.max(
    1,
    n(input.bottles_per_box, n(product.bottles_per_box, 12))
  );

  const rejectedBottles = Math.max(0, n(input.rejected_bottles));
  const rejectedCaps = Math.max(0, n(input.rejected_caps));
  const rejectedWrapperBoxes = Math.max(0, n(input.rejected_wrapper_boxes));

  // SKU-specific preform specifications and rates.
  const skuHasConfiguration = skuPreforms.length > 0;

  const skuSlot1 = skuPreforms.find(
    (x) => Number(x.preform_slot) === 1 && x.is_active
  );

  const skuSlot2 = skuPreforms.find(
    (x) => Number(x.preform_slot) === 2 && x.is_active
  );

  const preform1BagsConsumed = Math.max(
    0,
    n(input.preform_1_bags_used) - n(input.preform_1_bags_remaining)
  );

  const preform2BagsConsumed = Math.max(
    0,
    n(input.preform_2_bags_used) - n(input.preform_2_bags_remaining)
  );

  if (skuHasConfiguration && preform1BagsConsumed > 0 && !skuSlot1) {
    throw new Error(
      `Preform 1 is not active/configured for ${product.name || "this SKU"}. Configure it in Rate Master before saving.`
    );
  }

  if (skuHasConfiguration && preform2BagsConsumed > 0 && !skuSlot2) {
    throw new Error(
      `Preform 2 is not active/configured for ${product.name || "this SKU"}. Configure it in Rate Master before saving.`
    );
  }

  // If the SKU has no SKU-specific configuration at all, legacy generic
  // settings remain available as a fallback for older records.
  const preform1BagKg = Math.max(
    0,
    n(skuSlot1?.bag_weight_kg, skuHasConfiguration ? 0 : rate("preform_1_bag_weight_kg"))
  );

  const preform2BagKg = Math.max(
    0,
    n(skuSlot2?.bag_weight_kg, skuHasConfiguration ? 0 : rate("preform_2_bag_weight_kg"))
  );

  const preform1WastageKg = Math.max(
    0,
    n(skuSlot1?.wastage_kg_per_bag, skuHasConfiguration ? 0 : rate("preform_1_wastage_kg_per_bag"))
  );

  const preform2WastageKg = Math.max(
    0,
    n(skuSlot2?.wastage_kg_per_bag, skuHasConfiguration ? 0 : rate("preform_2_wastage_kg_per_bag"))
  );

  const preform1Kg =
    preform1BagsConsumed * Math.max(0, preform1BagKg - preform1WastageKg);

  const preform2Kg =
    preform2BagsConsumed * Math.max(0, preform2BagKg - preform2WastageKg);

  const preformKg = preform1Kg + preform2Kg;

  if (preform1BagsConsumed > 0 && preform1BagKg <= 0) {
    throw new Error("Set Preform 1 bag weight in Rate Master before saving this entry.");
  }

  if (preform2BagsConsumed > 0 && preform2BagKg <= 0) {
    throw new Error("Set Preform 2 bag weight in Rate Master before saving this entry.");
  }

  const capsPieces = n(
    input.caps_consumed_pieces,
    goodBoxes * bottlesPerBox + rejectedBottles + rejectedCaps
  );

  // Wrapper configuration is currently global in costing_rate_master.
  const wrapperRollWeightKg = Math.max(0, rate("wrapper_roll_weight_kg"));
  const wrapperBoxesPerRoll = Math.max(0, rate("wrapper_boxes_per_roll"));
  const wrapperRollsUsed = Math.max(0, n(input.wrapper_rolls_used));

  const wrapperKg =
    wrapperRollsUsed > 0
      ? wrapperRollsUsed * wrapperRollWeightKg
      : wrapperBoxesPerRoll > 0
        ? ((goodBoxes + rejectedWrapperBoxes) / wrapperBoxesPerRoll) *
          wrapperRollWeightKg
        : 0;

  if (wrapperRollsUsed > 0 && wrapperRollWeightKg <= 0) {
    throw new Error(
      "Set wrapper roll weight in Rate Master before saving this entry."
    );
  }

  const labelsBoxes = n(input.labels_consumed_boxes, goodBoxes);

  // Master rates are authoritative. Daily-entry price overrides are ignored.
  const preform1Rate = n(
    skuSlot1?.rate_per_kg,
    skuHasConfiguration ? 0 : rate("preform_1_rate_per_kg") || rate("preform")
  );

  const preform2Rate = n(
    skuSlot2?.rate_per_kg,
    skuHasConfiguration ? 0 : rate("preform_2_rate_per_kg") || rate("preform")
  );

  const preformRate = preform1Rate;
  const capsRate = rate("caps");
  const wrapperRate = rate("wrapper");
  const labelsRate = rate("labels");
  const mineralsRate = rate("minerals");

  const preformCost = round(
    preform1Kg * preform1Rate + preform2Kg * preform2Rate
  );

  const capsCost = round(capsPieces * capsRate);
  const wrapperCost = round(wrapperKg * wrapperRate);
  const labelsCost = round(labelsBoxes * labelsRate);
  const mineralsCost = round(goodBoxes * mineralsRate);

  const labourDayTotal = n(input.labour_day_total, rate("labour"));
  const labourAllocationHours = n(input.daily_labour_allocation_hours);
  const productiveHours = Math.max(0, n(input.productive_hours));

  const labourCost = round(
    labourAllocationHours > 0
      ? labourDayTotal * (productiveHours / labourAllocationHours)
      : labourDayTotal
  );

  const openingKwh = n(input.opening_kwh);
  const closingKwh = n(input.closing_kwh);
  const nonProductionKwh = n(input.non_production_kwh);
  const meterFactor = rate("meter_factor");

  const meterDifference = Math.max(0, closingKwh - openingKwh);

  const electricityUnits =
    Math.max(0, meterDifference - nonProductionKwh) * meterFactor;

  const electricityRate = rate("electricity");
  const electricityCost = round(electricityUnits * electricityRate);

  const maintenanceCost = round(goodBoxes * rate("maintenance"));
  const glueChemicalsCost = round(goodBoxes * rate("glue_chemicals"));
  const otherChargesCost = round(goodBoxes * rate("other_charges"));

  const rawMaterialCost = round(
    preformCost +
      capsCost +
      wrapperCost +
      labelsCost +
      mineralsCost +
      glueChemicalsCost
  );

  const otherManufacturingCost = round(
    maintenanceCost + otherChargesCost
  );

  const manufacturingCost = round(
    rawMaterialCost +
      labourCost +
      electricityCost +
      otherManufacturingCost
  );

  const manufacturingCostPerBox =
    goodBoxes > 0 ? round(manufacturingCost / goodBoxes) : 0;

  const sellingPricePerBox = n(input.selling_price_per_box);
  const salesRevenue = round(goodBoxes * sellingPricePerBox);

  const salesExpenses = round(
    n(input.transport_sales_expense, n(input.sales_expenses))
  );

  const profit = round(
    salesRevenue - manufacturingCost - salesExpenses
  );

  const gstSnapshot: AnyRecord = {};

  for (const key of RATE_KEYS) {
    gstSnapshot[key] = {
      rate_value: rates[key]?.rate_value ?? null,
      unit: rates[key]?.unit ?? null,
      gst_rate: rates[key]?.gst_rate ?? null,
      effective_from: rates[key]?.effective_from ?? null,
    };
  }

  const rateSnapshot = {
    captured_at: new Date().toISOString(),
    rates: gstSnapshot,
    sku_preforms: skuPreforms,
    entered_overrides: {
      preform_rate: preformRate,
      preform_1_rate_per_kg: preform1Rate,
      preform_2_rate_per_kg: preform2Rate,
      caps_rate: capsRate,
      wrapper_rate: wrapperRate,
      label_rate_per_box: labelsRate,
      minerals_rate: mineralsRate,
      labour_day_total: labourDayTotal,
      electricity_rate: electricityRate,
    },
    gst_handling: "Basic rates used for costing; GST input credit not adjusted.",
  };

  const grammage1 = n(
    skuSlot1?.grammage_g,
    skuHasConfiguration ? 0 : rate("preform_1_weight_g")
  );

  const grammage2 = n(
    skuSlot2?.grammage_g,
    skuHasConfiguration ? 0 : rate("preform_2_weight_g")
  );

  const calculationDetails = {
    good_boxes: goodBoxes,
    rejected_boxes: rejectedBoxes,
    bottles_per_box: bottlesPerBox,

    preform_1_consumed_kg: round(preform1Kg),
    preform_2_consumed_kg: round(preform2Kg),

    preform_1_weight_g: grammage1,
    preform_2_weight_g: grammage2,

    preform_1_theoretical_pieces_per_bag:
      grammage1 > 0 ? Math.floor(preform1BagKg * 1000 / grammage1) : 0,

    preform_2_theoretical_pieces_per_bag:
      grammage2 > 0 ? Math.floor(preform2BagKg * 1000 / grammage2) : 0,

    sku_preform_configuration: skuPreforms,

    preform_1_rate_per_kg: preform1Rate,
    preform_2_rate_per_kg: preform2Rate,

    preform_1_wastage_kg_per_bag: preform1WastageKg,
    preform_2_wastage_kg_per_bag: preform2WastageKg,

    wrapper_roll_weight_kg: wrapperRollWeightKg,
    wrapper_boxes_per_roll: wrapperBoxesPerRoll,
    wrapper_rolls_used: wrapperRollsUsed,

    preform_consumed_kg: round(preformKg),
    caps_consumed_pieces: round(capsPieces),
    wrapper_consumed_kg: round(wrapperKg),
    labels_consumed_boxes: round(labelsBoxes),

    meter_difference: round(meterDifference),
    electricity_units: round(electricityUnits),

    raw_material_cost: rawMaterialCost,
    labour_cost: labourCost,
    electricity_cost: electricityCost,
    other_manufacturing_cost: otherManufacturingCost,

    manufacturing_cost: manufacturingCost,
    manufacturing_cost_per_box: manufacturingCostPerBox,

    sales_revenue: salesRevenue,
    sales_expenses: salesExpenses,
    profit,
  };

  return {
    good_boxes: goodBoxes,
    bottles_per_box: bottlesPerBox,

    preform_consumed_kg: round(preformKg),
    caps_consumed_pieces: round(capsPieces),
    wrapper_consumed_kg: round(wrapperKg),
    labels_consumed_boxes: round(labelsBoxes),

    preform_rate: preformRate,
    caps_rate: capsRate,
    wrapper_rate: wrapperRate,
    labels_rate: labelsRate,
    minerals_rate: mineralsRate,

    preform_gst_rate: n(
      skuSlot1?.gst_rate,
      n(rates.preform_1_rate_per_kg?.gst_rate, n(rates.preform?.gst_rate))
    ),

    caps_gst_rate: n(rates.caps?.gst_rate),
    wrapper_gst_rate: n(rates.wrapper?.gst_rate),

    preform_rate_incl_gst:
      preformRate *
      (1 + n(skuSlot1?.gst_rate, n(rates.preform_1_rate_per_kg?.gst_rate, n(rates.preform?.gst_rate))) / 100),

    caps_rate_incl_gst:
      capsRate * (1 + n(rates.caps?.gst_rate) / 100),

    wrapper_rate_incl_gst:
      wrapperRate * (1 + n(rates.wrapper?.gst_rate) / 100),

    preform_rate_basic_snapshot: preformRate,
    caps_rate_basic_snapshot: capsRate,
    wrapper_rate_basic_snapshot: wrapperRate,

    caps_rate_incl_gst_snapshot:
      capsRate * (1 + n(rates.caps?.gst_rate) / 100),

    preform_1_weight_g: grammage1,
    preform_1_bags_used: n(input.preform_1_bags_used),
    preform_1_bags_remaining: n(input.preform_1_bags_remaining),

    preform_2_weight_g: grammage2,
    preform_2_bags_used: n(input.preform_2_bags_used),
    preform_2_bags_remaining: n(input.preform_2_bags_remaining),

    preform_bag_weight_kg: preform1BagKg,

    wrapper_roll_weight_kg: wrapperRollWeightKg,
    wrapper_boxes_per_roll: wrapperBoxesPerRoll,
    wrapper_rolls_used: wrapperRollsUsed,

    label_rate_per_box: labelsRate,

    labour_day_total: labourDayTotal,
    daily_labour_allocation_hours: labourAllocationHours,

    opening_kwh: openingKwh,
    closing_kwh: closingKwh,
    non_production_kwh: nonProductionKwh,
    meter_factor: meterFactor,
    tod_electricity_rate: electricityRate,
    electricity_units: round(electricityUnits),
    electricity_rate: electricityRate,

    rejected_bottles: rejectedBottles,
    rejected_caps: rejectedCaps,
    rejected_wrapper_boxes: rejectedWrapperBoxes,

    preform_cost: preformCost,
    caps_cost: capsCost,
    wrapper_cost: wrapperCost,
    labels_cost: labelsCost,
    minerals_cost: mineralsCost,
    labour_cost: labourCost,
    electricity_cost: electricityCost,
    maintenance_cost: maintenanceCost,
    glue_chemicals_cost: glueChemicalsCost,
    other_charges_cost: otherChargesCost,

    manufacturing_cost: manufacturingCost,
    manufacturing_cost_per_box: manufacturingCostPerBox,

    selling_price_per_box: sellingPricePerBox,
    sales_revenue: salesRevenue,
    sales_expenses: salesExpenses,
    transport_sales_expense: salesExpenses,
    profit,

    rate_snapshot: rateSnapshot,
    calculation_details: calculationDetails,
    status: "calculated",
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);

    if (searchParams.get("view") === "sku_preforms") {
      const { data, error } = await supabase
        .from("sku_preform_rate_master")
        .select("*,product:products(id,name,volume_ml)")
        .order("product_id")
        .order("preform_slot");

      if (error) throw error;

      return NextResponse.json({
        success: true,
        sku_preforms: data || [],
      });
    }

    if (searchParams.get("view") === "rates") {
      const { data: rates, error: rateError } = await supabase
        .from("costing_rate_master")
        .select("*")
        .eq("is_active", true)
        .order("component_key", { ascending: true });

      if (rateError) throw rateError;

      return NextResponse.json({
        success: true,
        rates: rates || [],
      });
    }

    let query = supabase
      .from("daily_cost_entries")
      .select(`
        *,
        product:products (
          id,
          name,
          volume_ml,
          bottles_per_box,
          units_per_box
        ),
        lot:production_lots!daily_cost_entries_production_lot_id_fkey (
          id,
          lot_code,
          produced_boxes,
          good_boxes,
          actual_cost_per_box
        )
      `)
      .order("production_date", { ascending: false })
      .order("created_at", { ascending: false });

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const productId = searchParams.get("product_id");

    if (from) query = query.gte("production_date", from);
    if (to) query = query.lte("production_date", to);
    if (productId) query = query.eq("product_id", productId);

    const { data, error } = await query.limit(500);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      entries: data || [],
    });
  } catch (error: any) {
    console.error("Costing entries GET error:", error);
    return jsonError(error.message || "Unable to load costing entries.", 500);
  }
}

async function saveEntry(request: NextRequest, isUpdate: boolean) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json();

    const id = body.id;

    if (isUpdate && !id) {
      return jsonError("Entry ID is required for update.");
    }

    const productionDate = body.production_date;
    const productId = body.product_id;
    const entryType = body.entry_type || "production";

    if (!productionDate) {
      return jsonError("Production date is required.");
    }

    if (!["production", "changeover"].includes(entryType)) {
      return jsonError("Invalid entry type.");
    }

    if (entryType === "production" && !productId) {
      return jsonError("Select a product for production entries.");
    }

    // Zero produced boxes is valid when opening the lot before production.
    if (n(body.rejected_boxes) > n(body.produced_boxes)) {
      return jsonError("Rejected boxes cannot exceed produced boxes.");
    }

    if (isUpdate) {
      const { data: existing, error: existingError } = await supabase
        .from("daily_cost_entries")
        .select("id,status,production_lot_id,product_id,production_date,shift,production_shift")
        .eq("id", id)
        .single();

      if (existingError) throw existingError;

      if (existing.status === "locked") {
        return jsonError(
          "This costing entry is locked and cannot be edited.",
          409
        );
      }

      // Once QR registration has started, lot identity must not change.
      if (existing.production_lot_id) {
        const requestedShift = body.shift || body.production_shift || "General";
        const existingShift =
          existing.shift || existing.production_shift || "General";

        if (
          (body.product_id || null) !== (existing.product_id || null) ||
          String(body.production_date || "") !==
            String(existing.production_date || "") ||
          String(requestedShift) !== String(existingShift)
        ) {
          return jsonError(
            "Product, production date and shift cannot be changed after the production lot has been opened for QR registration. Edit the other costing fields instead.",
            409
          );
        }
      }
    }

    let product: AnyRecord = {};

    if (productId) {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,volume_ml,bottles_per_box,units_per_box")
        .eq("id", productId)
        .single();

      if (error) throw error;
      product = data;
    }

    const rates = await loadRates(supabase);

    const { data: skuPreforms, error: skuPreformError } = await supabase
      .from("sku_preform_rate_master")
      .select("*")
      .eq(
        "product_id",
        productId || "00000000-0000-0000-0000-000000000000"
      )
      .eq("is_active", true);

    if (skuPreformError) throw skuPreformError;

    const calculated = calculateEntry(
      body,
      rates,
      product,
      skuPreforms || []
    );

    // good_boxes is generated by PostgreSQL. Never write to it.
    const {
      good_boxes: _generatedGoodBoxes,
      ...calculatedForDb
    } = calculated;

    const payload: AnyRecord = {
      production_date: productionDate,
      production_shift: body.production_shift || body.shift || "General",
      shift: body.shift || body.production_shift || "General",
      entry_type: entryType,
      product_id: productId || null,

      produced_boxes: Math.max(0, n(body.produced_boxes)),
      rejected_boxes: Math.max(0, n(body.rejected_boxes)),
      productive_hours: Math.max(0, n(body.productive_hours)),
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      break_hours: n(body.break_hours),
      changeover_hours: n(body.changeover_hours),
      wrapper_rolls_used: Math.max(0, n(body.wrapper_rolls_used)),

      notes: body.notes || null,
      ...calculatedForDb,
    };

    let saved: AnyRecord;

    if (isUpdate) {
      const { data, error } = await supabase
        .from("daily_cost_entries")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("daily_cost_entries")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      saved = data;
    }

    let lotResult: AnyRecord | null = null;
    let lotWarning: string | null = null;

    if (entryType === "production") {
      const { data, error } = await supabase.rpc(
        "link_daily_cost_entry_to_lot",
        { p_entry_id: saved.id }
      );

      if (error) {
        lotWarning = error.message;
      } else {
        lotResult = data;

        if (!data || data.linked !== true) {
          lotWarning =
            data?.message ||
            "The database function returned without confirming that the production lot was linked.";
        }
      }
    }

    const { data: finalEntry, error: finalReadError } = await supabase
      .from("daily_cost_entries")
      .select(`
        *,
        product:products (id,name,volume_ml,bottles_per_box),
        lot:production_lots!daily_cost_entries_production_lot_id_fkey (
          id,
          lot_code,
          good_boxes,
          actual_cost_per_box
        )
      `)
      .eq("id", saved.id)
      .single();

    if (finalReadError) throw finalReadError;

    if (
      entryType === "production" &&
      !finalEntry.production_lot_id &&
      !lotWarning
    ) {
      lotWarning =
        "The costing entry was saved, but production_lot_id is still empty after lot linking.";
    }

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? "Costing entry updated."
        : "Costing entry saved.",
      entry: finalEntry,
      lot: lotResult,
      warning: lotWarning,
      lot_linked: Boolean(finalEntry.production_lot_id),
    });
  } catch (error: any) {
    console.error("Costing entry save error:", error);
    return jsonError(error.message || "Unable to save costing entry.", 500);
  }
}

export async function POST(request: NextRequest) {
  return saveEntry(request, false);
}

export async function PUT(request: NextRequest) {
  return saveEntry(request, true);
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json();
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return jsonError("A valid costing entry ID is required.");
    }

    const { data: entry, error: entryError } = await supabase
      .from("daily_cost_entries")
      .select("id,status,production_lot_id,production_date,product_id")
      .eq("id", id)
      .single();

    if (entryError) {
      if (entryError.code === "PGRST116") {
        return jsonError("Costing entry was not found.", 404);
      }
      throw entryError;
    }

    if (entry.status === "locked") {
      return jsonError(
        "This costing entry is locked and cannot be deleted.",
        409
      );
    }

    const lotId = entry.production_lot_id;

    if (lotId) {
      // Never delete a lot after QR stock has been registered against it.
      const { count: stockCount, error: stockError } = await supabase
        .from("stock_units")
        .select("id", { count: "exact", head: true })
        .eq("production_lot_id", lotId);

      if (stockError) throw stockError;

      if ((stockCount || 0) > 0) {
        return jsonError(
          "This entry cannot be deleted because QR stock has already been registered against its production lot. Keep the entry for stock traceability; edit it if a correction is needed.",
          409
        );
      }

      // A shared lot must not be left with an incorrect combined cost snapshot.
      const { count: linkedEntryCount, error: linkedError } = await supabase
        .from("daily_cost_entries")
        .select("id", { count: "exact", head: true })
        .eq("production_lot_id", lotId);

      if (linkedError) throw linkedError;

      if ((linkedEntryCount || 0) > 1) {
        return jsonError(
          "This production lot is shared by multiple costing entries. Delete is blocked to avoid damaging the combined lot costing. Edit the entry instead.",
          409
        );
      }
    }

    const { error: deleteEntryError } = await supabase
      .from("daily_cost_entries")
      .delete()
      .eq("id", id);

    if (deleteEntryError) throw deleteEntryError;

    let lotDeleted = false;

    if (lotId) {
      const { error: deleteLotError } = await supabase
        .from("production_lots")
        .delete()
        .eq("id", lotId);

      if (deleteLotError) {
        console.error(
          "Empty production lot cleanup warning:",
          deleteLotError
        );
      } else {
        lotDeleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: lotId
        ? lotDeleted
          ? "Costing entry and its unused production lot were deleted."
          : "Costing entry deleted. The unused production lot could not be removed because another database reference exists."
        : "Costing entry deleted.",
      lot_deleted: lotDeleted,
    });
  } catch (error: any) {
    console.error("Costing entry DELETE error:", error);
    return jsonError(
      error.message || "Unable to delete costing entry.",
      500
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json();

    if (body?.action === "save_sku_preform") {
      const productId = String(body.product_id || "");
      const slot = Number(body.preform_slot);

      if (!productId || ![1, 2].includes(slot)) {
        return jsonError("Valid SKU and preform slot are required.");
      }

      const payload = {
        product_id: productId,
        preform_slot: slot,
        preform_name: String(
          body.preform_name || `Preform ${slot}`
        ).trim(),
        grammage_g: Number(body.grammage_g),
        bag_weight_kg: Number(body.bag_weight_kg),
        wastage_kg_per_bag: Number(body.wastage_kg_per_bag || 0),
        rate_per_kg: Number(body.rate_per_kg),
        gst_rate: Number(body.gst_rate || 18),
        effective_from:
          body.effective_from || new Date().toISOString().slice(0, 10),
        is_active: body.is_active !== false,
      };

      if (
        ![
          payload.grammage_g,
          payload.bag_weight_kg,
          payload.wastage_kg_per_bag,
          payload.rate_per_kg,
          payload.gst_rate,
        ].every(Number.isFinite) ||
        payload.grammage_g <= 0 ||
        payload.bag_weight_kg <= 0 ||
        payload.wastage_kg_per_bag < 0 ||
        payload.wastage_kg_per_bag >= payload.bag_weight_kg ||
        payload.rate_per_kg < 0 ||
        payload.gst_rate < 0 ||
        payload.gst_rate > 100
      ) {
        return jsonError(
          "Check grammage, bag weight, wastage, rate and GST values."
        );
      }

      // Find the row regardless of active status. This avoids duplicate-key
      // errors when reactivating a previously disabled SKU preform.
      const { data: old, error: oldError } = await supabase
        .from("sku_preform_rate_master")
        .select("id")
        .eq("product_id", productId)
        .eq("preform_slot", slot)
        .maybeSingle();

      if (oldError) throw oldError;

      let result: AnyRecord;

      if (old?.id) {
        const { data, error } = await supabase
          .from("sku_preform_rate_master")
          .update(payload)
          .eq("id", old.id)
          .select("*")
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("sku_preform_rate_master")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        result = data;
      }

      return NextResponse.json({
        success: true,
        sku_preform: result,
      });
    }

    if (!body?.id) {
      return jsonError("Rate row ID is required.");
    }

    const rateValue = Number(body.rate_value);
    const gstRate = Number(body.gst_rate ?? 0);

    if (!Number.isFinite(rateValue) || rateValue < 0) {
      return jsonError("Rate must be a valid non-negative number.");
    }

    if (
      !Number.isFinite(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      return jsonError("GST rate must be between 0 and 100.");
    }

    const updatePayload: AnyRecord = {
      rate_value: rateValue,
      gst_rate: gstRate,
    };

    if (body.effective_from) {
      updatePayload.effective_from = body.effective_from;
    }

    const { data, error } = await supabase
      .from("costing_rate_master")
      .update(updatePayload)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message:
        "Rate master updated. Existing costing entries retain their saved rate snapshots.",
      rate: data,
    });
  } catch (error: any) {
    console.error("Costing rate PATCH error:", error);
    return jsonError(
      error.message || "Unable to update rate master.",
      500
    );
  }
}