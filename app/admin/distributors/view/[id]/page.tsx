
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
    <div style={styles.page}>
      <div style={styles.overlay} />

      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
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

        {/* MONTH FILTER */}
        <div style={styles.filterCard}>
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

        {/* FINANCIAL METRICS */}
        <div style={styles.metricsGrid}>
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
            <div style={styles.skuCheckboxContainer}>
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

          <table style={styles.table}>
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
        <div style={styles.grid}>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              Order History ({filteredOrders.length} Orders)
            </h3>

            <table style={styles.table}>
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
          <div style={styles.sideCol}>
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
  );
}

// ======================================
// STYLES
// ======================================

const styles: any = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/hero-deep.jpg')",
    backgroundSize: "cover",
    position: "relative",
    padding: "40px 20px"
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.85)"
  },

  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1100px",
    margin: "0 auto"
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
    color: "#fff"
  },

  backBtn: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer"
  },

  title: {
    margin: 0
  },

  filterCard: {
    background: "rgba(255,255,255,0.08)",
    padding: "16px 20px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    backdropFilter: "blur(10px)"
  },

  selectDropdown: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "#1e293b",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer"
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px"
  },

  metricBox: {
    background: "#fff",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
  },

  metricTitle: {
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#64748b",
    fontWeight: "600",
    marginBottom: "8px"
  },

  metricValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#1e293b"
  },

  metricSub: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "4px"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: "20px",
    marginTop: "20px"
  },

  card: {
    background: "#fff",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    marginBottom: "20px"
  },

  cardTitle: {
    margin: "0 0 20px 0",
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#64748b"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  thRow: {
    textAlign: "left",
    fontSize: "11px",
    color: "#94a3b8",
    borderBottom: "1px solid #eee"
  },

  tr: {
    borderBottom: "1px solid #fafafa"
  },

  td: {
    padding: "12px 0",
    fontSize: "14px",
    borderBottom: "1px solid #fafafa"
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
    gap: "10px",
    marginBottom: "20px"
  },

  skuActionBtn: {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "7px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer"
  },

  skuCheckboxContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "22px"
  },

  skuCheckboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155"
  },

  skuCheckbox: {
    width: "17px",
    height: "17px",
    cursor: "pointer"
  },

  skuTotalBox: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px"
  },

  skuTotalTitle: {
    fontSize: "12px",
    color: "#047857",
    fontWeight: "700",
    textTransform: "uppercase"
  },

  skuTotalValue: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#065f46",
    marginTop: "5px"
  },

  skuTotalSub: {
    fontSize: "12px",
    color: "#047857",
    marginTop: "5px"
  },

  skuBreakdownTitle: {
    fontSize: "13px",
    color: "#334155",
    marginBottom: "12px"
  },

  emptySku: {
    textAlign: "center",
    padding: "20px",
    color: "#94a3b8",
    fontSize: "13px"
  },

  cancelBadge: {
    display: "inline-block",
    marginTop: "5px",
    padding: "3px 8px",
    backgroundColor: "#fed7aa",
    color: "#9a3412",
    borderRadius: "5px",
    fontSize: "10px",
    fontWeight: 800
  },

  sideCol: {
    display: "flex",
    flexDirection: "column"
  },

  whatsappBtn: {
    width: "100%",
    background: "#25D366",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer"
  },

  loader: {
    color: "#fff",
    textAlign: "center",
    marginTop: "30vh"
  },

  paymentBtn: {
    width: "100%",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "12px"
  }
};
