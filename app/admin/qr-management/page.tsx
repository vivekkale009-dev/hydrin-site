
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import "./qr-management.css";

type Product = {
  id: string;
  name: string;
  volume_ml: number;
  units_per_box: number;
  bottles_per_box: number;
};

type Employee = {
  id: number;
  full_name: string;
  role: string | null;
  contact_number: string | null;
};

type Batch = {
  id: string;
  batch_date: string;
  batch_number: number;
  status: string;
  total_labels: number;
  created_at?: string;
};

type QRLabel = {
  id: string;
  qr_token: string;
  status?: string;
  cancellation_reason?: string | null;
  created_at?: string;
  sku_detail?: string | null;
  product_id?: string | null;
};

type QRItem = {
  id: string;
  qr_token: string;
  image: string;
  status: string;
  cancellation_reason?: string | null;
  created_at?: string;
  sku_detail?: string | null;
  product_id?: string | null;
};

function indiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function displayDate() {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function formatGeneratedDate(value?: string) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function QRManagementPage() {
  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [pin, setPin] = useState("");
  const [pinBatchNumber, setPinBatchNumber] = useState<number | null>(null);

  const [quantity, setQuantity] = useState("100");
  const [selectedProductId, setSelectedProductId] = useState("");

  // QR items currently displayed or selected for printing.
  const [qrItems, setQrItems] = useState<QRItem[]>([]);

  // Selected historical QR batch.
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingPin, setLoadingPin] = useState(true);
  const [loadingQR, setLoadingQR] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------

  const today = indiaDate();

  const selectedProduct = products.find((product) => product.id === selectedProductId);

  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === selectedEmployeeId
  );

  const todayBatches = batches.filter(
    (batch) => batch.batch_date === today
  );

  const totalLabelsToday = todayBatches.reduce(
    (total, batch) => total + Number(batch.total_labels || 0),
    0
  );

  const currentBatch = todayBatches.find(
    (batch) => batch.status === "active"
  );

  const unusedCount = qrItems.filter(
    (item) => item.status === "unused"
  ).length;

  const registeredCount = qrItems.filter(
    (item) => item.status === "registered"
  ).length;

  const cancelledCount = qrItems.filter(
    (item) => item.status === "cancelled"
  ).length;

  const expiredCount = qrItems.filter(
    (item) => item.status === "expired"
  ).length;

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) return employees;

    return employees.filter((employee) =>
      [
        employee.full_name,
        employee.role || "",
        employee.contact_number || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [employees, employeeSearch]);

  // --------------------------------------------------
  // LOAD EMPLOYEES
  // --------------------------------------------------

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);

    try {
      const response = await fetch("/api/admin/qr/employees", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load employees.");
      }

      setEmployees(data.employees || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load employees."
      );
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD ACTIVE SKUs FROM THE PRODUCTS MASTER TABLE
  // --------------------------------------------------

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);

    try {
      const response = await fetch("/api/admin/qr/products", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load products.");
      }

      const activeProducts: Product[] = data.products || [];
      setProducts(activeProducts);
      setSelectedProductId((current) =>
        current && activeProducts.some((product) => product.id === current)
          ? current
          : activeProducts[0]?.id || ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products.");
      setProducts([]);
      setSelectedProductId("");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD QR BATCHES
  // --------------------------------------------------

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);

    try {
      const response = await fetch("/api/admin/qr/batches", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load batches.");
      }

      setBatches(data.batches || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load batches."
      );
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD TODAY'S PIN
  // --------------------------------------------------

  const loadDailyPin = useCallback(async () => {
    setLoadingPin(true);

    try {
      const response = await fetch("/api/admin/qr/daily-pin", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load today's PIN.");
      }

      setPin(data.pin || "");
      setPinBatchNumber(data.batch?.batch_number ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load today's PIN."
      );
    } finally {
      setLoadingPin(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD INDIVIDUAL QR LABELS FROM A BATCH
  // --------------------------------------------------

  const loadLabels = async (batchId: string) => {
    if (!batchId) {
      setQrItems([]);
      return;
    }

    setError("");
    setSuccess("");
    setLoadingLabels(true);

    try {
      const response = await fetch(
        `/api/admin/qr/labels?batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load QR labels.");
      }

      const labels: QRLabel[] = data.labels || [];

      const items = await Promise.all(
        labels.map(async (label) => {
          const registrationUrl =
            `${window.location.origin}/production/register/${label.qr_token}`;

          const image = await QRCode.toDataURL(registrationUrl, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "H",
          });

          return {
            id: label.id,
            qr_token: label.qr_token,
            image,
            status: label.status || "unused",
            cancellation_reason: label.cancellation_reason || null,
            created_at: label.created_at,
            sku_detail: label.sku_detail || "SKU not recorded",
            product_id: label.product_id || null,
          };
        })
      );

      setQrItems(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load QR labels."
      );
      setQrItems([]);
    } finally {
      setLoadingLabels(false);
    }
  };

  // --------------------------------------------------
  // INITIAL PAGE LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadEmployees();
    loadProducts();
    loadBatches();
    loadDailyPin();
  }, [loadEmployees, loadProducts, loadBatches, loadDailyPin]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const refreshAll = async () => {
    setError("");
    await Promise.all([
      loadEmployees(),
      loadProducts(),
      loadBatches(),
      loadDailyPin(),
    ]);
  };

  // --------------------------------------------------
  // GENERATE / REGENERATE DAILY PIN
  // --------------------------------------------------

  const generatePin = async () => {
    const confirmed = window.confirm(
      "Regenerate today's PIN?\n\nThe previous PIN will immediately become invalid. Workers using it will not be able to register new stock."
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setLoadingPin(true);

    try {
      const response = await fetch("/api/admin/qr/daily-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "PIN generation failed.");
      }

      setPin(data.pin);
      setPinBatchNumber(data.batch?.batch_number ?? null);

      setSuccess(
        `New PIN generated. Previous PIN invalidated. Version #${data.batch?.batch_number}.`
      );

      await loadBatches();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate PIN."
      );
    } finally {
      setLoadingPin(false);
    }
  };

  // --------------------------------------------------
  // COPY PIN
  // --------------------------------------------------

  const copyPin = async () => {
    if (!pin) return;

    try {
      await navigator.clipboard.writeText(pin);
      setSuccess("PIN copied to clipboard.");
    } catch {
      setError("Unable to copy PIN.");
    }
  };

  // --------------------------------------------------
  // SHARE PIN THROUGH WHATSAPP
  // --------------------------------------------------

  const shareWhatsApp = () => {
    setError("");

    if (!pin) {
      setError("Today's PIN is not available.");
      return;
    }

    if (!selectedEmployee) {
      setError("Please select an employee.");
      return;
    }

    const rawPhone = (selectedEmployee.contact_number || "").replace(
      /\D/g,
      ""
    );

    if (rawPhone.length < 10) {
      setError("The selected employee has an invalid mobile number.");
      return;
    }

    const phone =
      rawPhone.length === 10
        ? `91${rawPhone}`
        : rawPhone;

    const message = [
      `Hello ${selectedEmployee.full_name},`,
      "",
      `Your production registration PIN for ${displayDate()} is ${pin}.`,
      "",
      "Please use this PIN when registering production QR labels.",
      "This PIN is valid only for today's production activities.",
      "Please keep it confidential and do not share it with unauthorized persons.",
      "",
      "Regards,",
      "Earthy Source Foods And Beverages",
    ].join("\n");

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --------------------------------------------------
  // GENERATE NEW QR LABELS
  // --------------------------------------------------

  const generateQRLabels = async () => {
    setError("");
    setSuccess("");

    const count = Number(quantity);

    if (!Number.isInteger(count) || count < 1 || count > 500) {
      setError("Enter a whole number between 1 and 500.");
      return;
    }

    if (!currentBatch) {
      setError("Generate today's PIN before generating QR labels.");
      return;
    }

    if (!selectedProductId || !selectedProduct) {
      setError("Please select an active SKU from the Products master.");
      return;
    }

    setLoadingQR(true);

    try {
      const response = await fetch("/api/admin/qr/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: count,
          product_id: selectedProductId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "QR generation failed.");
      }

      const labels: QRLabel[] = data.labels || [];

      if (!Array.isArray(labels) || labels.length === 0) {
        throw new Error("The API returned no QR labels.");
      }

      if (labels.some((label) => !label.id || !label.qr_token)) {
        throw new Error("A QR label is missing its ID or token.");
      }

      const origin = window.location.origin;

      const items = await Promise.all(
        labels.map(async (label) => {
          const registrationUrl =
            `${origin}/production/register/${label.qr_token}`;

          const image = await QRCode.toDataURL(registrationUrl, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "H",
          });

          return {
            id: label.id,
            qr_token: label.qr_token,
            image,
            status: "unused",
            cancellation_reason: null,
            created_at: label.created_at || new Date().toISOString(),
            sku_detail: label.sku_detail || selectedProduct.name,
            product_id: label.product_id || selectedProduct.id,
          };
        })
      );

      setQrItems(items);
      setSelectedBatchId(currentBatch.id);

      setSuccess(
        `${items.length} QR labels generated successfully. They are ready to print.`
      );

      await loadBatches();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate QR labels."
      );
    } finally {
      setLoadingQR(false);
    }
  };

  // --------------------------------------------------
  // CANCEL AN INDIVIDUAL UNUSED QR LABEL
  // --------------------------------------------------

  const cancelQRLabel = async (label: QRItem) => {
    if (label.status !== "unused") {
      setError("Only unused QR labels can be cancelled.");
      return;
    }

    const reason = window.prompt(
      `Why are you cancelling QR label ${label.id}?\n\nExample: Misplaced, damaged or stolen.`
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Please enter a cancellation reason.");
      return;
    }

    if (reason.trim().length > 300) {
      setError("Cancellation reason must be under 300 characters.");
      return;
    }

    const confirmed = window.confirm(
      "Cancel this QR label permanently?\n\nIt will no longer be available for production registration."
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/qr/labels", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          labelId: label.id,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to cancel QR label.");
      }

      setSuccess("QR label cancelled successfully.");

      await loadLabels(selectedBatchId);
      await loadBatches();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to cancel QR label."
      );
    }
  };

  // --------------------------------------------------
  // PRINT UNUSED QR LABELS
  // --------------------------------------------------

  const printLabels = () => {
    const printable = qrItems.filter(
      (item) => item.status === "unused"
    );

    if (!printable.length) {
      setError("There are no unused QR labels available for printing.");
      return;
    }

    // The print grid below uses qrItems.
    // Temporarily display only unused labels.
    setQrItems(printable);

    window.setTimeout(() => {
      window.print();
    }, 250);
  };

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main className="es-qr-page">

      {/* HEADER */}

      <header className="es-qr-topbar">
        <Link href="/admin/home" className="es-qr-brand">
          <span className="es-qr-brand-mark">ES</span>
          <span>
            <strong>EARTHY SOURCE</strong>
            <small>FOODS AND BEVERAGES</small>
          </span>
        </Link>

        <div className="es-qr-topbar-right">
          <span className="es-qr-date">{displayDate()}</span>

          <Link href="/admin/home" className="es-qr-home-link">
            ← Admin Home
          </Link>
        </div>
      </header>

      {/* BREADCRUMB */}

      <nav className="es-qr-breadcrumb">
        <Link href="/admin/home">Admin</Link>
        <span>/</span>
        <strong>Production Control</strong>
        <span className="es-qr-session">
          <i /> Admin session
        </span>
      </nav>

      {/* HERO */}

      <section className="es-qr-hero">
        <div>
          <span className="es-qr-eyebrow">
            PRODUCTION · TRACEABILITY · CONTROL
          </span>

          <h1>
            Production Control <em>Centre.</em>
          </h1>

          <p>
            Manage production authorization, QR labels and finished-goods
            traceability from one place.
          </p>
        </div>

        <div className="es-qr-hero-stamp">
          <span>✳</span>
          <strong>
            Every stock unit,
            <br />
            traceable.
          </strong>
          <small>QUALITY · CONTROL · ACCOUNTABILITY</small>
        </div>
      </section>

      {/* ALERTS */}

      {error && (
        <div className="es-qr-alert es-qr-error" role="alert">
          <strong>Action required</strong>
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="es-qr-alert es-qr-success" role="status">
          <strong>Success</strong>
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* STATISTICS */}

      <section className="es-qr-stats">

        <article className="es-qr-stat">
          <span className="es-qr-stat-icon green">▦</span>
          <div>
            <small>QR LABELS TODAY</small>
            <strong>
              {loadingBatches ? "—" : totalLabelsToday}
            </strong>
            <span>Generated labels</span>
          </div>
        </article>

        <article className="es-qr-stat">
          <span className="es-qr-stat-icon blue">▤</span>
          <div>
            <small>QR BATCHES TODAY</small>
            <strong>
              {loadingBatches ? "—" : todayBatches.length}
            </strong>
            <span>Generation sessions</span>
          </div>
        </article>

        <article className="es-qr-stat">
          <span className="es-qr-stat-icon purple">♙</span>
          <div>
            <small>EMPLOYEES</small>
            <strong>
              {loadingEmployees ? "—" : employees.length}
            </strong>
            <span>Database records</span>
          </div>
        </article>

        <article className="es-qr-stat">
          <span className="es-qr-stat-icon gold">◷</span>
          <div>
            <small>TODAY'S PIN</small>
            <strong className="es-qr-stat-status">
              {loadingPin ? "Loading" : pin ? "Active" : "Not created"}
            </strong>
            <span>
              {pinBatchNumber
                ? `Version #${pinBatchNumber}`
                : "Production authorization"}
            </span>
          </div>
        </article>

      </section>

      {/* PIN AND EMPLOYEE WHATSAPP */}

      <section className="es-qr-two-columns">

        {/* DAILY PIN */}

        <article className="es-qr-card">

          <div className="es-qr-card-title">
            <span className="es-qr-card-icon green">⌑</span>
            <div>
              <h2>Daily Production PIN</h2>
              <p>One active PIN for today's production registrations.</p>
            </div>
          </div>

          <div className="es-qr-pin-box">
            <small>TODAY'S AUTHORIZATION CODE</small>

            <div className="es-qr-pin-row">
              <strong>
                {loadingPin ? "Loading..." : pin || "— — — — —"}
              </strong>

              {pin && (
                <button onClick={copyPin}>Copy</button>
              )}
            </div>

            <p>
              {pin
                ? "Current PIN is available for sharing."
                : "Generate a PIN to authorize production registration."}
            </p>
          </div>

          <button
            className="es-qr-button primary"
            onClick={generatePin}
            disabled={loadingPin}
          >
            {loadingPin
              ? "Please wait..."
              : pin
                ? "↻ Regenerate Today's PIN"
                : "✳ Generate Today's PIN"}
          </button>

          <div className="es-qr-note">
            Regenerating invalidates the previous PIN. Printed QR labels
            remain separate stock identifiers.
          </div>

        </article>

        {/* WHATSAPP */}

        <article className="es-qr-card">

          <div className="es-qr-card-title">
            <span className="es-qr-card-icon whatsapp">✆</span>
            <div>
              <h2>Share PIN with Employee</h2>
              <p>Prepare a personal WhatsApp message.</p>
            </div>
          </div>

          <label htmlFor="employee-search">
            SEARCH EMPLOYEE
          </label>

          <input
            id="employee-search"
            className="es-qr-input"
            placeholder="Search name, role or mobile..."
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
          />

          <label htmlFor="employee-select">
            SELECT EMPLOYEE
          </label>

          <select
            id="employee-select"
            className="es-qr-input"
            value={selectedEmployeeId}
            onChange={(event) =>
              setSelectedEmployeeId(event.target.value)
            }
            disabled={loadingEmployees}
          >
            <option value="">
              {loadingEmployees
                ? "Loading employees..."
                : "Choose employee"}
            </option>

            {filteredEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} — {employee.role || "No role"}
              </option>
            ))}
          </select>

          {selectedEmployee && (
            <div className="es-qr-employee">
              <div className="es-qr-avatar">
                {selectedEmployee.full_name.charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{selectedEmployee.full_name}</strong>
                <span>
                  {selectedEmployee.role || "Role not specified"}
                </span>
                <small>
                  {selectedEmployee.contact_number || "No mobile number"}
                </small>
              </div>
            </div>
          )}

          <button
            className="es-qr-button whatsapp-button"
            onClick={shareWhatsApp}
            disabled={!pin || !selectedEmployee?.contact_number}
          >
            ✆ Open WhatsApp & Prepare Message
          </button>

          <p className="es-qr-helper">
            WhatsApp opens with the message filled in. You must press Send.
          </p>

        </article>

      </section>

      {/* GENERATE QR LABELS */}

      <section className="es-qr-card es-qr-generation">

        <div className="es-qr-card-title">
          <span className="es-qr-card-icon purple">▦</span>
          <div>
            <h2>Generate Stock QR Labels</h2>
            <p>
              Create unique labels for pallets, floor bundles and other
              stock units.
            </p>
          </div>
        </div>

        <div className="es-qr-generate-row">

          <div>
            <label htmlFor="qr-sku">SELECT SKU FROM PRODUCT MASTER</label>
            <select
              id="qr-sku"
              className="es-qr-input"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              disabled={loadingQR || loadingProducts || products.length === 0}
            >
              <option value="">
                {loadingProducts ? "Loading products..." : "Choose SKU"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.volume_ml >= 1000
                    ? `${product.volume_ml / 1000} L`
                    : `${product.volume_ml} ml`}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <small>
                {selectedProduct.name} · {selectedProduct.units_per_box} units per box
              </small>
            )}
          </div>

          <div>
            <label htmlFor="qr-quantity">
              NUMBER OF QR LABELS
            </label>

            <input
              id="qr-quantity"
              className="es-qr-input"
              type="number"
              min="1"
              max="500"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />

            <small>
              Minimum 1 · Maximum 500 labels per request
            </small>
          </div>

          <button
            className="es-qr-button generate-button"
            onClick={generateQRLabels}
            disabled={loadingQR || !currentBatch || !selectedProductId || loadingProducts || products.length === 0}
          >
            {loadingQR ? "Generating..." : "+ Generate QR Labels"}
          </button>

        </div>

        {!currentBatch && !loadingBatches && (
          <p className="es-qr-warning">
            Generate today's PIN before generating QR labels.
          </p>
        )}

        {/* QR PREVIEW AND PRINT */}

        {qrItems.length > 0 && (
          <div className="es-qr-print-section">

            <div className="es-qr-print-heading">
              <div>
                <h3>QR labels ready</h3>
                <p>
                  {unusedCount} unused labels available for printing.
                </p>
              </div>

              <button
                onClick={printLabels}
                className="es-qr-button primary"
                disabled={unusedCount === 0}
              >
                Print A4 Sheet
              </button>
            </div>

            {/* This is the single print grid used for both new
                and previously generated QR labels. */}

            <div className="es-qr-print-grid">
              {qrItems
                .filter((item) => item.status === "unused")
                .map((item, index) => (
                  <div className="es-qr-print-item" key={item.id}>
                    <img
                      src={item.image}
                      alt={`Stock QR ${index + 1}`}
                    />
                    <strong style={{ fontSize: "10px", letterSpacing: "1.1px", lineHeight: 1.2 }}>
                      EARTHY SOURCE
                    </strong>
                    <span style={{ fontSize: "7px", letterSpacing: "1.2px", color: "#718096", marginTop: "2px" }}>
                      STOCK IDENTIFICATION
                    </span>
                    <span style={{
                      display: "inline-block",
                      marginTop: "5px",
                      padding: "3px 8px",
                      border: "1px solid #d8e8e1",
                      borderRadius: "10px",
                      background: "#f3faf6",
                      color: "#126b4b",
                      fontSize: "8px",
                      fontWeight: 700,
                      lineHeight: 1.2,
                      maxWidth: "90%",
                      overflowWrap: "anywhere",
                    }}>
                      {item.sku_detail || "SKU not recorded"}
                    </span>
                    <small style={{ marginTop: "4px", fontSize: "7px", color: "#64748b" }}>
                      GENERATED · {formatGeneratedDate(item.created_at)}
                    </small>
                    <small style={{ marginTop: "2px", fontSize: "7px", color: "#94a3b8", letterSpacing: "0.5px" }}>
                      QR {String(index + 1).padStart(3, "0")}
                    </small>
                  </div>
                ))}
            </div>

          </div>
        )}

      </section>

      {/* QR LABEL REGISTER */}

      <section className="es-qr-card es-qr-label-register">

        <div className="es-qr-card-title">
          <span className="es-qr-card-icon green">▦</span>
          <div>
            <h2>QR Label Register</h2>
            <p>
              View, reprint and cancel individual QR labels from
              previously generated batches.
            </p>
          </div>
        </div>

        <label htmlFor="qr-batch-select">
          SELECT QR BATCH
        </label>

        <select
          id="qr-batch-select"
          className="es-qr-input"
          value={selectedBatchId}
          onChange={(event) => {
            const batchId = event.target.value;

            setSelectedBatchId(batchId);
            loadLabels(batchId);
          }}
        >
          <option value="">
            Choose a batch to view its QR labels
          </option>

          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.batch_date} — Version #{batch.batch_number} —{" "}
              {batch.total_labels} labels — {batch.status}
            </option>
          ))}
        </select>

        {loadingLabels && (
          <p className="es-qr-register-message">
            Loading QR labels...
          </p>
        )}

        {!loadingLabels && selectedBatchId && (
          <>

            {/* LABEL COUNTS */}

            <div className="es-qr-label-summary">

              <div>
                <small>TOTAL LABELS</small>
                <strong>{qrItems.length}</strong>
              </div>

              <div>
                <small>UNUSED</small>
                <strong>{unusedCount}</strong>
              </div>

              <div>
                <small>REGISTERED</small>
                <strong>{registeredCount}</strong>
              </div>

              <div>
                <small>CANCELLED</small>
                <strong>{cancelledCount}</strong>
              </div>

            </div>

            <div className="es-qr-label-summary">
              <div>
                <small>EXPIRED</small>
                <strong>{expiredCount}</strong>
              </div>
            </div>

            {/* PRINT BUTTON */}

            <div className="es-qr-label-actions">
              <button
                className="es-qr-button primary"
                onClick={printLabels}
                disabled={unusedCount === 0}
              >
                Print unused QR labels
              </button>
            </div>

            {/* INDIVIDUAL LABEL REGISTER */}

            {qrItems.length === 0 ? (
              <p className="es-qr-register-message">
                No QR labels found in this batch.
              </p>
            ) : (
              <div className="es-qr-label-list">

                {qrItems.map((item, index) => (
                  <article
                    className="es-qr-label-card"
                    key={item.id}
                  >

                    <img
                      src={item.image}
                      alt={`QR label ${index + 1}`}
                    />

                    <div className="es-qr-label-details">
                      <strong>QR Label {index + 1}</strong>

                      <small>
                        ID: {item.id}
                      </small>

                      <small>
                        SKU: {item.sku_detail || "SKU not recorded"}
                      </small>

                      <small>
                        Generated: {formatGeneratedDate(item.created_at)}
                      </small>

                      <span
                        className={`es-qr-badge ${item.status}`}
                      >
                        {item.status}
                      </span>

                      {item.cancellation_reason && (
                        <small>
                          Cancellation reason:{" "}
                          {item.cancellation_reason}
                        </small>
                      )}

                      {item.created_at && (
                        <small>
                          Created:{" "}
                          {new Date(item.created_at).toLocaleString("en-IN")}
                        </small>
                      )}
                    </div>

                    {item.status === "unused" ? (
                      <button
                        className="es-qr-cancel-button"
                        onClick={() => cancelQRLabel(item)}
                      >
                        Cancel label
                      </button>
                    ) : (
                      <span className="es-qr-label-locked">
                        {item.status === "registered"
                          ? "Already registered"
                          : item.status === "cancelled"
                            ? "Cancelled"
                            : "Not available"}
                      </span>
                    )}

                  </article>
                ))}

              </div>
            )}

          </>
        )}

        {!selectedBatchId && !loadingLabels && (
          <p className="es-qr-register-message">
            Select a batch above to view its individual QR labels.
          </p>
        )}

      </section>

      {/* QR BATCH HISTORY */}

      <section className="es-qr-card es-qr-history">

        <div className="es-qr-history-heading">

          <div className="es-qr-card-title">
            <span className="es-qr-card-icon gold">▤</span>
            <div>
              <h2>QR Batch History</h2>
              <p>Review generation records and PIN versions.</p>
            </div>
          </div>

          <button
            className="es-qr-refresh"
            onClick={refreshAll}
          >
            ↻ Refresh
          </button>

        </div>

        <div className="es-qr-table-wrap">

          <table className="es-qr-table">

            <thead>
              <tr>
                <th>Date</th>
                <th>Batch / PIN version</th>
                <th>Labels</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.batch_date}</td>
                  <td>#{batch.batch_number}</td>
                  <td>
                    {Number(batch.total_labels || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`es-qr-badge ${batch.status}`}>
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}

              {!batches.length && (
                <tr>
                  <td colSpan={4} className="es-qr-empty">
                    {loadingBatches
                      ? "Loading..."
                      : "No QR batches found."}
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="es-qr-footer">
        <span>EARTHY SOURCE FOODS AND BEVERAGES</span>
        <span>QUALITY · TRACEABILITY · ACCOUNTABILITY</span>
      </footer>

    </main>
  );
}
