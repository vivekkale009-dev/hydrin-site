
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DistributorPaymentsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const loadDetails = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/distributors/${id}/details?t=${Date.now()}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!res.ok || !json.data) {
        throw new Error(json.error || "Unable to load distributor");
      }

      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load distributor details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const recordPayment = async () => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (paymentMethod !== "cash" && !transactionRef.trim()) {
      setError("Enter the transaction reference.");
      return;
    }

    if (!window.confirm(
      `Record payment of ₹${value.toLocaleString("en-IN")} and allocate it to the oldest outstanding orders?`
    )) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/admin/distributors/${id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: value,
            paymentMethod,
            transactionRef: transactionRef.trim(),
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Payment recording failed");
      }

      setSuccess(json.data);
      setAmount("");
      setTransactionRef("");

      await loadDetails();
    } catch (e: any) {
      setError(e.message || "Payment recording failed");
    } finally {
      setSaving(false);
    }
  };

  const outstanding = Number(data?.current_due || 0);
  const allocations = success?.allocations || [];

  if (loading) {
    return <div style={styles.message}>Loading distributor...</div>;
  }

  if (!data) {
    return (
      <div style={styles.message}>
        {error || "Distributor not found"}
        <p>
          <button onClick={() => router.push("/admin/distributors")}>
            Back to Distributors
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />

      <div style={styles.container}>
        <button
          onClick={() => router.push(`/admin/distributors/view/${id}`)}
          style={styles.backButton}
        >
          ← Back to Distributor
        </button>

        <h1 style={styles.heading}>Distributor Payment</h1>
        <p style={styles.subtitle}>{data.profile?.name}</p>

        <div style={styles.card}>
          <div style={styles.label}>Current Outstanding Balance</div>
          <div style={styles.outstanding}>
            ₹{outstanding.toLocaleString("en-IN")}
          </div>

          <label style={styles.label}>Payment Amount (₹)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={outstanding}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setSuccess(null);
              setError("");
            }}
            placeholder="Enter amount received"
            style={styles.input}
          />

          <label style={styles.label}>Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={styles.input}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
          </select>

          {paymentMethod !== "cash" && (
            <>
              <label style={styles.label}>Transaction Reference / UTR</label>
              <input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Enter transaction reference"
                style={styles.input}
              />
            </>
          )}

          {amount !== "" &&
            Number(amount) > 0 &&
            Number(amount) <= outstanding && (
              <div style={styles.preview}>
                Outstanding after payment: ₹
                {(outstanding - Number(amount)).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}

          {error && <div style={styles.error}>{error}</div>}

          {success && (
            <div style={styles.success}>
              <strong>Payment recorded successfully.</strong>
              <p>
                Total allocated: ₹
                {Number(success.allocated_amount).toLocaleString("en-IN")}
              </p>
              <p>
                Remaining balance: ₹
                {Number(success.remaining_due).toLocaleString("en-IN")}
              </p>

              <strong>Order allocations</strong>
              {allocations.map((item: any) => (
                <div key={item.order_id} style={styles.allocation}>
                  Order {item.order_id.slice(0, 8)}: ₹
                  {Number(item.amount_allocated).toLocaleString("en-IN")}
                  {" — Remaining ₹"}
                  {Number(item.pending_after).toLocaleString("en-IN")}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={recordPayment}
            disabled={
              saving ||
              outstanding <= 0 ||
              !amount ||
              Number(amount) <= 0 ||
              Number(amount) > outstanding
            }
            style={{
              ...styles.saveButton,
              opacity:
                saving ||
                outstanding <= 0 ||
                !amount ||
                Number(amount) <= 0 ||
                Number(amount) > outstanding
                  ? 0.55
                  : 1,
            }}
          >
            {saving ? "Recording Payment..." : "Record Payment & Update Orders"}
          </button>

          <button
            onClick={() => router.push(`/admin/distributors/view/${id}`)}
            style={styles.returnButton}
          >
            Return to Distributor Page
          </button>
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
    padding: "35px 20px",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "650px",
    margin: "0 auto",
  },
  heading: { color: "#fff", marginBottom: "5px" },
  subtitle: { color: "#cbd5e1", marginBottom: "25px" },
  backButton: {
    padding: "10px 15px",
    marginBottom: "20px",
    background: "#334155",
    color: "#fff",
    border: 0,
    borderRadius: "8px",
    cursor: "pointer",
  },
  card: {
    background: "#fff",
    padding: "25px",
    borderRadius: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#475569",
  },
  outstanding: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#dc2626",
    marginBottom: "25px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    marginBottom: "18px",
    background: "#fff",
    color: "#111827",
  },
  preview: {
    padding: "12px",
    background: "#f1f5f9",
    borderRadius: "8px",
    marginBottom: "18px",
    fontWeight: "bold",
  },
  saveButton: {
    width: "100%",
    padding: "15px",
    background: "#16a34a",
    color: "#fff",
    border: 0,
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
  },
  returnButton: {
    width: "100%",
    padding: "12px",
    background: "#334155",
    color: "#fff",
    border: 0,
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "12px",
  },
  error: {
    color: "#b91c1c",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  success: {
    color: "#166534",
    background: "#dcfce7",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "15px",
    overflowWrap: "anywhere",
  },
  allocation: {
    fontSize: "13px",
    paddingTop: "8px",
  },
  message: {
    color: "#fff",
    textAlign: "center" as const,
    paddingTop: "100px",
  },
};
