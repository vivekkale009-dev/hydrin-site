"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  img: string;
};

const PRODUCTS: Product[] = [
  {
    id: "1L",
    name: "OxyHydra – 1L Premium Bottle",
    price: 20, // change to real MRP/offer
    img: "/products/1l.png"
  },
  {
    id: "500ml",
    name: "OxyHydra – 500ml Bottle",
    price: 12,
    img: "/products/500ml.png"
  },
  {
    id: "250ml",
    name: "OxyHydra – 250ml Bottle",
    price: 8,
    img: "/products/250ml.png"
  }
];

type Cart = Record<string, number>;

const ORDER_BG_IMAGE = "/order-bg.jpg"; // 🔴 CHANGE THIS to your real bg path in /public

export default function OrderPage() {
  const [cart, setCart] = useState<Cart>({});
  const [pincode, setPincode] = useState("");
  const [deliveryOk, setDeliveryOk] = useState<boolean | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Load cart / pincode / fee from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedCart = window.localStorage.getItem("oxy_cart");
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (parsed && typeof parsed === "object") setCart(parsed);
      }
      const storedPin = window.localStorage.getItem("oxy_pincode");
      if (storedPin) setPincode(storedPin);
      const storedFee = window.localStorage.getItem("oxy_delivery_fee");
      if (storedFee) {
        setDeliveryFee(Number(storedFee));
        setDeliveryOk(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const updateCart = (fn: (prev: Cart) => Cart) => {
    setCart(prev => {
      const next = fn(prev);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("oxy_cart", JSON.stringify(next));
      }
      return next;
    });
  };

  const addToCart = (id: string) => {
    updateCart(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const removeOne = (id: string) => {
    updateCart(prev => {
      const qty = prev[id] || 0;
      if (qty <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: qty - 1 };
    });
  };

  const subtotal =
    Object.keys(cart).reduce((sum, id) => {
      const product = PRODUCTS.find(p => p.id === id);
      return sum + (product?.price || 0) * cart[id];
    }, 0) || 0;

  const grandTotal = subtotal + (deliveryFee ?? 0);

  const checkPincode = async () => {
    setPinError(null);
    setDeliveryOk(null);
    setDeliveryFee(null);

    const pin = pincode.trim();

    if (!pin || pin.length !== 6) {
      setPinError("Please enter a valid 6-digit PIN code.");
      return;
    }

    setCheckingPin(true);
    try {
      const res = await fetch("/api/pincode/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pin })
      });

      const json = await res.json();

      if (!json.ok) {
        setDeliveryOk(false);
        setDeliveryFee(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("oxy_pincode");
          window.localStorage.removeItem("oxy_delivery_fee");
        }
        return;
      }

      const fee = Number(json.fee ?? 0);
      setDeliveryOk(true);
      setDeliveryFee(fee);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("oxy_pincode", pin);
        window.localStorage.setItem("oxy_delivery_fee", String(fee));
      }
    } catch (e) {
      console.error("PIN check failed:", e);
      setPinError("Could not verify PIN. Please try again.");
    } finally {
      setCheckingPin(false);
    }
  };

  const canCheckout = deliveryOk && subtotal > 0;

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
          background: "rgba(249, 250, 251, 0.93)",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 18px 45px rgba(15,23,42,0.65)"
        }}
      >
        <h1 style={{ fontSize: "1.9rem", marginBottom: 8 }}>
          Order OxyHydra Bottles
        </h1>
        <p style={{ marginBottom: 20, color: "#475569", fontSize: "0.95rem" }}>
          Fresh, premium drinking water delivered to your doorstep.
        </p>

        {/* Product grid */}
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
          }}
        >
          {PRODUCTS.map(p => {
            const qty = cart[p.id] || 0;
            return (
              <div
                key={p.id}
                style={{
                  padding: 16,
                  background: "#ffffff",
                  borderRadius: 16,
                  boxShadow: "0 6px 18px rgba(15,23,42,0.14)"
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    background: "#e5f7ff",
                    borderRadius: 12,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={p.img}
                    alt={p.name}
                    style={{
                      maxWidth: "80%",
                      maxHeight: "80%",
                      objectFit: "contain"
                    }}
                  />
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: 4 }}>{p.name}</h3>
                <p style={{ fontWeight: 600, marginBottom: 10 }}>₹{p.price}</p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                  }}
                >
                  {qty > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => removeOne(p.id)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: "none",
                          background: "#e5e7eb",
                          cursor: "pointer",
                          fontWeight: 700
                        }}
                      >
                        -
                      </button>
                      <span
                        style={{
                          minWidth: 26,
                          textAlign: "center",
                          fontSize: "0.95rem"
                        }}
                      >
                        {qty}
                      </span>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => addToCart(p.id)}
                    style={{
                      flex: 1,
                      background: "#0ea5e9",
                      color: "#ffffff",
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem"
                    }}
                  >
                    {qty > 0 ? "Add More" : "Add to Order"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary + PIN check */}
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)"
          }}
        >
          {/* Cart summary */}
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
              Your Order
            </h2>
            {Object.keys(cart).length === 0 && (
              <p style={{ color: "#6b7280" }}>No items added yet.</p>
            )}

            {Object.keys(cart).map(id => {
              const p = PRODUCTS.find(pp => pp.id === id);
              if (!p) return null;
              const qty = cart[id];
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: "0.95rem"
                  }}
                >
                  <span>
                    {p.name} × {qty}
                  </span>
                  <span>₹{p.price * qty}</span>
                </div>
              );
            })}

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
                <span>Delivery fee</span>
                <span>
                  {deliveryOk
                    ? `₹${deliveryFee ?? 0}`
                    : deliveryOk === null
                    ? "—"
                    : "Not available"}
                </span>
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
                <span>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Pincode section */}
          <div
            style={{
              padding: 12,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 4px 14px rgba(15,23,42,0.12)"
            }}
          >
            <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>
              Delivery availability
            </h3>
            <p style={{ fontSize: "0.85rem", marginBottom: 8 }}>
              Enter your PIN code to check whether we deliver to your area and
              see the delivery charge.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 999,
                  border: "1px solid #cbd5f5",
                  fontSize: "0.9rem"
                }}
                placeholder="6-digit PIN"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
              />
              <button
                type="button"
                onClick={checkPincode}
                disabled={checkingPin}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "#22c55e",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                {checkingPin ? "Checking..." : "Check"}
              </button>
            </div>
            {pinError && (
              <p style={{ color: "#b91c1c", fontSize: "0.85rem" }}>
                {pinError}
              </p>
            )}
            {deliveryOk === true && (
              <p style={{ color: "#15803d", fontSize: "0.9rem" }}>
                ✅ We deliver to this PIN. Delivery fee: ₹{deliveryFee ?? 0}.
              </p>
            )}
            {deliveryOk === false && (
              <p style={{ color: "#b91c1c", fontSize: "0.9rem" }}>
                ❌ Sorry, we do not deliver to this PIN yet.
              </p>
            )}

            {canCheckout && (
              <a
                href="/order/checkout"
                style={{
                  marginTop: 14,
                  display: "inline-block",
                  background: "#0ea5e9",
                  color: "#ffffff",
                  padding: "9px 16px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem"
                }}
              >
                Proceed to Checkout
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
