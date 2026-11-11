
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DistributorViewPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Distributor-specific SKU rates. Empty string means no special rate.
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [savingRates, setSavingRates] = useState(false);
  const [rateMessage, setRateMessage] = useState("");
  const [rateError, setRateError] = useState("");

  // null means all available SKUs are selected
  const [selectedSkus, setSelectedSkus] = useState<string[] | null>(null);

  // Reset SKU selection whenever the month changes
  useEffect(() => {
    setSelectedSkus(null);
  }, [selectedMonth]);

  // 1. Load Distributor Details
  const loadDetails = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/distributors/${id}/details`
      );

      const json = await res.json();

      if (res.ok && json.data) {
        setData(json.data);

        const nextRates: Record<string, string> = {};
        (json.data.products || []).forEach((product: any) => {
          const savedRate = (json.data.distributor_prices || []).find(
            (rate: any) => rate.product_id === product.id
          );
          nextRates[product.id] =
            savedRate?.price_per_box != null
              ? String(savedRate.price_per_box)
              : "";
        });
        setRateInputs(nextRates);
      } else {
        setError(json.error || "Failed to load data");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // 2. Extract Available Months
  const availableMonths = useMemo(() => {
    if (!data?.orders) return [];

    const monthsSet = new Set<string>();

    data.orders.forEach((o: any) => {
      if (o.created_at) {
        const date = new Date(o.created_at);

        const yearMonth =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

        monthsSet.add(yearMonth);
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [data]);

  // 3. Filter Orders Based on Selected Month
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];

    if (selectedMonth === "all") {
      return data.orders;
    }

    return data.orders.filter((o: any) => {
      if (!o.created_at) return false;

      const date = new Date(o.created_at);

      const yearMonth =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

      return yearMonth === selectedMonth;
    });
  }, [data, selectedMonth]);

  // 4. Calculate Total Sales
  const totalSalesFiltered = useMemo(() => {
    return filteredOrders.reduce(
      (sum: number, o: any) =>
        sum +
        Number(o.total_payable_amount || o.total || 0),
      0
    );
  }, [filteredOrders]);

  const totalSalesAllTime = useMemo(() => {
    if (!data?.orders) return 0;

    return data.orders.reduce(
      (sum: number, o: any) =>
        sum +
        Number(o.total_payable_amount || o.total || 0),
      0
    );
  }, [data]);

  // 5. Calculate SKU-Wise Box Quantities
  // Count every non-cancelled order, regardless of its current status.
  const skuSummary = useMemo(() => {
    const summary: Record<string, number> = {};

    filteredOrders.forEach((order: any) => {
      const status = String(order.status || "").toLowerCase().trim();

      // Exclude cancelled orders only.
      if (status === "cancelled") {
        return;
      }

      const items = Array.isArray(order.order_items)
        ? order.order_items
        : [];

      items.forEach((item: any) => {
        const sku = item.product_name || "Unknown SKU";
        const boxes = Number(item.qty_boxes || 0);

        if (!Number.isFinite(boxes)) return;

        summary[sku] = (summary[sku] || 0) + boxes;
      });
    });

    return summary;
  }, [filteredOrders]);

  // 6. Get All Available SKUs
  const availableSkus = useMemo(() => {
    return Object.keys(skuSummary).sort();
  }, [skuSummary]);

  // All SKUs selected by default
  const activeSkus = useMemo(() => {
    if (selectedSkus === null) {
      return availableSkus;
    }

    return availableSkus.filter((sku) =>
      selectedSkus.includes(sku)
    );
  }, [selectedSkus, availableSkus]);

  // 7. Calculate Total Boxes for Selected SKUs
  const totalBoxesSold = useMemo(() => {
    return activeSkus.reduce(
      (total, sku) => total + (skuSummary[sku] || 0),
      0
    );
  }, [activeSkus, skuSummary]);

  // 8. Individual SKU Selection
  const toggleSku = (sku: string) => {
    const currentlySelected =
      selectedSkus === null
        ? availableSkus
        : selectedSkus;

    const updated = currentlySelected.includes(sku)
      ? currentlySelected.filter((s) => s !== sku)
      : [...currentlySelected, sku];

    setSelectedSkus(updated);
  };

  // Select All
  const selectAllSkus = () => {
    setSelectedSkus(null);
  };

  // Deselect All
  const deselectAllSkus = () => {
    setSelectedSkus([]);
  };

  // Save optional distributor-specific SKU rates.
  const saveDistributorRates = async () => {
    setRateError("");
    setRateMessage("");

    const prices = (data?.products || []).map((product: any) => {
      const raw = String(rateInputs[product.id] ?? "").trim();
      return {
        product_id: product.id,
        price_per_box: raw === "" ? null : Number(raw),
      };
    });

    const invalid = prices.find(
      (item: any) =>
        item.price_per_box !== null &&
        (!Number.isFinite(item.price_per_box) || item.price_per_box <= 0)
    );

    if (invalid) {
      setRateError("Enter a valid rate greater than ₹0, or leave the field blank.");
      return;
    }

    setSavingRates(true);
    try {
      const response = await fetch(
        `/api/admin/distributors/${id}/details`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prices }),
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Unable to save distributor rates.");
      }

      setData((current: any) => ({
        ...current,
        distributor_prices: json.distributor_prices || [],
      }));

      const savedMap: Record<string, string> = {};
      (data?.products || []).forEach((product: any) => {
        const saved = (json.distributor_prices || []).find(
          (rate: any) => rate.product_id === product.id
        );
        savedMap[product.id] =
          saved?.price_per_box != null ? String(saved.price_per_box) : "";
      });
      setRateInputs(savedMap);
      setRateMessage("Distributor SKU-wise rates saved successfully.");
    } catch (err) {
      setRateError(
        err instanceof Error ? err.message : "Unable to save distributor rates."
      );
    } finally {
      setSavingRates(false);
    }
  };

  // 9. WhatsApp Payment Reminder
  const sendWhatsAppReminder = () => {
    const phone = data.profile.phone;

    const pendingOrders = data.orders
      .filter((o: any) => Number(o.pending_amount) > 0)
      .map((o: any) => o.uorn || o.id.slice(0, 8))
      .slice(0, 5)
      .join(", ");

    const message =
      `*PAYMENT REMINDER FROM EARTHY SOURCE*%0a%0a` +
      `Hello ${data.profile.name},%0a%0a` +
      `This is a reminder regarding your outstanding balance of ` +
      `*₹${data.current_due}*. %0a%0a` +
      `Pending Orders: ${pendingOrders}%0a%0a` +
      `Please clear the dues at your earliest convenience. Thank you!`;

    window.open(
      `https://wa.me/91${phone}?text=${message}`,
      "_blank"
    );
  };

  if (loading) {
    return <div style={styles.loader}>Syncing Profile...</div>;
  }

  if (error) {
    return (
      <div style={styles.loader}>
        Error: {error}
        <br />
        <button onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .distributor-page, .distributor-page * { box-sizing: border-box; }
        .distributor-page {
          background: radial-gradient(circle at 8% 0%, #e8f1ff 0, transparent 28%), #f5f7fb !important;
          color: #152238;
        }
        .distributor-container { max-width: 1320px !important; }
        .distributor-header {
          padding: 22px 24px !important;
          border: 1px solid rgba(220,230,244,.9);
          border-radius: 20px;
          background: linear-gradient(115deg, #ffffff 0%, #f4f8ff 100%);
          box-shadow: 0 10px 30px rgba(25,55,99,.06);
        }
        .distributor-header h1 { letter-spacing: -.9px; }
        .distributor-page .distributor-metrics {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 18px !important;
          margin: 0 0 20px !important;
        }
        .distributor-page .distributor-metrics > div {
          position: relative;
          overflow: hidden;
          min-height: 142px;
          padding: 22px 24px !important;
          border: 1px solid #e4eaf4 !important;
          border-radius: 18px !important;
          background: #fff !important;
          box-shadow: 0 8px 24px rgba(22,45,82,.055) !important;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .distributor-page .distributor-metrics > div:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 30px rgba(22,45,82,.10) !important;
        }
        .distributor-page .distributor-metrics > div:first-child {
          border-left: 0 !important;
          background: linear-gradient(135deg,#fff 0%,#eef5ff 100%) !important;
        }
        .distributor-page .distributor-metrics > div:nth-child(2) {
          border-left: 0 !important;
          background: linear-gradient(135deg,#fff 0%,#fff1f1 100%) !important;
        }
        .distributor-page .distributor-metrics > div:after {
          content: '';
          position: absolute;
          width: 116px; height: 116px;
          right: -34px; bottom: -48px;
          border-radius: 50%;
          background: rgba(37,99,235,.07);
          pointer-events: none;
        }
        .distributor-page .distributor-metrics > div:nth-child(2):after { background: rgba(220,68,68,.07); }
        .distributor-page .distributor-metrics > div > div:first-child {
          color: #64748b !important;
          font-size: 12px !important;
          font-weight: 750 !important;
          letter-spacing: .075em !important;
          text-transform: uppercase;
        }
        .distributor-page .distributor-metrics > div > div:nth-child(2) {
          position: relative;
          z-index: 1;
          margin-top: 10px !important;
          color: #174ea6 !important;
          font-size: clamp(27px,3vw,36px) !important;
          font-weight: 800 !important;
          letter-spacing: -1px;
        }
        .distributor-page .distributor-metrics > div:nth-child(2) > div:nth-child(2) { color: #d13f4b !important; }
        .distributor-page .distributor-metrics .metricSub { color: #64748b !important; }
        .distributor-page .distributor-filter,
        .distributor-page [style*="border-radius: 16px"] {
          border-radius: 16px !important;
        }
        .distributor-page .distributor-filter {
          border: 1px solid #e3eaf4 !important;
          box-shadow: 0 5px 18px rgba(22,45,82,.04) !important;
        }
        .distributor-page [style*="padding: 24px"] {
          border-radius: 17px !important;
          border: 1px solid #e5ebf4;
          box-shadow: 0 7px 22px rgba(22,45,82,.045) !important;
        }
        .distributor-page button { border-radius: 10px !important; }
        .distributor-page button:hover:not(:disabled) { filter: brightness(.97); transform: translateY(-1px); }
        .distributor-page button:active:not(:disabled) { transform: translateY(0); }
        .distributor-page input, .distributor-page select { transition: border-color .15s ease, box-shadow .15s ease; }
        .distributor-page input:focus, .distributor-page select:focus {
          border-color: #78a7f5 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,.12) !important;
        }
        .sku-checkbox-container label { transition: border-color .15s ease, background .15s ease, transform .15s ease; }
        .sku-checkbox-container label:hover { border-color: #9bbcf2; background: #f0f6ff; transform: translateY(-1px); }
        .distributor-page tbody tr { transition: background .15s ease; }
        .distributor-page tbody tr:hover { background: #f7faff; }
        .distributor-page .distributor-main-grid { align-items: start; }

        .distributor-page {
          color: #172033;
          background: #f4f7fb !important;
          padding: 28px 22px !important;
          min-height: 100vh;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .distributor-page > div:first-child { display: none; }
        .distributor-container { max-width: 1240px !important; }
        .distributor-header {
          color: #172033 !important;
          margin-bottom: 22px !important;
          align-items: center;
          flex-wrap: wrap;
        }
        .distributor-header h1 {
          color: #111827;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 750;
          letter-spacing: -0.7px;
        }
        .distributor-header button {
          background: #fff !important;
          color: #334155 !important;
          border: 1px solid #dbe3ee !important;
          min-height: 40px;
          font-weight: 650;
        }
        .distributor-filter {
          background: #fff !important;
          border: 1px solid #e4eaf2;
          box-shadow: 0 2px 8px rgba(15, 23, 42, .035);
          padding: 14px 18px !important;
          border-radius: 12px !important;
          flex-wrap: wrap;
        }
        .distributor-filter label { color: #475569 !important; }
        .distributor-filter select {
          background: #fff !important;
          color: #172033 !important;
          border: 1px solid #d7e0eb !important;
          min-height: 40px;
        }
        .distributor-page [style*="box-shadow"] { box-shadow: 0 2px 10px rgba(15, 23, 42, .045) !important; }
        .distributor-page [style*="border-radius: 16px"] { border: 1px solid #e7edf4; }
        .distributor-page h3 { color: #253247 !important; font-size: 14px !important; letter-spacing: .035em; }
        .distributor-page .distributor-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 16px !important;
        }
        .distributor-page .distributor-metrics > div {
          border: 1px solid #e4eaf2;
          box-shadow: 0 2px 8px rgba(15, 23, 42, .035) !important;
          padding: 20px 22px !important;
        }
        .distributor-page .distributor-metrics > div:first-child { border-left: 4px solid #2563eb; }
        .distributor-page .distributor-metrics > div:nth-child(2) { border-left: 4px solid #e05252; }
        .distributor-page .distributor-metrics > div:nth-child(2) > div:nth-child(2) { color: #dc4444 !important; }
        .distributor-page .distributor-main-grid {
          grid-template-columns: minmax(0, 1fr) 300px !important;
          gap: 18px !important;
          align-items: start;
        }
        .distributor-page .distributor-main-grid > div,
        .distributor-page .distributor-main-grid .sideCol { min-width: 0; }
        .distributor-page [style*="background: rgb(30, 41, 59)"] {
          background: #17243a !important;
          color: #fff !important;
        }
        .distributor-page table { min-width: 520px; }
        .distributor-page th {
          color: #64748b !important;
          font-size: 11px !important;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          padding: 12px 10px !important;
          background: #f8fafc;
          white-space: nowrap;
        }
        .distributor-page td {
          color: #334155;
          padding: 13px 10px !important;
          border-bottom: 1px solid #edf1f6 !important;
        }
        .distributor-page tr:last-child td { border-bottom: 0 !important; }
        .rate-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .rate-table-wrap table { min-width: 460px; }
        .distributor-page input[type="number"] {
          min-height: 42px;
          border: 1px solid #d7e0eb !important;
          border-radius: 9px !important;
          background: #fff !important;
        }
        .distributor-page button {
          transition: background .15s ease, border-color .15s ease, transform .15s ease;
        }
        .distributor-page button:focus-visible,
        .distributor-page input:focus-visible,
        .distributor-page select:focus-visible {
          outline: 3px solid rgba(37, 99, 235, .18);
          outline-offset: 2px;
        }
        .sku-checkbox-container {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 10px !important;
        }
        .sku-checkbox-container label {
          background: #f8fafc;
          border: 1px solid #e5eaf1;
          border-radius: 9px;
          padding: 11px 12px;
          min-height: 44px;
        }
        @media (max-width: 760px) {
          .distributor-page { padding: 16px 12px !important; }
          .distributor-header { gap: 12px !important; margin-bottom: 16px !important; }
          .distributor-header h1 { width: 100%; margin: 2px 0 0; }
          .distributor-filter { align-items: stretch !important; gap: 9px !important; }
          .distributor-filter label { width: 100%; }
          .distributor-filter select { width: 100%; }
          .distributor-page .distributor-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .distributor-page .distributor-metrics > div { min-height: 126px; padding: 15px !important; }
          .distributor-page .distributor-metrics > div > div:nth-child(2) { font-size: clamp(20px,5vw,27px) !important; }
          .distributor-page .distributor-main-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0 !important;
          }
          .distributor-page [style*="padding: 24px"] { padding: 16px !important; }
          .distributor-page .skuHeader { align-items: flex-start !important; }
          .distributor-page .skuActions { width: 100%; margin-bottom: 12px !important; }
          .distributor-page .skuActions button { flex: 1; min-height: 40px; }
          .distributor-page .rateSectionHeader { gap: 8px !important; }
          .distributor-page .rateFooter { align-items: stretch !important; }
          .distributor-page .rateFooter button { width: 100%; min-height: 44px; }
          .distributor-page .rateInput { width: 145px !important; }
          .distributor-page .distributor-main-grid .distributor-side-col { margin-top: 0; }
          .distributor-page .distributor-table { display: table; }
        }
        @media (max-width: 420px) {
          .distributor-page { padding: 12px 9px !important; }
          .distributor-header { padding: 15px !important; }
          .distributor-page .distributor-metrics { gap: 8px !important; }
          .distributor-page .distributor-metrics > div { padding: 12px !important; min-height: 116px; }
          .distributor-page .distributor-metrics > div > div:first-child { font-size: 10px !important; }
          .distributor-page .distributor-metrics > div > div:nth-child(2) { font-size: 20px !important; }
          .distributor-page [style*="padding: 24px"] { padding: 13px !important; }
          .distributor-page .sku-checkbox-container { grid-template-columns: 1fr 1fr; }
          .distributor-page .sku-checkbox-container label { font-size: 12px !important; }
        }
      `}</style>
      <div className="distributor-page" style={styles.page}>
      <div style={styles.overlay} />

      <div className="distributor-container" style={styles.container}>

        {/* HEADER */}
        <div className="distributor-header" style={styles.header}>
          <button
            onClick={() => router.push("/admin/distributors")}
            style={styles.backBtn}
          >
            ← Back
          </button>

          <h1 style={styles.title}>
            {data.profile.name}
          </h1>
        </div>

        {/* FINANCIAL METRICS */}
        <div className="distributor-metrics" style={styles.metricsGrid}>
          <div style={styles.metricBox}>
            <div style={styles.metricTitle}>
              Total Sales (
              {selectedMonth === "all"
                ? "All Time"
                : selectedMonth}
              )
            </div>

            <div style={styles.metricValue}>
              ₹{totalSalesFiltered.toLocaleString("en-IN")}
            </div>

            {selectedMonth !== "all" && (
              <div style={styles.metricSub}>
                All-Time Total: ₹
                {totalSalesAllTime.toLocaleString("en-IN")}
              </div>
            )}
          </div>

          <div style={styles.metricBox}>
            <div style={styles.metricTitle}>
              Total Due Balance
            </div>

            <div
              style={{
                ...styles.metricValue,
                color: "#ef4444"
              }}
            >
              ₹{Number(data.current_due || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>


        {/* MONTH FILTER */}
        <div className="distributor-filter" style={styles.filterCard}>
          <label
            style={{
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            Filter by Month:
          </label>

          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value)
            }
            style={styles.selectDropdown}
          >
            <option value="all">All Time (Overall)</option>

            {availableMonths.map((m) => {
              const [year, month] = m.split("-");

              const monthName = new Date(
                Number(year),
                Number(month) - 1
              ).toLocaleString("default", {
                month: "long",
                year: "numeric"
              });

              return (
                <option key={m} value={m}>
                  {monthName}
                </option>
              );
            })}
          </select>
        </div>

        {/* OPTIONAL DISTRIBUTOR SKU-WISE RATES */}
        <div style={styles.card}>
          <div style={styles.rateSectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>DISTRIBUTOR SKU-WISE RATES</h3>
              <p style={styles.rateDescription}>
                Set a special rate per box for this distributor. Leave any SKU blank
                if the standard pricing should apply.
              </p>
            </div>
            <span style={styles.optionalBadge}>OPTIONAL</span>
          </div>

          {!data?.products?.length ? (
            <div style={styles.emptySku}>
              No active products found in the Products master.
            </div>
          ) : (
            <>
              <div className="rate-table-wrap" style={styles.rateTableWrap}>
                <table className="distributor-table" style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={{ padding: "12px 8px 12px 0" }}>SKU</th>
                      <th style={{ padding: "12px 8px" }}>Pack Size</th>
                      <th style={{ padding: "12px 0 12px 8px", textAlign: "right" }}>
                        SPECIAL RATE / BOX (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.products || []).map((product: any) => (
                      <tr key={product.id} style={styles.tr}>
                        <td style={styles.td}>
                          <strong>{product.name}</strong>
                        </td>
                        <td style={styles.td}>
                          {Number(product.volume_ml) >= 1000
                            ? `${Number(product.volume_ml) / 1000} L`
                            : `${product.volume_ml} ml`}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Use standard rate"
                            value={rateInputs[product.id] ?? ""}
                            onChange={(event) =>
                              setRateInputs((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                            style={styles.rateInput}
                            disabled={savingRates}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.rateFooter}>
                <span style={styles.rateHint}>
                  Blank = no distributor-specific rate. Rates are stored per box.
                </span>
                <button
                  type="button"
                  onClick={saveDistributorRates}
                  disabled={savingRates}
                  style={{
                    ...styles.rateSaveBtn,
                    opacity: savingRates ? 0.65 : 1,
                    cursor: savingRates ? "not-allowed" : "pointer",
                  }}
                >
                  {savingRates ? "Saving..." : "Save SKU Rates"}
                </button>
              </div>

              {rateError && (
                <div style={styles.rateError}>{rateError}</div>
              )}
              {rateMessage && (
                <div style={styles.rateSuccess}>{rateMessage}</div>
              )}
            </>
          )}
        </div>

        {/* SKU-WISE BOX SALES SUMMARY */}
        <div style={styles.card}>

          <div style={styles.skuHeader}>
            <h3 style={styles.cardTitle}>
              SKU-WISE BOX SALES
            </h3>

            <div style={styles.skuActions}>
              <button
                onClick={selectAllSkus}
                style={styles.skuActionBtn}
              >
                Select All
              </button>

              <button
                onClick={deselectAllSkus}
                style={styles.skuActionBtn}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* SKU CHECKBOXES */}
          {availableSkus.length > 0 ? (
            <div className="sku-checkbox-container" style={styles.skuCheckboxContainer}>
              {availableSkus.map((sku: string) => (
                <label
                  key={sku}
                  style={styles.skuCheckboxLabel}
                >
                  <input
                    type="checkbox"
                    checked={activeSkus.includes(sku)}
                    onChange={() => toggleSku(sku)}
                    style={styles.skuCheckbox}
                  />

                  {sku}
                </label>
              ))}
            </div>
          ) : (
            <div style={styles.emptySku}>
              No non-cancelled SKU orders found for this period.
            </div>
          )}

          {/* TOTAL BOXES */}
          <div style={styles.skuTotalBox}>
            <div style={styles.skuTotalTitle}>
              TOTAL BOXES SOLD
            </div>

            <div style={styles.skuTotalValue}>
              {totalBoxesSold.toLocaleString("en-IN")}
            </div>

            <div style={styles.skuTotalSub}>
              {activeSkus.length} of {availableSkus.length} SKUs selected
            </div>
          </div>

          {/* SKU BREAKDOWN TABLE */}
          <h4 style={styles.skuBreakdownTitle}>
            Individual SKU Breakdown
          </h4>

          <table className="distributor-table" style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ padding: "12px 0" }}>
                  SKU
                </th>

                <th style={{ textAlign: "right" }}>
                  Boxes Sold
                </th>
              </tr>
            </thead>

            <tbody>
              {activeSkus.length > 0 ? (
                activeSkus.map((sku: string) => (
                  <tr key={sku} style={styles.tr}>
                    <td style={styles.td}>
                      {sku}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        textAlign: "right",
                        fontWeight: "700"
                      }}
                    >
                      {(skuSummary[sku] || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    style={styles.emptySku}
                  >
                    Select at least one SKU to view the total.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        </div>

        {/* ORDER HISTORY AND QUICK ACTIONS */}
        <div className="distributor-main-grid" style={styles.grid}>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              Order History ({filteredOrders.length} Orders)
            </h3>

            <table className="distributor-table" style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th>Order</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Pending</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.length > 0 ? (

                  filteredOrders.map((order: any) => {
                    const isCancelled =
                      order.status?.toLowerCase() === "cancelled";

                    return (
                      <tr
                        key={order.id}
                        style={{
                          ...styles.tr,
                          backgroundColor: isCancelled
                            ? "#fff0d6"
                            : undefined
                        }}
                      >
                        <td style={styles.td}>
                          <div style={{ fontWeight: "600" }}>
                            {order.uorn || order.id.slice(0, 8)}
                          </div>

                          {isCancelled && (
                            <span style={styles.cancelBadge}>
                              CANCELLED
                            </span>
                          )}

                          <br />

                          <small style={{ color: "#94a3b8" }}>
                            {new Date(
                              order.created_at
                            ).toLocaleDateString()}
                          </small>
                        </td>

                        <td style={styles.td}>
                          ₹{order.total_payable_amount || order.total || 0}
                        </td>

                        <td style={styles.td}>
                          ₹{order.amount_paid || 0}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              color:
                                Number(order.pending_amount) > 0
                                  ? "#ef4444"
                                  : "#10b981",
                              fontWeight: "bold"
                            }}
                          >
                            ₹{order.pending_amount || 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })

                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#94a3b8"
                      }}
                    >
                      No orders found for the selected timeframe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* QUICK ACTIONS */}
          <div className="distributor-side-col" style={styles.sideCol}>
            <div
              style={{
                ...styles.card,
                background: "#1e293b",
                color: "#fff"
              }}
            >
              <h3
                style={{
                  ...styles.cardTitle,
                  color: "#94a3b8"
                }}
              >
                Quick Actions
              </h3>

              <button
                onClick={() =>
                  router.push(
                    `/admin/distributors/${id}/ledger`
                  )
                }
                style={{
                  ...styles.paymentBtn,
                  background: "#2563eb",
                  marginBottom: "12px"
                }}
              >
                📄 View Distributor Ledger
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/admin/distributors/${id}/payments`
                  )
                }
                style={styles.paymentBtn}
              >
                💰 Record Distributor Payment
              </button>

              <button
                onClick={sendWhatsAppReminder}
                style={styles.whatsappBtn}
              >
                Send WhatsApp Reminder
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}

// ======================================
// STYLES
// ======================================

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    position: "relative",
    padding: "28px 22px"
  },
  overlay: {
    display: "none"
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1240px",
    margin: "0 auto"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
    color: "#172033"
  },
  backBtn: {
    background: "#fff",
    color: "#334155",
    border: "1px solid #dbe3ee",
    padding: "9px 15px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 650
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 750,
    color: "#111827",
    letterSpacing: "-0.7px"
  },
  filterCard: {
    background: "#fff",
    padding: "14px 18px",
    border: "1px solid #e4eaf2",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px"
  },
  selectDropdown: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #d7e0eb",
    background: "#fff",
    color: "#172033",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer"
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "18px"
  },
  metricBox: {
    background: "#fff",
    padding: "20px 22px",
    border: "1px solid #e4eaf2",
    borderRadius: "13px",
    boxShadow: "0 2px 8px rgba(15,23,42,.04)"
  },
  metricTitle: {
    fontSize: "11px",
    textTransform: "uppercase",
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: ".05em",
    marginBottom: "9px"
  },
  metricValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#172033",
    letterSpacing: "-.5px"
  },
  metricSub: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "5px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 300px",
    gap: "18px",
    marginTop: "18px"
  },
  card: {
    background: "#fff",
    padding: "22px",
    border: "1px solid #e7edf4",
    borderRadius: "13px",
    boxShadow: "0 2px 10px rgba(15,23,42,.045)",
    marginBottom: "18px",
    minWidth: 0
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    fontWeight: "750",
    letterSpacing: ".035em",
    color: "#253247"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  thRow: {
    textAlign: "left",
    fontSize: "11px",
    color: "#64748b",
    borderBottom: "1px solid #e8edf3"
  },
  tr: {
    borderBottom: "1px solid #edf1f6"
  },
  td: {
    padding: "13px 10px",
    fontSize: "13px",
    borderBottom: "1px solid #edf1f6"
  },
  skuHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px"
  },
  skuActions: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px"
  },
  skuActionBtn: {
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #dce4ee",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "650",
    cursor: "pointer"
  },
  skuCheckboxContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px"
  },
  skuCheckboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155"
  },
  skuCheckbox: {
    width: "17px",
    height: "17px",
    cursor: "pointer",
    accentColor: "#2563eb"
  },
  skuTotalBox: {
    background: "#f1f6ff",
    border: "1px solid #dce8fb",
    padding: "18px",
    borderRadius: "11px",
    marginBottom: "20px"
  },
  skuTotalTitle: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "750",
    letterSpacing: ".05em"
  },
  skuTotalValue: {
    fontSize: "30px",
    fontWeight: "800",
    color: "#1d4ed8",
    marginTop: "4px"
  },
  skuTotalSub: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "3px"
  },
  skuBreakdownTitle: {
    color: "#334155",
    fontSize: "13px",
    margin: "0 0 10px",
    fontWeight: "700"
  },
  emptySku: {
    padding: "18px 12px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px"
  },
  cancelBadge: {
    display: "inline-block",
    background: "#fff1f2",
    color: "#be123c",
    padding: "3px 6px",
    borderRadius: "5px",
    fontSize: "9px",
    fontWeight: "800",
    marginTop: "4px"
  },
  sideCol: {
    minWidth: 0
  },
  paymentBtn: {
    width: "100%",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
    marginBottom: "10px",
    minHeight: "43px"
  },
  whatsappBtn: {
    width: "100%",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
    minHeight: "43px"
  },
  rateSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap"
  },
  rateDescription: {
    margin: "-7px 0 16px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.55
  },
  optionalBadge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "20px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px"
  },
  rateTableWrap: {
    width: "100%",
    overflowX: "auto"
  },
  rateInput: {
    width: "170px",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    border: "1px solid #d7e0eb",
    borderRadius: "8px",
    background: "#fff",
    color: "#0f172a",
    fontSize: "14px",
    textAlign: "right" as const
  },
  rateFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "16px"
  },
  rateHint: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.45
  },
  rateSaveBtn: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 18px",
    background: "#047857",
    color: "#fff",
    fontWeight: 700,
    fontSize: "13px",
    minHeight: "42px"
  },
  rateError: {
    marginTop: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: "13px"
  },
  rateSuccess: {
    marginTop: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#ecfdf5",
    color: "#047857",
    fontSize: "13px"
  },
  loader: {
    padding: "48px 20px",
    textAlign: "center",
    color: "#475569",
    fontSize: "14px"
  }
};
