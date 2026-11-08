
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const styles = `
* { box-sizing: border-box; }
.dashboard { min-height:100vh; padding:28px; background:#f4f7fb; color:#172033; }
.wrap { max-width:1500px; margin:auto; }
.header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:25px; flex-wrap:wrap; }
.heading h1 { font-size:25px; margin:0; font-weight:750; letter-spacing:-.6px; }
.heading p { margin:6px 0 0; color:#718096; font-size:13px; }
.actions { display:flex; gap:9px; flex-wrap:wrap; }
.btn { border:0; border-radius:8px; padding:10px 15px; font-weight:650; cursor:pointer; font-size:12px; }
.primary { background:#1769e0; color:white; }
.secondary { background:white; color:#334155; border:1px solid #e2e8f0; }
.btn:disabled { opacity:.6; cursor:wait; }
.section { margin-top:25px; }
.section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:13px; flex-wrap:wrap; }
.section-head h2 { font-size:16px; margin:0; font-weight:750; }
.section-head p { font-size:12px; color:#8490a3; margin:4px 0 0; }
.kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:13px; }
.kpi { background:white; border:1px solid #e8edf4; border-radius:12px; padding:17px; box-shadow:0 2px 7px rgba(20,35,60,.035); }
.kpi-label { color:#718096; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
.kpi-value { font-size:25px; font-weight:750; margin-top:9px; letter-spacing:-.5px; }
.kpi-note { font-size:11px; color:#94a3b8; margin-top:5px; }
.green { color:#15945b; } .blue { color:#1769e0; } .red { color:#dc5252; } .orange { color:#d97706; }
.panel { background:white; border:1px solid #e8edf4; border-radius:12px; overflow:hidden; box-shadow:0 2px 7px rgba(20,35,60,.035); }
.panel-title { padding:15px 17px; border-bottom:1px solid #edf1f6; font-size:13px; font-weight:750; display:flex; justify-content:space-between; align-items:center; gap:10px; }
.panel-body { padding:16px; }
.table-wrap { overflow-x:auto; width:100%; }
table { width:100%; border-collapse:collapse; min-width:650px; }
th { background:#f8fafc; color:#718096; font-size:10px; text-transform:uppercase; letter-spacing:.4px; text-align:left; padding:12px 13px; white-space:nowrap; }
td { padding:12px 13px; border-bottom:1px solid #f0f3f7; font-size:12px; color:#3b475b; }
tbody tr:last-child td { border-bottom:0; }
tbody tr:hover { background:#fafcff; }
.muted { color:#94a3b8; font-size:10px; margin-top:3px; }
.filters { display:flex; gap:9px; flex-wrap:wrap; margin-bottom:13px; }
.field { border:1px solid #e1e7ef; border-radius:8px; padding:10px 11px; font-size:12px; background:white; color:#334155; min-width:130px; outline:none; }
.field:focus { border-color:#6da2ed; box-shadow:0 0 0 3px #1769e014; }
.search { flex:1; min-width:220px; }
.product-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
.product { background:white; border:1px solid #e8edf4; border-radius:11px; padding:16px; }
.product-name { font-size:14px; font-weight:750; margin-bottom:13px; }
.product-stats { display:flex; gap:15px; flex-wrap:wrap; margin-bottom:14px; }
.stat-label { font-size:10px; color:#8995a7; }
.stat-value { font-size:17px; font-weight:750; margin-top:3px; }
.production { display:flex; gap:8px; border-top:1px solid #edf1f6; padding-top:12px; }
.production input { width:85px; }
.production .btn { flex:1; }
.location-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; }
.location { border:1px solid #e8edf4; border-radius:9px; padding:13px; }
.location-code { color:#1769e0; font-size:10px; font-weight:750; }
.location-name { font-size:12px; font-weight:700; margin-top:5px; }
.location-stock { font-size:20px; font-weight:750; margin-top:9px; }
.location-note { font-size:10px; color:#8490a3; margin-top:4px; }
.badge { display:inline-block; border-radius:5px; padding:4px 7px; font-size:10px; font-weight:700; background:#edf5ff; color:#2865b5; }
.badge-green { background:#e9f8ef; color:#16804b; }
.badge-orange { background:#fff4e5; color:#b66a09; }
.badge-red { background:#fff0f0; color:#c13e3e; }
.error { background:#fff0f0; border:1px solid #ffdada; color:#b42323; padding:13px; border-radius:9px; font-size:12px; }
.empty { text-align:center; padding:25px; color:#94a3b8; font-size:12px; }
.footer { margin-top:25px; color:#9aa5b5; font-size:10px; text-align:right; }
 .refresh-meta { color:#8490a3; font-size:11px; margin-top:7px; }
@media(max-width:650px) {
 .dashboard { padding:16px 11px; }
 .heading h1 { font-size:21px; }
 .kpis { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
 .kpi { padding:12px; }
 .kpi-value { font-size:20px; }
 .panel-body { padding:11px; }
}
`;

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [movementStats, setMovementStats] = useState({ produced: 0, sold: 0 });

  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrSearch, setQrSearch] = useState("");
  const [qrLocationFilter, setQrLocationFilter] = useState("all");
  const [qrProductFilter, setQrProductFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshLock = useRef(false);

  async function fetchInventory(silent = false) {
    try {
      if (!silent) setLoading(true);

      const res = await fetch(`/api/admin/inventory?v=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Inventory load failed");

      if (json.data) setItems(json.data);

      const params = new URLSearchParams();
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);

      const movRes = await fetch(
        `/api/admin/inventory/movements?${params.toString()}`,
        { cache: "no-store" }
      );
      const movJson = await movRes.json();
      if (!movRes.ok) throw new Error(movJson.message || "Movement load failed");

      if (movJson.data) {
        setMovements(movJson.data);
        setMovementStats(
          movJson.data.reduce(
            (acc: any, m: any) => {
              if (m.movement_type === "release") acc.produced += Number(m.qty_boxes || 0);
              if (m.movement_type === "deduct") acc.sold += Number(m.qty_boxes || 0);
              return acc;
            },
            { produced: 0, sold: 0 }
          )
        );
      }
    } catch (error) {
      console.error("Inventory fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQrInventory(silent = false) {
    try {
      if (!silent) setQrLoading(true);
      setQrError("");

      const res = await fetch(
        `/api/admin/stock/dashboard?t=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "QR stock load failed");
      }

      setQrData(json);
    } catch (error: any) {
      console.error("QR inventory error:", error);
      setQrError(error.message || "Unable to load QR stock");
    } finally {
      if (!silent) setQrLoading(false);
    }
  }

  async function refreshDashboard(silent = false) {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    try {
      await Promise.all([fetchInventory(silent), fetchQrInventory(silent)]);
      setLastUpdated(new Date());
    } finally {
      refreshLock.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshDashboard();
  }, [startDate, endDate]);

  useEffect(() => {
    const refreshWhenActive = () => {
      if (document.visibilityState === "visible") void refreshDashboard(true);
    };
    const interval = window.setInterval(refreshWhenActive, 30000);
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, [startDate, endDate]);

  const totalAvailable = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.available_boxes || 0), 0),
    [items]
  );

  const filteredItems = useMemo(
    () => items.filter((item) =>
      item.product_name?.toLowerCase().includes(productSearch.toLowerCase())
    ),
    [items, productSearch]
  );

  const skuSummary = useMemo(() => items.map((item) => {
    const sold = movements
      .filter((m) => m.product_id === item.product_id && m.movement_type === "deduct")
      .reduce((sum, m) => sum + Number(m.qty_boxes || 0), 0);

    return {
      ...item,
      sold,
      soldBottles: sold * Number(item.units_per_box || 0),
      stockBottles: Number(item.available_boxes || 0) * Number(item.units_per_box || 0),
    };
  }), [items, movements]);

  const filteredMovements = useMemo(() => movements.filter((m) => {
    const product = items.find((i) => i.product_id === m.product_id);
    const name = product?.product_name || "";
    const ref = (m.order_number || m.notes || "").toLowerCase();

    return (
      name.toLowerCase().includes(productSearch.toLowerCase()) &&
      (!typeFilter || m.movement_type === typeFilter) &&
      ref.includes(refSearch.toLowerCase())
    );
  }), [movements, items, productSearch, typeFilter, refSearch]);

  const qrSummary = qrData?.summary || {};
  const qrUnits = qrData?.stockUnits || [];
  const qrProducts = qrData?.byProduct || [];
  const qrLocations = qrData?.byLocation || [];
  const qrMovements = qrData?.movements || [];

  const filteredQrUnits = useMemo(() => {
    const search = qrSearch.toLowerCase();

    return qrUnits.filter((unit: any) => {
      const searchable = [
        unit.product_name,
        unit.location_name,
        unit.location_code,
        unit.lot_code,
        unit.qr_token_short,
        unit.qr_label_id,
        unit.status,
      ].some((v) => String(v || "").toLowerCase().includes(search));

      return (
        searchable &&
        (qrLocationFilter === "all" || unit.location_id === qrLocationFilter) &&
        (qrProductFilter === "all" || unit.product_id === qrProductFilter)
      );
    });
  }, [qrUnits, qrSearch, qrLocationFilter, qrProductFilter]);

  async function submitProduction(productId: string) {
    const qty = parseInt(inputValues[productId] || "", 10);
    if (!qty || qty <= 0) {
      alert("Enter a valid production quantity");
      return;
    }

    try {
      const res = await fetch("/api/admin/inventory/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qtyAdded: qty }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Production update failed");

      alert("Production logged successfully");

      setInputValues((prev) => ({ ...prev, [productId]: "" }));
      await Promise.all([fetchInventory(true), fetchQrInventory()]);
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <style>{styles}</style>
        <div className="wrap">Loading stock details...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <style>{styles}</style>
      <main className="wrap">
        <header className="header">
          <div className="heading">
            <h1>Stock &amp; Warehouse</h1>
            <p>See how many boxes are available, produced and sent out</p>
            <div className="refresh-meta">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN")}` : "Loading latest stock data..."}
              {" · Auto-refresh every 30 seconds while this page is open"}
            </div>
          </div>
          <div className="actions">
            <button className="btn secondary" onClick={() => refreshDashboard(true)} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "↻ Refresh Stock"}
            </button>
          </div>
        </header>

        <section className="kpis">
          <Kpi label="Total Boxes Available" value={totalAvailable} note="Ready for new orders" color="blue" />
          <Kpi label="Boxes Produced" value={movementStats.produced} note="Boxes added in selected dates" color="green" />
          <Kpi label="Boxes Sent Out" value={movementStats.sold} note="Boxes sent from the plant" color="red" />
          <Kpi label="QR-Tracked Boxes Available" value={qrSummary.availableBoxes ?? "—"} note="Available boxes recorded by QR labels" color="green" />
          <Kpi label="QR-Tracked Boxes Sent Out" value={qrSummary.dispatchedBoxes ?? "—"} note="Boxes sent out with QR tracking" color="orange" />
          <Kpi label="QR Stock Records" value={qrSummary.totalStockUnits ?? "—"} note="Registered pallets or stock groups" color="blue" />
        </section>
        <p className="refresh-meta" style={{ marginTop: 10 }}>The first stock total is used for orders. QR-tracked stock shows boxes recorded against QR labels. These are two views of stock, so do not add them together.</p>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Stock by Product</h2>
              <p>Current available stock and add-production entry</p>
            </div>
            <input
              className="field search"
              placeholder="Search product..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="product-grid">
            {filteredItems.map((item) => {
              const stock = Number(item.available_boxes || 0);
              const low = stock < 500;

              return (
                <div className="product" key={item.product_id}>
                  <div className="product-name">{item.product_name}</div>
                  <div className="product-stats">
                    <div>
                      <div className="stat-label">Boxes available</div>
                      <div className={`stat-value ${stock < 0 ? "red" : low ? "orange" : "green"}`}>{stock.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="stat-label">Reserved for orders</div>
                      <div className="stat-value">{Number(item.reserved_boxes || 0).toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="stat-label">Bottles</div>
                      <div className="stat-value">{(stock * Number(item.units_per_box || 0)).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                  <div className="production">
                    <input
                      className="field"
                      type="number"
                      min="1"
                      placeholder="Boxes"
                      value={inputValues[item.product_id] || ""}
                      onChange={(e) => setInputValues((prev) => ({ ...prev, [item.product_id]: e.target.value }))}
                    />
                    <button className="btn primary" onClick={() => submitProduction(item.product_id)}>
                      + Add Produced Boxes
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && <div className="panel empty">No products found.</div>}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Sales &amp; Stock by Product</h2>
              <p>Boxes and bottles sent out, plus current stock</p>
            </div>
          </div>
          <div className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th><th>Boxes sent out</th><th>Bottles sent out</th><th>Boxes available</th><th>Bottles available</th>
                  </tr>
                </thead>
                <tbody>
                  {skuSummary.map((item: any) => (
                    <tr key={item.product_id}>
                      <td><strong>{item.product_name}</strong></td>
                      <td>{item.sold}</td>
                      <td>{item.soldBottles}</td>
                      <td className="green"><strong>{item.available_boxes}</strong></td>
                      <td>{item.stockBottles}</td>
                    </tr>
                  ))}
                  {skuSummary.length === 0 && <tr><td colSpan={5} className="empty">No stock information available.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>QR-Tracked Stock</h2>
              <p>Stock recorded using QR labels and its storage location</p>
            </div>
            <button className="btn secondary" onClick={() => refreshDashboard(true)} disabled={refreshing || qrLoading}>
              {refreshing || qrLoading ? "Refreshing..." : "↻ Refresh QR Details"}
            </button>
          </div>

          {qrError && <div className="error">{qrError}</div>}

          {!qrData && !qrError && <div className="panel empty">Loading QR stock...</div>}

          {qrData && (
            <>
              <div className="kpis">
                <Kpi label="Boxes Available" value={qrSummary.availableBoxes || 0} color="green" />
                <Kpi label="Total Boxes Registered" value={qrSummary.totalProducedBoxes || 0} color="blue" />
                <Kpi label="Boxes Sent Out" value={qrSummary.dispatchedBoxes || 0} color="orange" />
                <Kpi label="Boxes on Hold" value={qrSummary.qualityHoldBoxes || 0} color="red" />
                <Kpi label="Damaged / Removed Boxes" value={qrSummary.scrappedBoxes || 0} color="blue" />
                <Kpi label="QR Labels Registered" value={qrSummary.registeredQrs || 0} color="blue" />
              </div>

              <div className="section">
                <div className="panel">
                  <div className="panel-title">QR Stock by Product</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th><th>Stock groups</th><th>Total boxes registered</th><th>Boxes available</th><th>Boxes sent out</th><th>On hold</th><th>Damaged / removed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qrProducts.map((p: any) => (
                          <tr key={p.productId}>
                            <td><strong>{p.productName}</strong></td>
                            <td>{p.stockUnits}</td>
                            <td>{p.producedBoxes}</td>
                            <td className="green"><strong>{p.availableBoxes}</strong></td>
                            <td>{p.dispatchedBoxes}</td>
                            <td>{p.qualityHoldBoxes}</td>
                            <td>{p.scrappedBoxes}</td>
                          </tr>
                        ))}
                        {qrProducts.length === 0 && <tr><td colSpan={7} className="empty">No QR-tracked stock registered.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-head">
                  <div><h2>Where Stock Is Kept</h2><p>Available boxes at each storage location</p></div>
                </div>
                <div className="location-grid">
                  {qrLocations.map((loc: any) => (
                    <div className="location" key={loc.locationId}>
                      <div className="location-code">{loc.locationCode}</div>
                      <div className="location-name">{loc.locationName}</div>
                      <div className="location-stock green">{loc.availableBoxes} boxes</div>
                      <div className="location-note">{loc.stockUnits} stock units · On hold: {loc.qualityHoldBoxes}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section">
                <div className="panel">
                  <div className="panel-title">
                    <span>QR Label Stock List</span>
                    <span className="badge">{filteredQrUnits.length} records</span>
                  </div>
                  <div className="panel-body">
                    <div className="filters">
                      <input className="field search" placeholder="Search product, QR label, batch or location..." value={qrSearch} onChange={(e) => setQrSearch(e.target.value)} />
                      <select className="field" value={qrProductFilter} onChange={(e) => setQrProductFilter(e.target.value)}>
                        <option value="all">All products</option>
                        {qrProducts.map((p: any) => <option key={p.productId} value={p.productId}>{p.productName}</option>)}
                      </select>
                      <select className="field" value={qrLocationFilter} onChange={(e) => setQrLocationFilter(e.target.value)}>
                        <option value="all">All locations</option>
                        {qrLocations.map((loc: any) => <option key={loc.locationId} value={loc.locationId}>{loc.locationCode}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>QR label</th><th>Product</th><th>Storage location</th><th>Batch</th><th>Starting boxes</th><th>Boxes available</th><th>Boxes sent out</th><th>On hold</th><th>Damaged / removed</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQrUnits.map((unit: any) => (
                          <tr key={unit.id}>
                            <td><strong>{unit.qr_token_short || "—"}</strong><div className="muted">{unit.qr_label_id}</div></td>
                            <td>{unit.product_name}</td>
                            <td><strong>{unit.location_code || "—"}</strong><div className="muted">{unit.location_name}</div></td>
                            <td>{unit.lot_code}</td>
                            <td>{unit.original_boxes}</td>
                            <td className="green"><strong>{unit.available_boxes}</strong></td>
                            <td>{unit.dispatched_boxes}</td>
                            <td>{unit.quality_hold_boxes}</td>
                            <td>{unit.scrapped_boxes}</td>
                            <td><span className={`badge ${unit.available_boxes > 0 ? "badge-green" : ""}`}>{unit.status || "unknown"}</span></td>
                          </tr>
                        ))}
                        {filteredQrUnits.length === 0 && <tr><td colSpan={10} className="empty">No matching QR stock records.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="panel">
                  <div className="panel-title">Recent QR Stock Updates</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Product</th><th>QR label</th><th>What happened</th><th>Boxes</th><th>From location</th><th>To location</th><th>Updated by</th></tr>
                      </thead>
                      <tbody>
                        {qrMovements.map((m: any) => (
                          <tr key={m.id}>
                            <td>{new Date(m.created_at).toLocaleString()}</td>
                            <td>{m.product_name}</td>
                            <td>{m.qr_token_short || "—"}</td>
                            <td><span className="badge">{movementLabel(m.movement_type)}</span></td>
                            <td>{m.quantity_boxes}</td>
                            <td>{m.from_location || "—"}</td>
                            <td>{m.to_location || "—"}</td>
                            <td>{m.performed_by || "—"}</td>
                          </tr>
                        ))}
                        {qrMovements.length === 0 && <tr><td colSpan={8} className="empty">No QR stock updates recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Stock History</h2>
              <p>Production entries, order reservations and boxes sent out</p>
            </div>
          </div>
          <div className="panel">
            <div className="panel-body">
              <div className="filters">
                <input type="date" className="field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" className="field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <select className="field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All activity</option>
                  <option value="release">Production</option>
                  <option value="reserve">Order reserved</option>
                  <option value="deduct">Sent out from plant</option>
                </select>
                <input className="field search" placeholder="Search order number or details..." value={refSearch} onChange={(e) => setRefSearch(e.target.value)} />
                <button className="btn secondary" onClick={() => { setStartDate(""); setEndDate(""); setTypeFilter(""); setRefSearch(""); }}>Reset filters</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Product</th><th>What happened</th><th>Boxes</th><th>Bottles</th><th>Order number / Details</th></tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m: any) => {
                    const product = items.find((i) => i.product_id === m.product_id);
                    const bottles = Number(m.qty_boxes || 0) * Number(product?.units_per_box || 0);

                    return (
                      <tr key={m.id}>
                        <td>{new Date(m.created_at).toLocaleString()}</td>
                        <td>{product?.product_name || "—"}</td>
                        <td><span className={`badge ${m.movement_type === "release" ? "badge-green" : m.movement_type === "deduct" ? "badge-red" : "badge-orange"}`}>{movementLabel(m.movement_type)}</span></td>
                        <td>{m.qty_boxes}</td>
                        <td>{bottles}</td>
                        <td>{m.order_number || m.notes || "—"}</td>
                      </tr>
                    );
                  })}
                  {filteredMovements.length === 0 && <tr><td colSpan={6} className="empty">No matching stock history found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="footer">Earthy Source Foods & Beverages · Stock &amp; Warehouse</div>
      </main>
    </div>
  );
}

function movementLabel(type: string) {
  if (type === "release" || type === "production_in") return "Production added";
  if (type === "reserve") return "Reserved for order";
  if (type === "deduct" || type === "dispatch_out") return "Sent out";
  if (type === "adjustment_in") return "Opening stock added";
  return type?.replaceAll("_", " ") || "—";
}

function Kpi({ label, value, note, color = "blue" }: any) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}
