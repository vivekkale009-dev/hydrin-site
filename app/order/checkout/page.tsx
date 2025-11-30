"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: number;
};

const PRODUCTS: Product[] = [
  { id: "1L", name: "OxyHydra – 1L Premium Bottle", price: 20 },
  { id: "500ml", name: "OxyHydra – 500ml Bottle", price: 12 },
  { id: "250ml", name: "OxyHydra – 250ml Bottle", price: 8 }
];

type Cart = Record<string, number>;
type PaymentMode = "COD_50" | "UPI_FULL";

const ORDER_BG_IMAGE = "/order-bg.jpg";
const UPI_ID = "oxyhydra@upi";
const UPI_QR_IMAGE = "/upi/oxyhydra-qr.png";

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart>({});
  const [loadingCart, setLoadingCart] = useState(true);

  const [pincode, setPincode] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("9am-12pm");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("COD_50");
  const [upiTxnId, setUpiTxnId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedCart = window.localStorage.getItem("oxy_cart");
      if (storedCart) setCart(JSON.parse(storedCart) || {});
      const storedPin = window.localStorage.getItem("oxy_pincode");
      if (storedPin) setPincode(storedPin);
      const storedFee = window.localStorage.getItem("oxy_delivery_fee");
      if (storedFee) setDeliveryFee(Number(storedFee));
    } catch {}
    setLoadingCart(false);
  }, []);

  const items = Object.keys(cart)
    .map(id => {
      const p = PRODUCTS.find(pp => pp.id === id);
      if (!p) return null;
      return {
        id,
        name: p.name,
        price: p.price,
        qty: cart[id],
        lineTotal: p.price * cart[id]
      };
    })
    .filter(Boolean) as any[];

  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const totalWithDelivery = subtotal + deliveryFee;

  const codAdvanceAmount =
    paymentMode === "COD_50" ? Math.round(totalWithDelivery * 0.5) : 0;

  const codBalanceAmount =
    paymentMode === "COD_50" ? totalWithDelivery - codAdvanceAmount : 0;

  const upiPayAmount =
    paymentMode === "UPI_FULL" ? totalWithDelivery : codAdvanceAmount;
  // -------------------------------------------------------------
  //          HANDLE SUBMIT — includes final redirect
  // -------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (items.length === 0 && !orderId) {
      setError("Your cart is empty. Please add products first.");
      return;
    }

    if (!name || !phone || !address || !pincode) {
      setError("Name, Phone, Address, and PIN code are required.");
      return;
    }

    if (!upiTxnId.trim()) {
      setError("Please enter UPI transaction ID.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          subtotal,
          deliveryFee,
          total: totalWithDelivery,
          customer: {
            name,
            phone,
            address,
            landmark: landmark || null,
            pincode
          },
          delivery: {
            date: deliveryDate || null,
            slot: deliverySlot
          },
          payment: {
            mode: paymentMode,
            upiTxnId,
            codAdvanceAmount:
              paymentMode === "COD_50" ? codAdvanceAmount : null,
            codBalanceAmount:
              paymentMode === "COD_50" ? codBalanceAmount : null
          }
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to place order.");
      }

      const oid = json.orderId;
      setOrderId(oid);

      // ⭐⭐⭐ REDIRECT TO ORDER SUCCESS PAGE ⭐⭐⭐
      router.push(`/order/success/${oid}`);
      return;

    } catch (err: any) {
      setError(err.message || "Unexpected error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCart) return <div style={{ padding: 20 }}>Loading...</div>;

  if (items.length === 0 && !orderId) {
    return (
      <div style={{ padding: 20 }}>
        <p>Your cart is empty.</p>
        <a href="/order" style={{ color: "#0ea5e9", textDecoration: "underline" }}>
          Go back to order page
        </a>
      </div>
    );
  }

  // -------------------------------------------------------------
  //            COMPLETE PAGE UI (UNCHANGED)
  // -------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url('${ORDER_BG_IMAGE}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "24px 12px"
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: "rgba(249, 250, 251, 0.95)",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 18px 45px rgba(15,23,42,0.65)"
        }}
      >
        <h1 style={{ fontSize: "1.7rem", marginBottom: 16 }}>Checkout</h1>

        {/* ORDER SUMMARY */}
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 14,
            background: "#ffffff",
            boxShadow: "0 4px 14px rgba(15,23,42,0.12)"
          }}
        >
          <h2 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Order Summary</h2>

          {items.map(it => (
            <div
              key={it.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                fontSize: "0.95rem"
              }}
            >
              <span>
                {it.name} × {it.qty}
              </span>
              <span>₹{it.lineTotal}</span>
            </div>
          ))}

          <div
            style={{
              marginTop: 8,
              borderTop: "1px dashed #cbd5f5",
              paddingTop: 6,
              fontSize: "0.95rem"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4
              }}
            >
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4
              }}
            >
              <span>Delivery fee (PIN {pincode || "-"})</span>
              <span>₹{deliveryFee}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontWeight: 700
              }}
            >
              <span>Total (incl. delivery)</span>
              <span>₹{totalWithDelivery}</span>
            </div>
          </div>

          {/* COD ADVANCE */}
          {paymentMode === "COD_50" && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px dashed #cbd5f5",
                fontSize: "0.9rem"
              }}
            >
              <p style={{ marginBottom: 2 }}>
                Advance to pay now (50%): <strong>₹{codAdvanceAmount}</strong>
              </p>
              <p>
                Remaining at delivery: <strong>₹{codBalanceAmount}</strong>
              </p>
            </div>
          )}

          {/* FULL UPI */}
          {paymentMode === "UPI_FULL" && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px dashed #cbd5f5",
                fontSize: "0.9rem"
              }}
            >
              <p>
                Full amount to pay now by UPI:{" "}
                <strong>₹{upiPayAmount}</strong>
              </p>
            </div>
          )}
        </div>
        {/* ERROR MESSAGE */}
        {error && (
          <div
            style={{
              marginBottom: 8,
              padding: 10,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: "0.9rem"
            }}
          >
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {success && (
          <div
            style={{
              marginBottom: 8,
              padding: 10,
              borderRadius: 8,
              background: "#dcfce7",
              color: "#166534",
              fontSize: "0.9rem"
            }}
          >
            {success}
          </div>
        )}

        {/* FORM START */}
        <form onSubmit={handleSubmit}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Customer Details</h2>

          <input
            placeholder="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Phone Number *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Full Address *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            style={{ ...inputStyle, minHeight: 70 }}
          />

          <input
            placeholder="Landmark (optional)"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="PIN Code *"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            style={inputStyle}
          />

          {/* DELIVERY DETAILS */}
          <h2 style={{ fontSize: "1.05rem", margin: "14px 0 8px" }}>
            Delivery Details
          </h2>

          <label style={labelStyle}>Preferred delivery date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Preferred time slot</label>
          <select
            value={deliverySlot}
            onChange={(e) => setDeliverySlot(e.target.value)}
            style={inputStyle}
          >
            <option value="9am-12pm">9 AM – 12 PM</option>
            <option value="12pm-3pm">12 PM – 3 PM</option>
            <option value="3pm-7pm">3 PM – 7 PM</option>
          </select>

          {/* PAYMENT METHOD */}
          <h2 style={{ fontSize: "1.05rem", margin: "14px 0 8px" }}>
            Payment Method
          </h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 10
            }}
          >
            {/* COD 50% */}
            <button
              type="button"
              onClick={() => setPaymentMode("COD_50")}
              style={{
                ...pillButton,
                borderColor:
                  paymentMode === "COD_50" ? "#0ea5e9" : "#cbd5f5",
                background:
                  paymentMode === "COD_50"
                    ? "rgba(14,165,233,0.08)"
                    : "#ffffff"
              }}
            >
              COD (50% advance by UPI)
            </button>

            {/* FULL UPI */}
            <button
              type="button"
              onClick={() => setPaymentMode("UPI_FULL")}
              style={{
                ...pillButton,
                borderColor:
                  paymentMode === "UPI_FULL" ? "#0ea5e9" : "#cbd5f5",
                background:
                  paymentMode === "UPI_FULL"
                    ? "rgba(14,165,233,0.08)"
                    : "#ffffff"
              }}
            >
              Full Payment by UPI
            </button>
          </div>

          {/* UPI INSTRUCTIONS */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: "#ecfeff",
              border: "1px solid #bae6fd",
              fontSize: "0.9rem"
            }}
          >
            <p style={{ marginBottom: 6 }}>
              1. Pay{" "}
              <strong>
                ₹{paymentMode === "UPI_FULL" ? upiPayAmount : codAdvanceAmount}
              </strong>{" "}
              to UPI ID:
            </p>

            <p
              style={{
                fontWeight: 700,
                marginBottom: 8,
                fontFamily: "monospace"
              }}
            >
              oxyhydra@upi
            </p>

            <div
              style={{
                width: 160,
                height: 160,
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #cbd5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: 8
              }}
            >
              <img
                src="/upi/oxyhydra-qr.png"
                alt="UPI QR"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain"
                }}
              />
            </div>

            <p style={{ marginBottom: 6 }}>
              2. After payment, enter the UPI transaction/reference ID:
            </p>

            <input
              placeholder="UPI transaction ID *"
              value={upiTxnId}
              onChange={(e) => setUpiTxnId(e.target.value)}
              style={inputStyle}
            />

            <p
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginTop: 4
              }}
            >
              Your order will be verified and confirmed shortly.
            </p>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              background: "#0ea5e9",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(14,165,233,0.4)"
            }}
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </button>
        </form>
        {/* FORM END */}
      </div>
    </div>
  );
}

/* ----------- INPUT + BUTTON STYLES ----------- */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5f5",
  fontSize: "0.9rem",
  marginBottom: 8,
  outline: "none"
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  marginBottom: 4,
  display: "block",
  color: "#475569"
};

const pillButton: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #cbd5f5",
  cursor: "pointer",
  fontSize: "0.85rem"
};
