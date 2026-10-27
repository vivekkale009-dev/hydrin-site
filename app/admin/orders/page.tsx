
"use client";

import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkExiting, setBulkExiting] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [vans, setVans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [vanFilter, setVanFilter] = useState("all");

  // Only eligible orders can be selected for bulk exit
  const canSelectForExit = (order: any) =>
    !order.exit_confirmed_at &&
    order.status !== "delivered" &&
    order.status !== "cancelled";

  useEffect(() => {
    fetchOrders();
    fetchVans();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();

      filtered = filtered.filter(
        (o) =>
          o.uorn?.toLowerCase().includes(q) ||
          o.distributor_name?.toLowerCase().includes(q) ||
          o.billing_name?.toLowerCase().includes(q) ||
          o.billing_address?.toLowerCase().includes(q) ||
          o.distributor_phone?.includes(q) ||
          o.order_number?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (methodFilter !== "all") {
      filtered = filtered.filter(
        (o) => o.payment_method === methodFilter
      );
    }

    if (vanFilter !== "all") {
      filtered = filtered.filter((o) => o.van_id === vanFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((o) =>
        o.created_at?.startsWith(dateFilter)
      );
    }

    setFilteredOrders(filtered);
  }, [
    searchTerm,
    statusFilter,
    methodFilter,
    dateFilter,
    vanFilter,
    orders,
  ]);

  async function fetchOrders() {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/orders?t=${Date.now()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Unable to fetch orders");
      }

      if (json.data) {
        setOrders(json.data);

        // Remove selections that are no longer eligible
        setSelectedOrders((prev) =>
          prev.filter((id) => {
            const order = json.data.find(
              (o: any) => o.id === id
            );

            return order && canSelectForExit(order);
          })
        );
      }
    } catch (error) {
      console.error("Fetch orders error:", error);
      alert("Unable to load orders. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchVans() {
    try {
      const res = await fetch("/api/admin/vans");
      const json = await res.json();

      if (json.data) {
        setVans(json.data);
      }
    } catch (error) {
      console.error("Fetch vans error:", error);
    }
  }

  const handleRowClick = (id: string) => {
    window.location.href = `/admin/orders/view/${id}`;
  };

  const toggleOrderSelection = (order: any) => {
    if (!canSelectForExit(order)) return;

    setSelectedOrders((prev) =>
      prev.includes(order.id)
        ? prev.filter((id) => id !== order.id)
        : [...prev, order.id]
    );
  };

  const toggleSelectAll = () => {
    const eligibleIds = filteredOrders
      .filter(canSelectForExit)
      .map((order) => order.id);

    const allSelected =
      eligibleIds.length > 0 &&
      eligibleIds.every((id) => selectedOrders.includes(id));

    setSelectedOrders((prev) =>
      allSelected
        ? prev.filter((id) => !eligibleIds.includes(id))
        : [...new Set([...prev, ...eligibleIds])]
    );
  };


const handleBulkExit = async () => {
  if (selectedOrders.length === 0 || bulkExiting) return;

  const eligible = orders.filter(
    (order) =>
      selectedOrders.includes(order.id) &&
      canSelectForExit(order)
  );

  if (eligible.length === 0) {
    setSelectedOrders([]);
    alert("No eligible orders selected. Refresh and try again.");
    return;
  }

  const confirmed = window.confirm(
    `Confirm vehicle exit for ${eligible.length} orders?\n\n` +
      eligible.map((o) => o.uorn).join("\n") +
      "\n\nThis will mark orders delivered and update inventory."
  );

  if (!confirmed) return;

  setBulkExiting(true);

  try {
    const response = await fetch(
      "/api/gate-pass/bulk-confirm-exit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: eligible.map((o) => o.id),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Bulk exit failed.");
    }

    const messages = (result.results || []).map(
      (r: any) => {
        const order = eligible.find((o) => o.id === r.id);
        const label = order?.uorn || r.id;

        return `${r.success ? "SUCCESS" : "FAILED"}: ${label} — ${r.message}`;
      }
    );

    alert(
      `Bulk exit completed.\nSuccessful: ${result.succeeded}\nFailed: ${result.failed}\n\n` +
        messages.join("\n")
    );

    setSelectedOrders([]);
    await fetchOrders();
  } catch (error: any) {
    alert(error.message || "Unable to process bulk vehicle exit.");
    await fetchOrders();
  } finally {
    setBulkExiting(false);
  }
};


  const handleGatePass = (
    e: React.MouseEvent,
    order: any
  ) => {
    e.stopPropagation();

    if (order.exit_confirmed_at) {
      alert(
        `⛔ SECURITY LOCKDOWN\nVehicle already exited at ${new Date(
          order.exit_confirmed_at
        ).toLocaleString()}`
      );
      return;
    }

    if (
      order.status === "cancelled" ||
      order.status === "delivered"
    ) {
      alert("This order is not eligible for a gate pass.");
      return;
    }

    window.open(
      `/api/admin/orders/${order.id}/gate-pass?t=${Date.now()}`,
      "_blank"
    );

    setTimeout(() => {
      fetchOrders();
    }, 2500);
  };

  const sendWhatsappQR = (
    e: React.MouseEvent,
    order: any
  ) => {
    e.stopPropagation();

    if (order.exit_confirmed_at) {
      alert("⛔ CANNOT SEND\n\nVehicle already exited.");
      return;
    }

    if (
      order.status === "cancelled" ||
      order.status === "delivered"
    ) {
      alert("This order is not eligible for a gate pass.");
      return;
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, "");

    if (cleanNumber.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    const qrDisplayUrl =
      `${window.location.origin}/qr/${order.id}`;

    const message =
      `*EARTHY SOURCE - DIGITAL PASS*%0A%0A` +
      `*Order:* ${order.uorn}%0A` +
      `*Status:* Ready%0A%0A` +
      `*CLICK TO OPEN YOUR QR PASS:* ${qrDisplayUrl}`;

    window.open(
      `https://wa.me/91${cleanNumber}?text=${message}`,
      "_blank"
    );
  };

  const eligibleCount = filteredOrders.filter(
    canSelectForExit
  ).length;

  const allEligibleSelected =
    eligibleCount > 0 &&
    filteredOrders
      .filter(canSelectForExit)
      .every((o) => selectedOrders.includes(o.id));

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <h1 style={{ color: "#fff", margin: 0 }}>
            Order Management
          </h1>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              style={{
                ...styles.input,
                width: "180px",
                height: "40px",
              }}
              placeholder="WhatsApp Number..."
              value={whatsappNumber}
              onChange={(e) =>
                setWhatsappNumber(e.target.value)
              }
            />

            <button
              onClick={() =>
                (window.location.href = "/admin/orders/create")
              }
              style={styles.createBtn}
            >
              + New Order
            </button>
          </div>
        </div>

        {/* Bulk Vehicle Exit */}
        <div style={styles.bulkBar}>
          <button
            disabled={
              selectedOrders.filter((id) =>
                orders.some(
                  (o) => o.id === id && canSelectForExit(o)
                )
              ).length === 0 || bulkExiting
            }
            onClick={handleBulkExit}
            style={{
              ...styles.bulkBtn,
              background:
                selectedOrders.length === 0 || bulkExiting
                  ? "#999"
                  : "#dc3545",
              cursor:
                selectedOrders.length === 0 || bulkExiting
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {bulkExiting
              ? "Processing..."
              : `Bulk Vehicle Exit (${selectedOrders.filter((id) =>
                  orders.some(
                    (o) =>
                      o.id === id && canSelectForExit(o)
                  )
                ).length})`}
          </button>

          <span style={{ color: "#fff", fontSize: 13 }}>
            Already-exited, delivered and cancelled orders
            cannot be selected.
          </span>
        </div>

        {/* Filters */}
        <div style={styles.filterGrid}>
          <input
            style={styles.input}
            placeholder="Search UORN, Name, Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            style={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending_verification">
              Pending Verification
            </option>
            <option value="payment_verified">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
            <option value="delivered">Delivered</option>
          </select>

          <select
            style={styles.input}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="credit">Credit</option>
          </select>

          <input
            type="date"
            style={styles.input}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* Orders Table */}
        <div style={styles.tableCard}>
          {loading ? (
            <p style={{ padding: 20 }}>Loading orders...</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      checked={allEligibleSelected}
                      disabled={eligibleCount === 0}
                      onChange={toggleSelectAll}
                      title="Select all eligible orders"
                    />
                  </th>

                  <th style={styles.th}>Order Details</th>
                  <th style={styles.th}>Distributor</th>
                  <th style={styles.th}>Customer Name</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Payable</th>
                  <th style={styles.th}>Pending</th>
                  <th style={styles.th}>GST Required</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const eligible = canSelectForExit(order);

                  return (
                    <tr
                      key={order.id}
                      style={styles.tr}
                      onClick={() => handleRowClick(order.id)}
                    >
                      {/* Selection Checkbox */}
                      <td
                        style={styles.td}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          disabled={!eligible}
                          onChange={() =>
                            toggleOrderSelection(order)
                          }
                          title={
                            eligible
                              ? "Select for bulk vehicle exit"
                              : "Already exited or ineligible"
                          }
                        />
                      </td>

                      {/* Order Details */}
                      <td style={styles.td}>
                        <div
                          style={{
                            fontWeight: "bold",
                            color: "#007bff",
                          }}
                        >
                          {order.uorn}
                        </div>

                        <div
                          style={{ fontSize: 11, color: "#666" }}
                        >
                          {order.order_number}
                        </div>
                      </td>

                      {/* Distributor */}
                      <td style={styles.td}>
                        <div>{order.distributor_name}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                          }}
                        >
                          {order.distributor_phone}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={styles.td}>
                        <div>{order.billing_name}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                          }}
                        >
                          {order.billing_address}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                          }}
                        >
                          {order.phone}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={styles.td}>
                        <span
                          style={getStatusBadge(order.status)}
                        >
                          {order.status?.replace("_", " ")}
                        </span>
                      </td>

                      <td style={styles.td}>
                        ₹{order.total_payable_amount}
                      </td>

                      <td style={styles.td}>
                        ₹{order.pending_amount}
                      </td>

                      {/* GST */}
                      <td style={styles.td}>
                        <span
                          style={{
                            color: order.is_gst
                              ? "#28a745"
                              : "#dc3545",
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          {order.is_gst ? "✅ YES" : "❌ NO"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={styles.td}>
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                          }}
                        >
                          <button
                            onClick={(e) =>
                              handleGatePass(e, order)
                            }
                            disabled={!eligible}
                            style={{
                              ...styles.gatePassBtn,
                              background: eligible
                                ? "#f39c12"
                                : "#ccc",
                              cursor: eligible
                                ? "pointer"
                                : "not-allowed",
                            }}
                            title="Print GP"
                          >
                            🚧
                          </button>

                          <button
                            onClick={(e) =>
                              sendWhatsappQR(e, order)
                            }
                            disabled={!eligible}
                            style={{
                              ...styles.gatePassBtn,
                              background: eligible
                                ? "#25D366"
                                : "#ccc",
                              cursor: eligible
                                ? "pointer"
                                : "not-allowed",
                            }}
                            title="WhatsApp QR"
                          >
                            📱
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: 20,
                        textAlign: "center",
                      }}
                    >
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/hero-deep.jpg')",
    backgroundSize: "cover",
    padding: "40px 20px",
    position: "relative",
    fontFamily: "sans-serif",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 0,
  },

  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1200px",
    margin: "0 auto",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  createBtn: {
    padding: "10px 15px",
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  bulkBar: {
    marginBottom: 15,
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  bulkBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: "bold",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
    gap: 10,
    marginBottom: 20,
  },

  input: {
    padding: 12,
    borderRadius: 8,
    border: "none",
    width: "100%",
    boxSizing: "border-box",
  },

  tableCard: {
    background: "#fff",
    borderRadius: 12,
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  theadRow: {
    background: "#eee",
    textAlign: "left",
  },

  th: {
    padding: 12,
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  tr: {
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    transition: "background 0.2s",
  },

  td: {
    padding: 12,
    fontSize: 14,
  },

  gatePassBtn: {
    padding: 8,
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: "bold",
  },
};

function getStatusBadge(status: string) {
  let bg = "#eee";
  let color = "#333";

  if (
    status === "payment_verified" ||
    status === "fully_paid"
  ) {
    bg = "#d4edda";
    color = "#155724";
  }

  if (status === "cancelled") {
    bg = "#f8d7da";
    color = "#721c24";
  }

  if (status === "refunded") {
    bg = "#fff3cd";
    color = "#856404";
  }

  if (status === "partially_paid") {
    bg = "#cce5ff";
    color = "#004085";
  }

  if (status === "delivered") {
    bg = "#d4edda";
    color = "#155724";
  }

  return {
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 10,
    fontWeight: "bold" as const,
    background: bg,
    color,
    textTransform: "uppercase" as const,
  };
}
