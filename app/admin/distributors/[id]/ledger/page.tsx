
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Payment = {
  id: string;
  order_id: string;
  order_number: string;
  amount: number;
  created_at: string;
  payment_method: string;
  note?: string;
  transaction_id?: string;
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: "28px 18px",
    color: "#0f172a",
  },
  container: { maxWidth: "1200px", margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "22px",
  },
  title: { margin: 0, fontSize: "26px", fontWeight: 800 },
  subtitle: { color: "#64748b", marginTop: "6px", fontSize: "14px" },
  button: {
    border: "none",
    borderRadius: "8px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
    gap: "14px",
    padding: "18px",
    background: "#fff",
    borderRadius: "12px",
    marginBottom: "18px",
    boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    fontSize: "13px",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "#fff",
    color: "#0f172a",
    fontSize: "14px",
  },
  summary: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "18px",
    boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  total: {
    fontSize: "30px",
    fontWeight: 800,
    color: "#15803d",
    marginTop: "7px",
  },
  tableCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "18px",
    overflowX: "auto",
    boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1050px",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "13px 10px",
    background: "#f8fafc",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 10px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  },
};

function formatDateTime(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
}

function getLocalDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown-date";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeMethod(value: string) {
  const method = (value || "").toLowerCase().replace(/[_-]/g, " ").trim();

  if (method === "upi") return "UPI";
  if (method === "cash") return "Cash";

  if (
    method === "bank transfer" ||
    method === "banktransfer" ||
    method === "neft" ||
    method === "rtgs" ||
    method === "imps"
  ) {
    return "Bank Transfer";
  }

  return value || "Not specified";
}

export default function DistributorLedgerPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [distributorName, setDistributorName] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");

  const loadLedger = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/distributors/${encodeURIComponent(id)}/ledger`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!res.ok || !json.data) {
        throw new Error(json.error || "Failed to load ledger");
      }

      setDistributorName(json.data.distributorName || "Distributor");
      setPayments(json.data.payments || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Network error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Filter and sort transactions newest first.
  const filteredPayments = useMemo(() => {
    return payments
      .filter((payment) => {
        const date = new Date(payment.created_at);
        if (Number.isNaN(date.getTime())) return false;

        const day = getLocalDateKey(payment.created_at);

        if (startDate && day < startDate) return false;
        if (endDate && day > endDate) return false;

        if (
          orderSearch.trim() &&
          !(payment.order_number || "")
            .toLowerCase()
            .includes(orderSearch.trim().toLowerCase())
        ) {
          return false;
        }

        if (
          paymentMethod !== "all" &&
          normalizeMethod(payment.payment_method) !== paymentMethod
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }, [payments, startDate, endDate, orderSearch, paymentMethod]);

  const totalReceived = useMemo(
    () =>
      filteredPayments.reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
      ),
    [filteredPayments]
  );

  // Calculate daily totals for the currently filtered records.
  const dailyTotals = useMemo(() => {
    const totals = new Map<string, number>();

    filteredPayments.forEach((payment) => {
      const dateKey = getLocalDateKey(payment.created_at);

      totals.set(
        dateKey,
        (totals.get(dateKey) || 0) + Number(payment.amount || 0)
      );
    });

    return totals;
  }, [filteredPayments]);

  // PDF export.
  const downloadPDF = () => {
    if (!filteredPayments.length) {
      alert("There are no payment records to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const displayedDates = new Set<string>();

    const tableRows = filteredPayments.map((payment) => {
      const dateKey = getLocalDateKey(payment.created_at);
      const isFirstEntryForDate = !displayedDates.has(dateKey);

      displayedDates.add(dateKey);

      return [
        formatDateShort(payment.created_at),
        distributorName,
        payment.order_number || "—",
        formatMoney(Number(payment.amount || 0)),
        normalizeMethod(payment.payment_method),
        isFirstEntryForDate
          ? formatMoney(dailyTotals.get(dateKey) || 0)
          : "",
      ];
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("EARTHY SOURCE", 14, 15);

    doc.setFontSize(13);
    doc.text("Distributor Payment Ledger", 14, 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Distributor: ${distributorName}`, 14, 31);
    doc.text(
      `Period: ${startDate || "Beginning"} to ${endDate || "Present"}`,
      14,
      37
    );
    doc.text(
      `Payment method: ${
        paymentMethod === "all" ? "All methods" : paymentMethod
      }`,
      14,
      43
    );
    doc.text(`Transactions: ${filteredPayments.length}`, 14, 49);

    doc.setFont("helvetica", "bold");
    doc.text(`Total received: ${formatMoney(totalReceived)}`, 14, 55);

    autoTable(doc, {
      startY: 61,
      head: [[
        "Date",
        "Distributor Name",
        "Order Number",
        "Payment Received",
        "Payment Method",
        "Daily Total Received",
      ]],
      body: tableRows,
      foot: [[
        "Grand Total",
        "",
        "",
        formatMoney(totalReceived),
        "",
        "",
      ]],
      showFoot: "lastPage",
      theme: "grid",
      margin: { left: 10, right: 10, bottom: 12 },
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [22, 101, 52],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      footStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 43 },
        2: { cellWidth: 42 },
        3: { cellWidth: 37, halign: "right" },
        4: { cellWidth: 32 },
        5: { cellWidth: 43, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [21, 128, 61];
        }

        if (data.section === "foot") {
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: () => {
        const pageNumber = doc.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);

        doc.text(
          `Earthy Source | Distributor Ledger | Page ${pageNumber}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      },
    });

    const safeName =
      distributorName.replace(/[^a-z0-9-_]/gi, "_") || "Distributor";

    doc.save(`EarthySource_Ledger_${safeName}.pdf`);
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Distributor Ledger</h1>
            <div style={styles.subtitle}>
              {distributorName || "Loading distributor..."} · Payment history
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              style={{
                ...styles.button,
                background: "#e2e8f0",
                color: "#0f172a",
              }}
              onClick={() => router.push(`/admin/distributors/view/${id}`)}
            >
              ← Back to Distributor
            </button>

            <button
              style={{
                ...styles.button,
                background: "#15803d",
                color: "#fff",
              }}
              onClick={downloadPDF}
              disabled={loading || !!error || filteredPayments.length === 0}
            >
              ↓ Download PDF
            </button>
          </div>
        </header>

        <section style={styles.filters}>
          <label style={styles.field}>
            From date
            <input
              style={styles.input}
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label style={styles.field}>
            To date
            <input
              style={styles.input}
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <label style={styles.field}>
            Order number
            <input
              style={styles.input}
              type="text"
              placeholder="Search order number"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </label>

          <label style={styles.field}>
            Payment method
            <select
              style={styles.input}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="all">All methods</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button
              style={{
                ...styles.button,
                background: "#e2e8f0",
                color: "#0f172a",
                width: "100%",
              }}
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setOrderSearch("");
                setPaymentMethod("all");
              }}
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section style={styles.summary}>
          <div style={styles.summaryLabel}>
            Total Payment Received · Filtered Records
          </div>
          <div style={styles.total}>{formatMoney(totalReceived)}</div>
          <div
            style={{
              color: "#64748b",
              fontSize: "13px",
              marginTop: "5px",
            }}
          >
            {filteredPayments.length} transaction(s)
          </div>
        </section>

        {loading ? (
          <div>Loading distributor ledger...</div>
        ) : error ? (
          <div style={{ color: "#b91c1c", padding: "15px 0" }}>
            {error}
            <button
              style={{ ...styles.button, marginLeft: "12px" }}
              onClick={loadLedger}
            >
              Retry
            </button>
          </div>
        ) : (
          <section style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Distributor Name</th>
                  <th style={styles.th}>Order Number</th>
                  <th style={styles.th}>Payment Received</th>
                  <th style={styles.th}>Date and Time</th>
                  <th style={styles.th}>Payment Method</th>
                  <th style={styles.th}>Daily Total Received</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment, index) => {
                    const dateKey = getLocalDateKey(payment.created_at);

                    const isFirstEntryForDate =
                      index === 0 ||
                      getLocalDateKey(
                        filteredPayments[index - 1].created_at
                      ) !== dateKey;

                    return (
                      <tr key={payment.id}>
                        <td style={styles.td}>{distributorName}</td>

                        <td style={styles.td}>
                          {payment.order_number || "—"}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 700,
                            color: "#15803d",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(Number(payment.amount || 0))}
                        </td>

                        <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                          {formatDateTime(payment.created_at)}
                        </td>

                        <td style={styles.td}>
                          {normalizeMethod(payment.payment_method)}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 700,
                            color: "#15803d",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isFirstEntryForDate
                            ? formatMoney(dailyTotals.get(dateKey) || 0)
                            : ""}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: "28px",
                        color: "#64748b",
                      }}
                      colSpan={6}
                    >
                      No payment transactions found for these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
