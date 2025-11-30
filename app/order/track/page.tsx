"use client";

import { useState } from "react";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  async function fetchOrder() {
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/get?orderId=${orderId}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Order not found");
      } else {
        setOrder(json.order);
      }
    } catch (err) {
      setError("Unable to fetch order.");
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Track Your Order</h1>



      <input
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        placeholder="Enter your Order ID (e.g., OXY123456)"
        style={{
          width: "100%",
          padding: 10,
          marginTop: 20,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={fetchOrder}
        disabled={loading}
        style={{
          marginTop: 10,
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "none",
          background: "#0284c7",
          color: "white",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {loading ? "Checking..." : "Track Order"}
      </button>

      {error && (
        <div style={{ marginTop: 20, color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {order && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 10,
            background: "#f1f5f9",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            Order Details
          </h2>

          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Total Amount:</strong> ₹{order.total_amount}</p>
          <p><strong>Delivery Fee:</strong> ₹{order.delivery_fee}</p>
          <p><strong>Advance Paid:</strong> ₹{order.advance_amount}</p>
          <p><strong>Remaining:</strong> ₹{order.total_amount - order.advance_paid}</p>
          <p><strong>Transaction ID:</strong> {order.upi_txn_id}</p>

          <h3 style={{ marginTop: 15, fontWeight: 700 }}>Delivery Address</h3>
          <p>{order.customer_address}</p>
          <p>Pin Code: {order.pincode}</p>

          <h3 style={{ marginTop: 15, fontWeight: 700 }}>Items</h3>
          <ul>
            {order.items?.map((it: any, i: number) => (
              <li key={i}>
                {it.name} × {it.qty}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
