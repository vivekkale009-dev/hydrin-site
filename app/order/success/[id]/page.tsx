"use client";

import { useEffect, useState } from "react";

export default function OrderSuccess({ params }: any) {
  const { id } = params;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/orders/get?orderId=${id}`);
      const json = await res.json();
      if (json.success) setOrder(json.order);
    }
    load();
  }, [id]);

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Order Placed 🎉</h1>

      <p style={{ fontSize: "1rem", marginTop: 5 }}>
        Thank you! Your order has been placed successfully.
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 10,
          background: "#f0fdf4",
        }}
      >
        <p><strong>Order ID:</strong> {id}</p>
        {order && (
          <>
            <p><strong>Total:</strong> ₹{order.total_amount}</p>
            <p><strong>Advance Paid:</strong> ₹{order.advance_paid}</p>
            <p>
              <strong>Remaining:</strong> ₹
              {order.total_amount - order.advance_paid}
            </p>
          </>
        )}
      </div>

      <a
        href={`/order/track?orderId=${id}`}
        style={{
          marginTop: 20,
          display: "inline-block",
          padding: 12,
          background: "#0284c7",
          color: "white",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        Track Your Order
      </a>
    </div>
  );
}
