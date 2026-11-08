
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Category =
  | "raw_material"
  | "electricity"
  | "production_labour"
  | "other_manufacturing"
  | "staff_salary";

type Payment = {
  payment_id: string;
  order_id: string;
  order_number: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  transaction_id?: string;
  note?: string;
  order_amount: number;
  total_received_for_order: number;
  actual_cost_available: boolean;
  costing_boxes: number;
  recommended: Record<Category, number>;
  recommended_total: number;
};

type FundData = {
  payments: Payment[];
  daily_totals: any[];
  totals: Record<string, any>;
  summary: Record<string, number>;
  transactions: any[];
};

const CATEGORY_LABELS: Record<Category, string> = {
  raw_material: "Raw Material",
  electricity: "Electricity Bill",
  production_labour: "Factory Labour",
  other_manufacturing: "Other Factory Costs",
  staff_salary: "Other Staff Salaries",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN");
}

export default function FundAllocationPage() {
  const today = localDate();

  const [data, setData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [action, setAction] = useState<
    "set_aside" | "expense_paid"
  >("set_aside");

  const [category, setCategory] =
    useState<Category>("raw_material");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null);

  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const response = await fetch(
        `/api/admin/fund-allocation?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );

      const text = await response.text();

      let result: any;

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid API response (${response.status}). Check your API route.`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load data");
      }

      setData(result);
    } catch (e: any) {
      console.error("Fund allocation:", e);
      setError(e.message || "Unable to load payment information");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = data?.summary || {};

  const dailyTotals = data?.daily_totals || [];
  const payments = data?.payments || [];
  const transactions = data?.transactions || [];

  const periodTotals = useMemo(() => {
    const result: Record<Category, number> = {
      raw_material: 0,
      electricity: 0,
      production_labour: 0,
      other_manufacturing: 0,
      staff_salary: 0,
    };

    payments.forEach((payment) => {
      CATEGORIES.forEach((key) => {
        result[key] += Number(payment.recommended?.[key] || 0);
      });
    });

    return result;
  }, [payments]);

  const totalToKeep = CATEGORIES.reduce(
    (sum, key) => sum + periodTotals[key],
    0
  );

  async function saveEntry() {
    setError("");
    setSuccess("");

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (
      selectedPayment &&
      !selectedPayment.actual_cost_available &&
      action === "set_aside"
    ) {
      setError(
        "Actual costing is not available for this order. Check the costing before recording its reserve."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/fund-allocation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action,
          category,
          amount: value,
          payment_id: selectedPayment?.payment_id || null,
          order_id: selectedPayment?.order_id || null,
          description: description.trim(),
        }),
      });

      const text = await response.text();
      let result: any;

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Invalid response while saving the entry.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save entry");
      }

      setAmount("");
      setDescription("");
      setSelectedPayment(null);
      setSuccess("Entry saved successfully.");

      await loadData();
    } catch (e: any) {
      setError(e.message || "Unable to save entry");
    } finally {
      setSaving(false);
    }
  }

  function selectPayment(payment: Payment) {
    setSelectedPayment(payment);
    setAction("set_aside");
    setCategory("raw_material");
    setDescription(
      `Reserve for order ${payment.order_number}`
    );
    setAmount("");
  }

  function setToday() {
    const date = localDate();
    setFromDate(date);
    setToDate(date);
  }

  function setYesterday() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yesterday = localDate(date);
    setFromDate(yesterday);
    setToDate(yesterday);
  }

  function setThisMonth() {
    const date = new Date();
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    setFromDate(localDate(first));
    setToDate(localDate());
  }

  function setAllDates() {
    setFromDate("");
    setToDate("");
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <div style={s.eyebrow}>EARTHY SOURCE · FINANCE</div>
          <h1 style={s.title}>Money Management</h1>
          <p style={s.subtitle}>
            Track every payment and calculate how much to keep aside.
          </p>
        </div>

        <button style={s.button} onClick={loadData}>
          Refresh
        </button>
      </header>

      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.success}>{success}</div>}

      {/* DATE FILTER */}
      <section style={s.panel}>
        <h2 style={s.heading}>Select Date Recordeds</h2>

        <div style={s.filterGrid}>
          <div>
            <label style={s.label}>From Date</label>
            <input
              style={s.input}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label style={s.label}>To Date</label>
            <input
              style={s.input}
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div style={s.quickFilters}>
          <button style={s.secondaryButton} onClick={setToday}>
            Today
          </button>
          <button style={s.secondaryButton} onClick={setYesterday}>
            Yesterday
          </button>
          <button style={s.secondaryButton} onClick={setThisMonth}>
            This Month
          </button>
          <button style={s.secondaryButton} onClick={setAllDates}>
            All Dates
          </button>
        </div>

        <p style={s.hint}>
          The selected dates filter payment receipts and the daily reserve totals.
        </p>
      </section>

      {loading && (
        <div style={s.loading}>Loading payment records...</div>
      )}

      {!loading && data && (
        <>
          {/* SUMMARY CARDS */}
          <section style={s.cards}>
            <Metric
              label="Total Payments Recorded"
              value={money(summary.total_received)}
            />
            <Metric
              label="Amount to Keep Aside"
              value={money(totalToKeep)}
            />
            <Metric
              label="Amount Kept Aside"
              value={money(summary.total_set_aside)}
            />
            <Metric
              label="Money Spent"
              value={money(summary.total_expenses_paid)}
            />
            <Metric
              label="Cash Remaining"
              value={money(summary.cash_remaining)}
            />
            <Metric
              label="Payment Entries"
              value={String(payments.length)}
            />
          </section>

          {/* CATEGORY SUMMARY */}
          <section style={s.panel}>
            <h2 style={s.heading}>
              Amount to Keep Aside by Category
            </h2>

            <div style={s.categoryGrid}>
              {CATEGORIES.map((key) => (
                <div key={key} style={s.categoryCard}>
                  <div style={s.categoryName}>
                    {CATEGORY_LABELS[key]}
                  </div>
                  <div style={s.categoryAmount}>
                    {money(periodTotals[key])}
                  </div>
                </div>
              ))}
            </div>

            <div style={s.totalBanner}>
              <span>Total Amount to Keep Aside</span>
              <strong>{money(totalToKeep)}</strong>
            </div>
          </section>

          {/* DAILY SUMMARY */}
          <section style={s.panel}>
            <h2 style={s.heading}>
              Daily Payment & Reserve Summary
            </h2>

            <p style={s.subtitle}>
              Each row totals the payments recorded and the recommended amount
              to keep aside on that date.
            </p>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Payments</th>
                    <th style={s.th}>Received</th>
                    <th style={s.th}>Raw Material</th>
                    <th style={s.th}>Electricity</th>
                    <th style={s.th}>Factory Labour</th>
                    <th style={s.th}>Other Costs</th>
                    <th style={s.th}>Total to Keep</th>
                    <th style={s.th}>Costing Pending</th>
                  </tr>
                </thead>

                <tbody>
                  {dailyTotals.map((row: any) => (
                    <tr key={row.date}>
                      <td style={s.td}>
                        <strong>{displayDate(row.date)}</strong>
                      </td>
                      <td style={s.td}>{row.payments_count}</td>
                      <td style={s.td}>{money(row.received)}</td>
                      <td style={s.td}>{money(row.raw_material)}</td>
                      <td style={s.td}>{money(row.electricity)}</td>
                      <td style={s.td}>
                        {money(row.production_labour)}
                      </td>
                      <td style={s.td}>
                        {money(row.other_manufacturing)}
                      </td>
                      <td style={s.td}>
                        <strong>{money(row.total_to_keep)}</strong>
                      </td>
                      <td style={s.td}>
                        {Number(row.costing_pending_count || 0) > 0 ? (
                          <span style={s.warning}>
                            {row.costing_pending_count} pending
                          </span>
                        ) : (
                          <span style={s.good}>Complete</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {dailyTotals.length === 0 && (
                    <tr>
                      <td style={s.empty} colSpan={9}>
                        No payment records found for these dates.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PAYMENT REGISTER */}
          <section style={s.panel}>
            <h2 style={s.heading}>
              All Payment Entries
            </h2>

            <p style={s.subtitle}>
              Each payment entry is shown separately, including instalments
              received against the same order.
            </p>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Date Recorded</th>
                    <th style={s.th}>Order Number</th>
                    <th style={s.th}>Payment Mode</th>
                    <th style={s.th}>Amount Received</th>
                    <th style={s.th}>Raw Material</th>
                    <th style={s.th}>Electricity</th>
                    <th style={s.th}>Factory Labour</th>
                    <th style={s.th}>Other Costs</th>
                    <th style={s.th}>Total to Keep</th>
                    <th style={s.th}>Costing</th>
                    <th style={s.th}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.payment_id}>
                      <td style={s.td}>
                        {displayDate(payment.payment_date)}
                      </td>

                      <td style={s.td}>
                        <strong style={s.orderNumber}>
                          {payment.order_number}
                        </strong>
                      </td>

                      <td style={s.td}>
                        {payment.payment_method || "-"}
                      </td>

                      <td style={s.td}>
                        <strong>
                          {money(payment.payment_amount)}
                        </strong>
                      </td>

                      <td style={s.td}>
                        {money(payment.recommended.raw_material)}
                      </td>

                      <td style={s.td}>
                        {money(payment.recommended.electricity)}
                      </td>

                      <td style={s.td}>
                        {money(payment.recommended.production_labour)}
                      </td>

                      <td style={s.td}>
                        {money(payment.recommended.other_manufacturing)}
                      </td>

                      <td style={s.td}>
                        <strong>
                          {money(payment.recommended_total)}
                        </strong>
                      </td>

                      <td style={s.td}>
                        {payment.actual_cost_available ? (
                          <span style={s.good}>Available</span>
                        ) : (
                          <span style={s.warning}>Pending</span>
                        )}
                      </td>

                      <td style={s.td}>
                        <button
                          style={s.smallButton}
                          onClick={() => selectPayment(payment)}
                        >
                          Add Entry
                        </button>
                      </td>
                    </tr>
                  ))}

                  {payments.length === 0 && (
                    <tr>
                      <td style={s.empty} colSpan={11}>
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>

                {payments.length > 0 && (
                  <tfoot>
                    <tr>
                      <td style={s.footerCell} colSpan={3}>
                        TOTAL
                      </td>
                      <td style={s.footerCell}>
                        {money(summary.total_received)}
                      </td>
                      <td style={s.footerCell}>
                        {money(periodTotals.raw_material)}
                      </td>
                      <td style={s.footerCell}>
                        {money(periodTotals.electricity)}
                      </td>
                      <td style={s.footerCell}>
                        {money(periodTotals.production_labour)}
                      </td>
                      <td style={s.footerCell}>
                        {money(periodTotals.other_manufacturing)}
                      </td>
                      <td style={s.footerCell}>
                        {money(totalToKeep)}
                      </td>
                      <td style={s.footerCell} colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          {/* ADD ENTRY */}
          <section style={s.panel}>
            <h2 style={s.heading}>Record Money Kept or Spent</h2>

            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Entry Type</label>
                <select
                  style={s.input}
                  value={action}
                  onChange={(e) =>
                    setAction(
                      e.target.value as "set_aside" | "expense_paid"
                    )
                  }
                >
                  <option value="set_aside">Money Kept Aside</option>
                  <option value="expense_paid">Money Actually Spent</option>
                </select>
              </div>

              <div>
                <label style={s.label}>Category</label>
                <select
                  style={s.input}
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Category)
                  }
                >
                  {CATEGORIES.map((key) => (
                    <option key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={s.label}>Amount (₹)</label>
                <input
                  style={s.input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label style={s.label}>Description</label>
                <input
                  style={s.input}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: Preform purchase"
                />
              </div>
            </div>

            {selectedPayment && (
              <div style={s.selected}>
                Linked Order: <strong>{selectedPayment.order_number}</strong>
                {" · "}
                Payment:{" "}
                <strong>{money(selectedPayment.payment_amount)}</strong>
                {" · "}
                Reserve:{" "}
                <strong>{money(selectedPayment.recommended_total)}</strong>
                <button
                  style={s.clearButton}
                  onClick={() => setSelectedPayment(null)}
                >
                  Clear
                </button>
              </div>
            )}

            <button
              style={s.button}
              onClick={saveEntry}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </section>

          {/* TRANSACTION HISTORY */}
          <section style={s.panel}>
            <h2 style={s.heading}>Recent Entries</h2>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Entry Type</th>
                    <th style={s.th}>Category</th>
                    <th style={s.th}>Description</th>
                    <th style={s.th}>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.slice(0, 100).map((row: any) => (
                    <tr key={row.id}>
                      <td style={s.td}>
                        {displayDate(row.expense_date || row.created_at)}
                      </td>
                      <td style={s.td}>
                        {row.transaction_type === "set_aside"
                          ? "Money Kept Aside"
                          : "Money Spent"}
                      </td>
                      <td style={s.td}>
                        {CATEGORY_LABELS[row.category as Category] ||
                          row.category}
                      </td>
                      <td style={s.td}>
                        {row.description || "-"}
                      </td>
                      <td style={s.td}>
                        <strong>{money(row.amount)}</strong>
                      </td>
                    </tr>
                  ))}

                  {transactions.length === 0 && (
                    <tr>
                      <td style={s.empty} colSpan={5}>
                        No entries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={s.metric}>
      <div style={s.metricLabel}>{label}</div>
      <div style={s.metricValue}>{value}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "30px clamp(14px, 3vw, 38px)",
    background: "#f3f6f8",
    color: "#172b3a",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 18, margin: "0 auto 26px", maxWidth: 1540,
  },
  eyebrow: {
    color: "#087f68", fontSize: 11, fontWeight: 800,
    letterSpacing: 2.1, textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(25px, 3vw, 32px)", fontWeight: 850,
    letterSpacing: "-0.9px", color: "#132f43", margin: "9px 0 5px",
  },
  subtitle: { color: "#718397", fontSize: 13, lineHeight: 1.65, margin: "6px 0 15px" },
  panel: {
    maxWidth: 1540, margin: "0 auto 22px", padding: "clamp(17px, 2.2vw, 25px)",
    background: "#fff", border: "1px solid #e4ebf0", borderRadius: 16,
    boxShadow: "0 5px 22px rgba(21, 48, 67, 0.045)",
  },
  heading: { fontSize: 18, fontWeight: 800, color: "#18364a", letterSpacing: "-0.25px", margin: "0 0 15px" },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 15, maxWidth: 680 },
  quickFilters: { display: "flex", flexWrap: "wrap", gap: 9, marginTop: 15 },
  hint: { color: "#8493a3", fontSize: 12, marginTop: 13, lineHeight: 1.5 },
  label: { display: "block", fontSize: 12, fontWeight: 750, marginBottom: 7, color: "#52677a" },
  input: {
    width: "100%", boxSizing: "border-box", border: "1px solid #d9e3ea",
    padding: "11px 12px", borderRadius: 9, background: "#fbfcfd",
    color: "#203b4f", fontSize: 13, outline: "none",
  },
  cards: { maxWidth: 1540, margin: "0 auto 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14 },
  metric: { background: "#fff", border: "1px solid #e4ebf0", borderTop: "3px solid #07856d", borderRadius: 13, padding: "18px 19px", boxShadow: "0 4px 16px rgba(21,48,67,.035)" },
  metricLabel: { fontSize: 12, color: "#74879a", fontWeight: 650, lineHeight: 1.4 },
  metricValue: { fontSize: 22, fontWeight: 850, letterSpacing: "-0.5px", color: "#17364b", marginTop: 11 },
  categoryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12 },
  categoryCard: { background: "#f8fafb", border: "1px solid #e8eef2", borderRadius: 11, padding: 16 },
  categoryName: { color: "#6e8294", fontSize: 12, fontWeight: 700 },
  categoryAmount: { fontSize: 20, fontWeight: 850, color: "#19384c", marginTop: 10 },
  totalBanner: { marginTop: 17, padding: "17px 19px", background: "#eaf8f3", color: "#08765f", border: "1px solid #d4eee4", borderRadius: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 14, fontWeight: 750 },
  tableWrap: { width: "100%", overflowX: "auto", border: "1px solid #e8edf1", borderRadius: 10 },
  table: { width: "100%", minWidth: 1120, borderCollapse: "separate", borderSpacing: 0, fontSize: 12, background: "#fff" },
  th: { background: "#f4f7f9", color: "#52687b", padding: "13px 12px", textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #e4ebf0", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".45px" },
  td: { padding: "13px 12px", borderBottom: "1px solid #edf1f4", whiteSpace: "nowrap", color: "#40576a", fontSize: 12 },
  footerCell: { padding: "14px 12px", background: "#f2f6f8", color: "#17364b", fontWeight: 850, whiteSpace: "nowrap", borderTop: "1px solid #e2eaf0" },
  empty: { padding: 30, textAlign: "center", color: "#8998a7", fontSize: 13 },
  button: { border: "1px solid #087b65", background: "#087f68", color: "#fff", padding: "11px 19px", borderRadius: 9, cursor: "pointer", fontWeight: 750, fontSize: 13, boxShadow: "0 4px 10px rgba(8,127,104,.14)" },
  secondaryButton: { border: "1px solid #dbe4ea", background: "#fff", color: "#52697c", padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  smallButton: { border: "1px solid #cce9df", background: "#eff9f5", color: "#08765f", padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontWeight: 750, fontSize: 11 },
  clearButton: { marginLeft: 14, border: "1px solid #d8e2e9", background: "#fff", color: "#52697c", padding: "6px 10px", borderRadius: 7, cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 15, marginBottom: 18 },
  selected: { padding: 15, background: "#eff9f5", border: "1px solid #d5eee4", color: "#176c58", borderRadius: 10, marginBottom: 16, fontSize: 13 },
  orderNumber: { color: "#087f68", fontWeight: 850 },
  good: { display: "inline-block", color: "#08765f", background: "#eaf8f3", padding: "5px 9px", borderRadius: 20, fontSize: 10, fontWeight: 850 },
  warning: { display: "inline-block", color: "#9a5a12", background: "#fff5e6", padding: "5px 9px", borderRadius: 20, fontSize: 10, fontWeight: 850 },
  error: { padding: 14, background: "#fff0ef", color: "#ad332b", border: "1px solid #f7d6d3", borderRadius: 10, marginBottom: 18, fontSize: 13 },
  success: { padding: 14, background: "#eaf8f3", color: "#08765f", border: "1px solid #d4eee4", borderRadius: 10, marginBottom: 18, fontSize: 13 },
  loading: { padding: 30, textAlign: "center", color: "#718397", fontSize: 13 },
};
