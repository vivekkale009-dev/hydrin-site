import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getAllRows(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  columns: string,
  orderColumn = "created_at"
) {
  const pageSize = 1000;
  let from = 0;
  let allRows: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

function sumField(rows: any[], field: string) {
  return rows.reduce(
    (sum: number, row: any) =>
      sum + Number(row[field] || 0),
    0
  );
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const [
      stockUnits,
      productionLots,
      products,
      locations,
      qrLabels,
      movements,
    ] = await Promise.all([
      getAllRows(
        supabase,
        "stock_units",
        "id, qr_label_id, production_lot_id, product_id, location_id, original_boxes, available_boxes, quality_hold_boxes, dispatched_boxes, scrapped_boxes, status, stock_origin, created_at, updated_at"
      ),
      getAllRows(
        supabase,
        "production_lots",
        "id, lot_code, product_id, production_date, production_shift, produced_boxes, rejected_boxes, status, notes, created_at",
        "production_date"
      ),
      getAllRows(
        supabase,
        "products",
        "id, name, volume_ml, units_per_box, is_active",
        "name"
      ),
      getAllRows(
        supabase,
        "stock_locations",
        "id, location_code, location_name, location_type, is_active",
        "location_name"
      ),
      getAllRows(
        supabase,
        "qr_labels",
        "id, qr_batch_id, qr_token, status, registered_at, cancelled_at, cancellation_reason, stock_unit_id, created_at"
      ),
      getAllRows(
        supabase,
        "stock_movements",
        "id, stock_unit_id, movement_type, quantity_boxes, from_location_id, to_location_id, reference_type, reference_id, reason, performed_by, created_at"
      ),
    ]);

    const productMap = new Map(
      products.map((p: any) => [p.id, p])
    );

    const lotMap = new Map(
      productionLots.map((l: any) => [l.id, l])
    );

    const locationMap = new Map(
      locations.map((l: any) => [l.id, l])
    );

    const labelMap = new Map(
      qrLabels.map((q: any) => [q.id, q])
    );

    const enrichedStock = stockUnits.map((unit: any) => {
      const lot: any = lotMap.get(unit.production_lot_id);

      const productId =
        unit.product_id || lot?.product_id || null;

      const product: any = productId
        ? productMap.get(productId)
        : null;

      const location: any = locationMap.get(unit.location_id);
      const label: any = labelMap.get(unit.qr_label_id);

      const isQrTracked = unit.qr_label_id !== null;

      return {
        ...unit,

        product_id: productId,
        product_name: product?.name || "Unknown product",
        volume_ml: product?.volume_ml || null,
        units_per_box: product?.units_per_box || null,

        lot_code: lot?.lot_code || "Opening / Manual Stock",
        production_date: lot?.production_date || null,
        production_shift: lot?.production_shift || null,

        location_name: location?.location_name || "Unassigned",
        location_code: location?.location_code || "",

        stock_origin: unit.stock_origin || "production",
        is_qr_tracked: isQrTracked,
        tracking_type: isQrTracked ? "QR Tracked" : "Manual / Non-QR",

        qr_status: label?.status || "unknown",
        qr_token_short: label?.qr_token
          ? `${label.qr_token.slice(0, 8)}...`
          : "",

        registered_at: label?.registered_at || null,
      };
    });

    // Separate physical stock from QR-tracked and manual stock.
    const qrStock = enrichedStock.filter(
      (row: any) => row.is_qr_tracked
    );

    const manualStock = enrichedStock.filter(
      (row: any) => !row.is_qr_tracked
    );

    // Existing summary keys remain QR-only for compatibility
    // with the QR dashboard cards.
    const summary = {
      totalStockUnits: qrStock.length,
      totalProducedBoxes: sumField(qrStock, "original_boxes"),
      availableBoxes: sumField(qrStock, "available_boxes"),
      dispatchedBoxes: sumField(qrStock, "dispatched_boxes"),
      qualityHoldBoxes: sumField(qrStock, "quality_hold_boxes"),
      scrappedBoxes: sumField(qrStock, "scrapped_boxes"),

      // Complete physical stock, including manual production.
      physicalStockUnits: enrichedStock.length,
      physicalProducedBoxes: sumField(
        enrichedStock,
        "original_boxes"
      ),
      physicalAvailableBoxes: sumField(
        enrichedStock,
        "available_boxes"
      ),
      physicalDispatchedBoxes: sumField(
        enrichedStock,
        "dispatched_boxes"
      ),
      physicalQualityHoldBoxes: sumField(
        enrichedStock,
        "quality_hold_boxes"
      ),
      physicalScrappedBoxes: sumField(
        enrichedStock,
        "scrapped_boxes"
      ),

      // Manual / non-QR stock totals.
      manualStockUnits: manualStock.length,
      manualProducedBoxes: sumField(
        manualStock,
        "original_boxes"
      ),
      manualAvailableBoxes: sumField(
        manualStock,
        "available_boxes"
      ),

      // Explicit QR totals.
      qrStockUnits: qrStock.length,
      qrProducedBoxes: sumField(qrStock, "original_boxes"),
      qrAvailableBoxes: sumField(qrStock, "available_boxes"),
      qrDispatchedBoxes: sumField(qrStock, "dispatched_boxes"),

      activeLots: productionLots.filter(
        (l: any) => l.status === "active"
      ).length,

      registeredQrs: qrLabels.filter(
        (q: any) => q.status === "registered"
      ).length,

      unusedQrs: qrLabels.filter(
        (q: any) => q.status === "unused"
      ).length,

      cancelledQrs: qrLabels.filter(
        (q: any) => q.status === "cancelled"
      ).length,
    };

    // Product totals represent all physical stock.
    // Separate QR and manual figures are also returned.
    const byProduct = products
      .map((product: any) => {
        const rows = enrichedStock.filter(
          (row: any) => row.product_id === product.id
        );

        const qrRows = rows.filter(
          (row: any) => row.is_qr_tracked
        );

        const manualRows = rows.filter(
          (row: any) => !row.is_qr_tracked
        );

        return {
          productId: product.id,
          productName: product.name,
          volumeMl: product.volume_ml,

          stockUnits: rows.length,

          producedBoxes: sumField(rows, "original_boxes"),
          availableBoxes: sumField(rows, "available_boxes"),
          dispatchedBoxes: sumField(rows, "dispatched_boxes"),
          qualityHoldBoxes: sumField(rows, "quality_hold_boxes"),
          scrappedBoxes: sumField(rows, "scrapped_boxes"),

          qrStockUnits: qrRows.length,
          qrAvailableBoxes: sumField(
            qrRows,
            "available_boxes"
          ),

          manualStockUnits: manualRows.length,
          manualAvailableBoxes: sumField(
            manualRows,
            "available_boxes"
          ),
        };
      })
      .filter(
        (p: any) =>
          p.stockUnits > 0 || p.availableBoxes > 0
      );

    // Location totals include ALL physical stock.
    // This is where CommonFloor_ManualAdminUpdate appears.
    const byLocation = locations.map((location: any) => {
      const rows = enrichedStock.filter(
        (row: any) => row.location_id === location.id
      );

      const qrRows = rows.filter(
        (row: any) => row.is_qr_tracked
      );

      const manualRows = rows.filter(
        (row: any) => !row.is_qr_tracked
      );

      return {
        locationId: location.id,
        locationCode: location.location_code,
        locationName: location.location_name,
        locationType: location.location_type,

        stockUnits: rows.length,

        availableBoxes: sumField(rows, "available_boxes"),

        qualityHoldBoxes: sumField(
          rows,
          "quality_hold_boxes"
        ),

        // Breakdown by tracking type.
        qrStockUnits: qrRows.length,
        qrAvailableBoxes: sumField(
          qrRows,
          "available_boxes"
        ),

        manualStockUnits: manualRows.length,
        manualAvailableBoxes: sumField(
          manualRows,
          "available_boxes"
        ),
      };
    });

    const enrichedLots = productionLots.map((lot: any) => {
      const product: any = productMap.get(lot.product_id);

      const rows = enrichedStock.filter(
        (row: any) => row.production_lot_id === lot.id
      );

      return {
        ...lot,

        product_name: product?.name || "Unknown product",
        volume_ml: product?.volume_ml || null,

        stock_units: rows.length,

        available_boxes: sumField(rows, "available_boxes"),
        dispatched_boxes: sumField(rows, "dispatched_boxes"),
        quality_hold_boxes: sumField(
          rows,
          "quality_hold_boxes"
        ),
        scrapped_boxes: sumField(rows, "scrapped_boxes"),
      };
    });

    const stockUnitMap = new Map(
      enrichedStock.map((unit: any) => [unit.id, unit])
    );

    // Only QR-tracked stock movements are shown in QR movement history.
    const enrichedMovements = movements
      .filter((movement: any) => {
        const unit: any = stockUnitMap.get(
          movement.stock_unit_id
        );

        return unit?.is_qr_tracked === true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 100)
      .map((movement: any) => {
        const unit: any = stockUnitMap.get(
          movement.stock_unit_id
        );

        const from: any = locationMap.get(
          movement.from_location_id
        );

        const to: any = locationMap.get(
          movement.to_location_id
        );

        return {
          ...movement,

          lot_code: unit?.lot_code || "Unknown lot",
          product_name: unit?.product_name || "Unknown product",

          from_location: from?.location_name || null,
          to_location: to?.location_name || null,

          qr_token_short: unit?.qr_token_short || "",
        };
      });

    const recentRegistrations = enrichedStock
      .filter(
        (row: any) =>
          row.is_qr_tracked &&
          row.qr_status === "registered"
      )
      .sort(
        (a: any, b: any) =>
          new Date(
            b.registered_at || b.created_at
          ).getTime() -
          new Date(
            a.registered_at || a.created_at
          ).getTime()
      )
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),

      summary,
      byProduct,
      byLocation,

      lots: enrichedLots,

      // Includes QR and manual stock for physical inventory views.
      stockUnits: enrichedStock,

      // QR-only history.
      movements: enrichedMovements,
      recentRegistrations,

      qrSummary: {
        total: qrLabels.length,
        registered: summary.registeredQrs,
        unused: summary.unusedQrs,
        cancelled: summary.cancelledQrs,
      },
    });
  } catch (error: any) {
    console.error("Stock dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Unable to load stock dashboard.",
      },
      { status: 500 }
    );
  }
}