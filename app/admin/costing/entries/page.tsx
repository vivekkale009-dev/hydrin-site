"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  volume_ml?: number;
  bottles_per_box?: number;
  units_per_box?: number;
};

type Entry = {
  id: string;
  production_date: string;
  entry_type: string;
  shift: string;
  produced_boxes: number;
  rejected_boxes: number;
  good_boxes: number;
  manufacturing_cost: number;
  manufacturing_cost_per_box: number;
  selling_price_per_box: number;
  profit: number;
  product?: Product;
  lot?: { lot_code?: string; actual_cost_per_box?: number };
  product_id?: string;
  [key: string]: any;
};

type FormState = {
  production_date: string; entry_type: string; shift: string; product_id: string;
  produced_boxes: string; rejected_boxes: string; productive_hours: string;
  start_time: string; end_time: string; break_hours: string; changeover_hours: string;
  bottles_per_box: string; preform_1_bags_used: string;
  preform_1_bags_remaining: string; preform_2_bags_used: string;
  preform_2_bags_remaining: string;
  caps_consumed_pieces: string; rejected_bottles: string; rejected_caps: string;
  wrapper_rolls_used: string;
  rejected_wrapper_boxes: string; labels_consumed_boxes: string; labour_day_total: string;
  daily_labour_allocation_hours: string; opening_kwh: string; closing_kwh: string;
  non_production_kwh: string;
  selling_price_per_box: string; transport_sales_expense: string; maintenance_cost: string;
  glue_chemicals_cost: string; other_charges_cost: string; notes: string;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialForm = (): FormState => ({
  production_date: today(), entry_type: "production", shift: "General", product_id: "",
  produced_boxes: "0", rejected_boxes: "0", productive_hours: "7", start_time: "09:00",
  end_time: "17:00", break_hours: "1", changeover_hours: "0", bottles_per_box: "12",
  preform_1_bags_used: "0", preform_1_bags_remaining: "0",
  preform_2_bags_used: "0", preform_2_bags_remaining: "0",
  caps_consumed_pieces: "",
  rejected_bottles: "0", rejected_caps: "0",
  wrapper_rolls_used: "0", rejected_wrapper_boxes: "0",
  labels_consumed_boxes: "", labour_day_total: "0", daily_labour_allocation_hours: "0",
  opening_kwh: "0", closing_kwh: "0", non_production_kwh: "0",
  selling_price_per_box: "73", transport_sales_expense: "0",
  maintenance_cost: "", glue_chemicals_cost: "", other_charges_cost: "", notes: "",
});

const num = (value: string | number | undefined | null, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};
const money = (value: number | undefined) =>
  `₹${num(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// IMPORTANT: Keep this input component OUTSIDE the page component.
// Defining it inside the page causes React to remount it after every keystroke,
// which makes the cursor/focus jump and forces users to click for every digit.
function NumericField({
  label, name, value, onChange, hint, readOnly = false, type = "number", step = "any",
}: {
  label: string; name: keyof FormState; value: string; onChange: (name: keyof FormState, value: string) => void;
  hint?: string; readOnly?: boolean; type?: "number" | "date" | "time" | "text"; step?: string;
}) {
  const numeric = type === "number";
  return (
    <label className="cost-field">
      <span className="cost-label">{label}</span>
      <input
        className={readOnly ? "cost-input cost-readonly" : "cost-input"}
        type={numeric ? "text" : type}
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(name, e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {hint && <small className="cost-hint">{hint}</small>}
    </label>
  );
}

export default function DailyCostingPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [periodType, setPeriodType] = useState<"all" | "daily" | "monthly" | "quarterly" | "half" | "yearly" | "custom">("monthly");
  const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [periodQuarter, setPeriodQuarter] = useState("1");
  const [periodHalf, setPeriodHalf] = useState("1");
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [selectedSkuId, setSelectedSkuId] = useState("all");
  const [rateRows, setRateRows] = useState<any[]>([]);
  const [skuPreforms, setSkuPreforms] = useState<any[]>([]);
  const [skuPreformSaving, setSkuPreformSaving] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSaving, setRateSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const update = useCallback((key: keyof FormState, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
  }, []);

  const loadEntries = useCallback(async () => {
    const response = await fetch("/api/admin/costing/entries", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Unable to load costing entries.");
    setEntries(data.entries || []);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const [productResponse, entryResponse] = await Promise.all([
          fetch("/api/products-basic", { cache: "no-store" }),
          fetch("/api/admin/costing/entries", { cache: "no-store" }),
        ]);
        const productData = await productResponse.json();
        const entryData = await entryResponse.json();
        if (!productResponse.ok) throw new Error(productData.error || "Unable to load products.");
        if (!entryResponse.ok || !entryData.success) throw new Error(entryData.error || "Unable to load costing entries.");
        const list: Product[] = Array.isArray(productData) ? productData : productData.products || productData.data || [];
        if (active) {
          setProducts(list); setEntries(entryData.entries || []);
          if (list.length) setForm((old) => ({
            ...old, product_id: old.product_id || list[0].id,
            bottles_per_box: String(list[0].bottles_per_box || list[0].units_per_box || 12),
          }));
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load page.");
      } finally { if (active) setLoading(false); }
    }
    load();
    fetch("/api/admin/costing/entries?view=rates", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (active && d.success) setRateRows(d.rates || []); }).catch(() => {});
    fetch("/api/admin/costing/entries?view=sku_preforms", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (active && d.success) setSkuPreforms(d.sku_preforms || []); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const goodBoxes = Math.max(0, num(form.produced_boxes) - num(form.rejected_boxes));
  const masterMeterFactor = num(rateRows.find((r) => r.component_key === "meter_factor")?.rate_value, 40);
  const electricityUnits = Math.max(0, num(form.closing_kwh) - num(form.opening_kwh) - num(form.non_production_kwh)) * masterMeterFactor;

  const periodRange = useMemo(() => {
    const y = Number(periodYear);
    if (periodType === "all") return { from: "0001-01-01", to: "9999-12-31" };
    if (periodType === "daily") return { from: dateFrom, to: dateFrom };
    if (periodType === "custom") return { from: dateFrom, to: dateTo };
    if (periodType === "monthly") {
      const start = `${periodYear}-${periodMonth}-01`;
      const end = new Date(y, Number(periodMonth), 0).toISOString().slice(0, 10);
      return { from: start, to: end };
    }
    if (periodType === "quarterly") {
      const m = (Number(periodQuarter) - 1) * 3;
      return { from: `${periodYear}-${String(m + 1).padStart(2,"0")}-01`, to: new Date(y, m + 3, 0).toISOString().slice(0,10) };
    }
    if (periodType === "half") {
      const m = periodHalf === "1" ? 0 : 6;
      return { from: `${periodYear}-${periodHalf === "1" ? "01" : "07"}-01`, to: new Date(y, m + 6, 0).toISOString().slice(0,10) };
    }
    return { from: `${periodYear}-01-01`, to: `${periodYear}-12-31` };
  }, [periodType, periodYear, periodMonth, periodQuarter, periodHalf, dateFrom, dateTo]);

  // One shared reporting filter powers every report tab: date range + SKU.
  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const d = String(entry.production_date || "").slice(0,10);
    const matchesDate = d >= periodRange.from && d <= periodRange.to;
    const matchesSku = selectedSkuId === "all" || entry.product_id === selectedSkuId || entry.product?.id === selectedSkuId;
    return matchesDate && matchesSku;
  }), [entries, periodRange, selectedSkuId]);

  const filteredProducts = useMemo(
    () => selectedSkuId === "all" ? products : products.filter((product) => product.id === selectedSkuId),
    [products, selectedSkuId]
  );

  const totals = useMemo(() => ({
    boxes: filteredEntries.reduce((sum, row) => sum + num(row.good_boxes), 0),
    cost: filteredEntries.reduce((sum, row) => sum + num(row.manufacturing_cost), 0),
    sales: filteredEntries.reduce((sum, row) => sum + num(row.sales_revenue, num(row.good_boxes) * num(row.selling_price_per_box)), 0),
    profit: filteredEntries.reduce((sum, row) => sum + num(row.profit), 0),
    bottles: filteredEntries.reduce((sum, row) => sum + num(row.good_boxes) * num(row.bottles_per_box || row.product?.bottles_per_box || 12), 0),
  }), [filteredEntries]);

  const groupedPeriods = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    filteredEntries.forEach((e) => {
      const d = String(e.production_date || "");
      let key = d.slice(0,7);
      if (activeTab === "Quarterly Summary") key = `Q${Math.floor((Number(d.slice(5,7))-1)/3)+1}-${d.slice(0,4)}`;
      if (activeTab === "Half-Year Summary") key = `${Number(d.slice(5,7)) <= 6 ? "H1" : "H2"}-${d.slice(0,4)}`;
      if (activeTab === "Yearly Summary") key = d.slice(0,4);
      (groups[key] ||= []).push(e);
    });
    return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0])).map(([period, rows]) => {
      const boxes=rows.reduce((s,e)=>s+num(e.good_boxes),0);
      const sales=rows.reduce((s,e)=>s+num(e.sales_revenue, num(e.good_boxes)*num(e.selling_price_per_box)),0);
      const cost=rows.reduce((s,e)=>s+num(e.manufacturing_cost),0);
      const profit=rows.reduce((s,e)=>s+num(e.profit),0);
      return {period,boxes,sales,cost,profit,margin:sales ? profit/sales*100 : 0,costPerBox:boxes ? cost/boxes : 0,profitPerBox:boxes ? profit/boxes : 0};
    });
  }, [filteredEntries, activeTab]);

  async function loadRates() {
    setRateLoading(true);
    try {
      const response = await fetch("/api/admin/costing/entries?view=rates", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load rate master.");
      setRateRows(data.rates || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load rate master."); }
    finally { setRateLoading(false); }
  }

  async function saveRate(row: any) {
    setRateSaving(row.id);
    try {
      const response = await fetch("/api/admin/costing/entries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, rate_value: num(row.rate_value), gst_rate: num(row.gst_rate), effective_from: row.effective_from || today() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update rate.");
      setSuccess(`Rate updated: ${row.component_key}`);
      await loadRates();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update rate."); }
    finally { setRateSaving(null); }
  }

  async function saveSkuPreform(row: any) {
    const key = `${row.product_id}-${row.preform_slot}`; setSkuPreformSaving(key); setError("");
    try {
      const response = await fetch("/api/admin/costing/entries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_sku_preform", ...row }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Unable to save SKU preform configuration.");
      const refreshed = await fetch("/api/admin/costing/entries?view=sku_preforms", { cache: "no-store" }).then(r=>r.json());
      setSkuPreforms(refreshed.sku_preforms || []); setSuccess("SKU-wise preform configuration saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save SKU preform."); }
    finally { setSkuPreformSaving(null); }
  }

  function updateRate(id: string, key: string, value: string) {
    setRateRows((old) => old.map((r) => r.id === id ? { ...r, [key]: value } : r));
  }

  function selectProduct(id: string) {
    const product = products.find((item) => item.id === id);
    setForm((old) => ({ ...old, product_id: id, bottles_per_box: String(product?.bottles_per_box || product?.units_per_box || 12) }));
  }

  function editEntry(entry: Entry) {
    const next = initialForm();
    const keys = Object.keys(next) as (keyof FormState)[];
    for (const key of keys) {
      const value = (entry as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) {
        next[key] = String(value) as never;
      }
    }

    // Keep the product/shift/date tied to the existing QR production lot.
    next.production_date = String(entry.production_date || next.production_date).slice(0, 10);
    next.entry_type = entry.entry_type || "production";
    next.shift = entry.shift || "General";
    next.product_id = entry.product_id || entry.product?.id || "";
    setForm(next);
    setEditingId(entry.id);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm());
    setError("");
    setSuccess("");
  }

  async function deleteEntry(entry: Entry) {
    const label = `${entry.production_date} · ${entry.product?.name || "production entry"}`;
    if (!window.confirm(`Delete this costing entry (${label})?\n\nEntries with QR-registered stock or shared production lots cannot be deleted.`)) return;

    setError("");
    setSuccess("");
    setDeletingId(entry.id);
    try {
      const response = await fetch("/api/admin/costing/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to delete costing entry.");
      }
      if (editingId === entry.id) cancelEdit();
      setSuccess(data.message || "Costing entry deleted.");
      await loadEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete costing entry.");
    } finally {
      setDeletingId(null);
    }
  }

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (form.entry_type === "production" && !form.product_id) return setError("Please select a product.");
    // A production entry can be opened before the shift starts.
    // EOD output and consumption are entered later through Edit.
    if (num(form.rejected_boxes) > num(form.produced_boxes)) return setError("Rejected boxes cannot exceed produced boxes.");
    if (num(form.closing_kwh) < num(form.opening_kwh)) return setError("Closing meter reading cannot be less than opening reading.");

    setSaving(true);
    try {
      const numericFields: (keyof FormState)[] = [
        "produced_boxes", "rejected_boxes", "productive_hours", "break_hours", "changeover_hours", "bottles_per_box",
        "preform_1_bags_used", "preform_1_bags_remaining", "preform_2_bags_used",
        "preform_2_bags_remaining", "rejected_bottles", "rejected_caps", "wrapper_rolls_used",
        "rejected_wrapper_boxes", "labour_day_total", "daily_labour_allocation_hours", "opening_kwh",
        "closing_kwh", "non_production_kwh", "selling_price_per_box", "transport_sales_expense",
      ];
      const payload: Record<string, unknown> = { ...form };
      for (const key of numericFields) payload[key] = num(form[key]);
      const optionalNumericFields: (keyof FormState)[] = [
        "caps_consumed_pieces", "labels_consumed_boxes",
        "maintenance_cost", "glue_chemicals_cost", "other_charges_cost",
      ];
      for (const key of optionalNumericFields) payload[key] = form[key] === "" ? undefined : num(form[key]);

      const response = await fetch("/api/admin/costing/entries", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save costing entry.");
      setSuccess(data.warning
        ? `Entry ${editingId ? "updated" : "created"}, but production-lot linking failed: ${data.warning}`
        : editingId ? "Costing entry updated. The existing production lot and QR registrations are retained."
        : "Costing entry created and production lot opened for QR registration.");
      setEditingId(null);
      setForm(initialForm());
      await loadEntries();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save entry."); }
    finally { setSaving(false); }
  }

  const field = (label: string, name: keyof FormState, hint?: string, type: "number" | "date" | "time" | "text" = "number") => (
    <NumericField key={name} label={label} name={name} value={form[name]} onChange={update} hint={hint} type={type} />
  );
  const readonlyField = (label: string, value: string, hint?: string) => (
    <label className="cost-field" key={label}><span className="cost-label">{label}</span><input className="cost-input cost-readonly" value={value} readOnly /><small className="cost-hint">{hint}</small></label>
  );

  return (
    <main className="cost-page">
      <style jsx global>{`
        .cost-page{min-height:100vh;background:#f3f6f8;color:#172b3a;padding:28px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
        .cost-wrap{max-width:1500px;margin:0 auto}.cost-top{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:24px}
        .cost-kicker{font-size:11px;letter-spacing:2px;font-weight:800;color:#078568;text-transform:uppercase;margin-bottom:8px}
        .cost-title{font-size:30px;line-height:1.15;font-weight:850;letter-spacing:-.8px;margin:0;color:#142f43}.cost-subtitle{font-size:13px;color:#718397;margin-top:9px}
        .cost-panel{background:#fff;border:1px solid #e4ebf0;border-radius:17px;padding:24px;margin-bottom:20px;box-shadow:0 5px 20px rgba(22,47,67,.045)}
        .cost-section{padding-top:21px;margin-top:21px;border-top:1px solid #edf1f4}.cost-section:first-child{padding-top:0;margin-top:0;border-top:0}
        .cost-section-head{display:flex;align-items:center;gap:12px;margin-bottom:17px}.cost-step{width:30px;height:30px;border-radius:9px;background:#e8f6f1;color:#087b60;display:grid;place-items:center;font-size:13px;font-weight:850;flex:none}
        .cost-section h2{font-size:16px;font-weight:800;margin:0;color:#1a3549}.cost-section p{font-size:12px;color:#8090a0;margin:4px 0 0}
        .cost-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.cost-field{display:flex;flex-direction:column;gap:7px;min-width:0}
        .cost-label{font-size:12px;font-weight:700;color:#52677a}.cost-input{width:100%;min-width:0;box-sizing:border-box;border:1px solid #dce5eb;border-radius:9px;padding:12px 13px;background:#fbfcfd;color:#1c3447;font-size:14px;font-weight:550;outline:none;transition:border-color .15s,box-shadow .15s}
        .cost-input:focus{border-color:#078568;box-shadow:0 0 0 3px rgba(7,133,104,.11);background:#fff}.cost-input:hover{border-color:#aebfca}.cost-readonly{background:#eef6f3;border-color:#d7ebe3;color:#087653;font-weight:800}
        .cost-hint{font-size:11px;line-height:1.4;color:#8796a4;font-weight:400}.cost-select{width:100%;box-sizing:border-box;border:1px solid #dce5eb;border-radius:9px;padding:12px;background:#fbfcfd;color:#1c3447;font-size:13px}
        .cost-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;padding-top:20px;border-top:1px solid #edf1f4}.cost-btn{border:0;border-radius:9px;padding:12px 19px;background:#087f65;color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 10px rgba(8,127,101,.15)}
        .cost-btn:hover{background:#066b55}.cost-btn:disabled{opacity:.55;cursor:not-allowed}.cost-btn-light{background:#f1f5f7;color:#43586a;box-shadow:none;border:1px solid #e0e8ed}.cost-btn-light:hover{background:#e8eef2}.cost-row-actions{display:flex;align-items:center;gap:7px}.cost-btn-danger{background:#fff1f0;color:#b42318;border:1px solid #ffd5d2;box-shadow:none}.cost-btn-danger:hover{background:#ffe3e0}
        .cost-alert{padding:13px 16px;border-radius:10px;margin-bottom:15px;font-size:13px}.cost-error{background:#fff0ef;color:#a62e27;border:1px solid #ffd8d4}.cost-success{background:#eaf8f1;color:#087653;border:1px solid #d1eee0}
        .cost-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:17px 0 20px}.cost-stat{background:#f8fafb;border:1px solid #e8eef2;border-radius:13px;padding:17px 19px}.cost-stat span{display:block;color:#748698;font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.45px}.cost-stat strong{display:block;color:#18364b;font-size:23px;letter-spacing:-.5px;margin-top:9px}
        .cost-table-wrap{overflow-x:auto;border:1px solid #e8edf1;border-radius:11px}.cost-table{border-collapse:separate;border-spacing:0;width:100%;min-width:1050px;font-size:12px}.cost-table th{background:#f4f7f9;color:#52677a;padding:14px 13px;text-align:left;white-space:nowrap;font-size:10px;text-transform:uppercase;letter-spacing:.45px;border-bottom:1px solid #e5ebef}.cost-table td{padding:13px;border-bottom:1px solid #edf1f4;white-space:nowrap;color:#344d60}.cost-table tbody tr:hover{background:#f8fbfa}.cost-table tbody tr:last-child td{border-bottom:0}.cost-filter{max-width:220px;margin:8px 0 4px}.cost-empty{text-align:center;padding:35px!important;color:#8998a6!important}
        .cost-tabs{display:flex;gap:7px;overflow-x:auto;padding:4px 1px 14px;margin-bottom:5px}.cost-tab{white-space:nowrap;border:1px solid #dfe8ed;background:#fff;color:#52677a;border-radius:9px;padding:10px 13px;font-size:12px;font-weight:750;cursor:pointer}.cost-tab.active{background:#087f65;color:#fff;border-color:#087f65}.cost-period-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.cost-period-controls .cost-select{max-width:190px}.cost-period-controls .cost-input{max-width:180px}.cost-period-range{font-size:11px;color:#748698;font-weight:700}.cost-note{background:#f1f8f5;border:1px solid #dcefe6;color:#567568;padding:12px 14px;border-radius:10px;font-size:12px;line-height:1.5;margin-top:14px}
        @media(max-width:1050px){.cost-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.cost-page{padding:14px}.cost-title{font-size:24px}.cost-panel{padding:17px}.cost-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cost-stats{grid-template-columns:1fr}}
        @media(max-width:460px){.cost-grid{grid-template-columns:1fr}.cost-top{align-items:flex-start}.cost-btn{width:100%}}
      `}</style>

      <div className="cost-wrap">
        <header className="cost-top">
          <div><div className="cost-kicker">Earthy Source · Factory Operations</div><h1 className="cost-title">Daily Production Costing</h1><div className="cost-subtitle">Open the production lot before the shift; edit this same entry at EOD with actual output and costs.</div></div>
          <button className="cost-btn cost-btn-light" type="button" onClick={() => loadEntries().catch((e) => setError(e.message))}>↻ Refresh records</button>
        </header>

        <nav className="cost-tabs">
          {["Dashboard","Daily Costing","Daily Entry","Rate Master","Cost Per Unit","Monthly Summary","Quarterly Summary","Half-Year Summary","Yearly Summary","Calendar"].map((tab) =>
            <button key={tab} type="button" className={activeTab === tab ? "cost-tab active" : "cost-tab"} onClick={() => { setActiveTab(tab); if (tab === "Rate Master" && !rateRows.length) loadRates(); }}>{tab}</button>
          )}
        </nav>

        <section className="cost-panel cost-period-panel">
          <div className="cost-section-head"><span className="cost-step">↔</span><div><h2>Reporting filters</h2><p>Date range and SKU selection apply across every tab, including Dashboard, Cost Per Unit and all summaries.</p></div></div>
          <div className="cost-period-controls">
            <select className="cost-select" value={selectedSkuId} onChange={(e) => setSelectedSkuId(e.target.value)} aria-label="Filter reports by SKU">
              <option value="all">All SKUs</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.volume_ml ? ` (${product.volume_ml} ml)` : ""}</option>)}
            </select>
            <select className="cost-select" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)}>
              <option value="all">All records</option><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half">Half-yearly</option><option value="yearly">Yearly</option><option value="custom">Custom date range</option>
            </select>
            {periodType !== "all" && periodType !== "daily" && periodType !== "custom" && <select className="cost-select" value={periodYear} onChange={(e)=>setPeriodYear(e.target.value)}>{Array.from(new Set([String(new Date().getFullYear()),...entries.map(e=>String(e.production_date).slice(0,4))])).sort().reverse().map(y=><option key={y}>{y}</option>)}</select>}
            {periodType === "monthly" && <select className="cost-select" value={periodMonth} onChange={(e)=>setPeriodMonth(e.target.value)}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={String(m).padStart(2,"0")}>{new Date(2000,m-1,1).toLocaleString("en-IN",{month:"long"})}</option>)}</select>}
            {periodType === "quarterly" && <select className="cost-select" value={periodQuarter} onChange={(e)=>setPeriodQuarter(e.target.value)}><option value="1">Q1 · Jan–Mar</option><option value="2">Q2 · Apr–Jun</option><option value="3">Q3 · Jul–Sep</option><option value="4">Q4 · Oct–Dec</option></select>}
            {periodType === "half" && <select className="cost-select" value={periodHalf} onChange={(e)=>setPeriodHalf(e.target.value)}><option value="1">H1 · Jan–Jun</option><option value="2">H2 · Jul–Dec</option></select>}
            {(periodType === "daily" || periodType === "custom") && <><input className="cost-input" type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)}/>{periodType === "custom" && <input className="cost-input" type="date" value={dateTo} min={dateFrom} onChange={(e)=>setDateTo(e.target.value)}/>}</>}
            <span className="cost-period-range">{periodRange.from} → {periodRange.to}</span>
          </div>
        </section>

        {error && <div className="cost-alert cost-error">{error}</div>}
        {success && <div className="cost-alert cost-success">{success}</div>}

        {activeTab === "Daily Entry" && <form className="cost-panel" onSubmit={submitEntry}>
          <section className="cost-section">
            <div className="cost-section-head"><span className="cost-step">01</span><div><h2>Production details</h2><p>Create the lot before production. Output and actual costs can be entered later using Edit.</p></div></div>
            <div className="cost-grid">
              {field("Production date", "production_date", undefined, "date")}
              <label className="cost-field"><span className="cost-label">Entry type</span><select className="cost-select" value={form.entry_type} onChange={(e) => update("entry_type", e.target.value)}><option value="production">Production</option><option value="changeover">Changeover</option></select></label>
              <label className="cost-field"><span className="cost-label">Shift</span><select className="cost-select" value={form.shift} onChange={(e) => update("shift", e.target.value)}><option>General</option><option>Morning</option><option>Evening</option><option>Night</option></select></label>
              {form.entry_type === "production" && <label className="cost-field"><span className="cost-label">Product / SKU</span><select className="cost-select" value={form.product_id} onChange={(e) => selectProduct(e.target.value)} required><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.volume_ml ? ` (${p.volume_ml} ml)` : ""}</option>)}</select></label>}
              {field("Produced boxes", "produced_boxes")}{field("Rejected boxes", "rejected_boxes")}
              {readonlyField("Good boxes · calculated", goodBoxes.toLocaleString("en-IN"), "Produced minus rejected")}
              {field("Bottles per box", "bottles_per_box")}{field("Start time", "start_time", undefined, "time")}{field("End time", "end_time", undefined, "time")}
              {field("Break hours", "break_hours")}{field("Changeover hours", "changeover_hours")}{field("Productive hours", "productive_hours")}
            </div>
          </section>

          <section className="cost-section">
            <div className="cost-section-head"><span className="cost-step">02</span><div><h2>Preform consumption</h2><p>Enter bags used and remaining, or enter actual consumption directly.</p></div></div>
            <div className="cost-grid">
              {field("Preform 1 bags used", "preform_1_bags_used")}{field("Preform 1 bags remaining", "preform_1_bags_remaining")}
              {field("Preform 2 bags used", "preform_2_bags_used")}{field("Preform 2 bags remaining", "preform_2_bags_remaining")}
            </div>
          </section>

          <section className="cost-section">
            <div className="cost-section-head"><span className="cost-step">03</span><div><h2>Caps, wrapper & labels</h2><p>Capture packaging material usage and rejection.</p></div></div>
            <div className="cost-grid">
              {field("Caps consumed (pieces)", "caps_consumed_pieces", "Optional override; otherwise estimated.")}{field("Rejected bottles", "rejected_bottles")}{field("Rejected caps", "rejected_caps")}
              {field("Wrapper rolls used", "wrapper_rolls_used", "Enter full-roll equivalents used. Roll weight is taken from Rate Master.")}
              {field("Rejected wrapper boxes", "rejected_wrapper_boxes")}{field("Labels consumed (boxes)", "labels_consumed_boxes", "Optional override; defaults to good boxes.")}
            </div>
          </section>

          <section className="cost-section">
            <div className="cost-section-head"><span className="cost-step">04</span><div><h2>Labour & electricity</h2><p>Enter daily labour allocation and meter readings.</p></div></div>
            <div className="cost-grid">
              {field("Total daily labour cost (₹)", "labour_day_total")}{field("Labour allocation hours", "daily_labour_allocation_hours", "Total hours over which daily labour is shared.")}
              {field("Opening meter reading", "opening_kwh")}{field("Closing meter reading", "closing_kwh")}{field("Non-production units", "non_production_kwh")}
              {readonlyField("Electricity units · calculated", electricityUnits.toLocaleString("en-IN", { maximumFractionDigits: 2 }), "(Closing − opening − non-production) × multiplier")}
            </div>
          </section>

          <section className="cost-section">
            <div className="cost-section-head"><span className="cost-step">05</span><div><h2>Selling price & other expenses</h2><p>Enter sales value and any additional production expenses.</p></div></div>
            <div className="cost-grid">
              {field("Selling price per box (₹)", "selling_price_per_box")}{field("Transport / sales expenses (₹)", "transport_sales_expense")}
              <p className="cost-note" style={{gridColumn:"1 / -1"}}>Maintenance, glue & chemicals and other per-box charges are calculated automatically from Rate Master.</p>
              <label className="cost-field" style={{ gridColumn: "1 / -1" }}><span className="cost-label">Production notes</span><textarea className="cost-input" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Add machine issues, wastage details or other observations..." /></label>
            </div>
          </section>

          <div className="cost-note">Tip: You can type continuously in numeric fields. The cursor will stay in the field while you enter multiple digits. Material rates and specifications are taken from Rate Master automatically.</div>
          <div className="cost-actions">
            <button className="cost-btn" type="submit" disabled={saving || loading}>
              {saving ? "Saving costing..." : editingId ? "✓ Update production costing" : "✓ Create / open production lot"}
            </button>
            {editingId
              ? <button className="cost-btn cost-btn-light" type="button" onClick={cancelEdit}>Cancel editing</button>
              : <button className="cost-btn cost-btn-light" type="button" onClick={() => { setForm(initialForm()); setError(""); setSuccess(""); }}>Clear form</button>}
          </div>
        </form>}

        {activeTab === "Daily Entry" && <section className="cost-panel">
          <div className="cost-section-head"><span className="cost-step">06</span><div><h2>Saved costing records</h2><p>Review production output, actual cost and estimated profit.</p></div></div>
          <div className="cost-subtitle">Showing {filteredEntries.length} records for the selected reporting period.</div>
          <div className="cost-stats">
            <div className="cost-stat"><span>Total good boxes</span><strong>{totals.boxes.toLocaleString("en-IN")}</strong></div>
            <div className="cost-stat"><span>Total manufacturing cost</span><strong>{money(totals.cost)}</strong></div>
            <div className="cost-stat"><span>Estimated profit</span><strong>{money(totals.profit)}</strong></div>
          </div>
          {loading ? <div className="cost-empty">Loading costing records...</div> : <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Date</th><th>Product</th><th>Shift</th><th>Produced</th><th>Rejected</th><th>Good</th><th>Production lot</th><th>Total cost</th><th>Cost / box</th><th>Profit</th><th>Action</th></tr></thead><tbody>
            {filteredEntries.map((entry) => <tr key={entry.id}><td>{entry.production_date}</td><td>{entry.product?.name || "—"}</td><td>{entry.shift || "General"}</td><td>{entry.produced_boxes}</td><td>{entry.rejected_boxes}</td><td><strong>{entry.good_boxes}</strong></td><td>{entry.lot?.lot_code || "Not linked"}</td><td>{money(entry.manufacturing_cost)}</td><td>{money(entry.manufacturing_cost_per_box)}</td><td>{money(entry.profit)}</td><td><div className="cost-row-actions"><button className="cost-btn cost-btn-light" type="button" onClick={() => editEntry(entry)} disabled={deletingId === entry.id}>Edit</button><button className="cost-btn cost-btn-danger" type="button" onClick={() => deleteEntry(entry)} disabled={deletingId === entry.id}>{deletingId === entry.id ? "Deleting..." : "Delete"}</button></div></td></tr>)}
            {filteredEntries.length === 0 && <tr><td className="cost-empty" colSpan={11}>No costing entries found for this period.</td></tr>}
          </tbody></table></div>}
        </section>}

        {activeTab !== "Daily Entry" && <section className="cost-panel">
          <div className="cost-section-head"><span className="cost-step">07</span><div><h2>{activeTab}</h2><p>Based on saved Daily Costing entries for {periodRange.from} to {periodRange.to}.</p></div></div>
          <div className="cost-stats">
            <div className="cost-stat"><span>Good boxes</span><strong>{totals.boxes.toLocaleString("en-IN")}</strong></div>
            <div className="cost-stat"><span>Manufacturing cost</span><strong>{money(totals.cost)}</strong></div>
            <div className="cost-stat"><span>Sales revenue</span><strong>{money(totals.sales)}</strong></div>
            <div className="cost-stat"><span>Estimated profit</span><strong>{money(totals.profit)}</strong></div>
          </div>

          {activeTab === "Rate Master" && <div>
            <h3>SKU-wise Preform Configuration</h3>
            <p className="cost-note">Configure two independent preforms for each SKU. Daily Entry automatically uses the selected SKU's active specifications and rates. Leave Preform 2 disabled/not configured when not used.</p>
            {filteredProducts.map((product) => <div key={product.id} className="cost-section" style={{marginBottom:16}}><h3>{product.name}{product.volume_ml ? ` · ${product.volume_ml} ml` : ""}</h3>
              {[1,2].map((slot) => {
                const existing = skuPreforms.find(x=>x.product_id===product.id && Number(x.preform_slot)===slot);
                const row = existing || {product_id:product.id,preform_slot:slot,preform_name:`Preform ${slot}`,grammage_g:"",bag_weight_kg:"",wastage_kg_per_bag:"0",rate_per_kg:"",gst_rate:"18",effective_from:today(),is_active:slot===1};
                const fieldInput = (key:string,label:string,unit:string) => <label className="cost-field"><span className="cost-label">{label} ({unit})</span><input className="cost-input" type="number" step="any" value={row[key] ?? ""} onChange={e=>setSkuPreforms(old=>{const found=old.some(x=>x.product_id===product.id && Number(x.preform_slot)===slot); return found?old.map(x=>x.product_id===product.id && Number(x.preform_slot)===slot?{...x,[key]:e.target.value}:x):[...old,{...row,[key]:e.target.value}];})}/></label>;
                return <div key={slot} className="cost-grid" style={{marginBottom:12}}><div style={{gridColumn:"1 / -1",fontWeight:700}}>Preform {slot} {slot===2?"(Optional)":"(Primary)"}</div>{fieldInput("grammage_g","Grammage","g")}{fieldInput("bag_weight_kg","Bag weight","kg")}{fieldInput("wastage_kg_per_bag","Wastage per bag","kg")}{fieldInput("rate_per_kg","Basic rate","₹/kg")}{fieldInput("gst_rate","GST","%")}
                  <label className="cost-field"><span className="cost-label">Active</span><input type="checkbox" checked={!!row.is_active} onChange={e=>setSkuPreforms(old=>{const found=old.some(x=>x.product_id===product.id && Number(x.preform_slot)===slot); return found?old.map(x=>x.product_id===product.id && Number(x.preform_slot)===slot?{...x,is_active:e.target.checked}:{...x}):[...old,{...row,is_active:e.target.checked}];})}/></label>
                  <div className="cost-field"><span className="cost-label">Effective from</span><input className="cost-input" type="date" value={String(row.effective_from||today()).slice(0,10)} onChange={e=>setSkuPreforms(old=>{const found=old.some(x=>x.product_id===product.id && Number(x.preform_slot)===slot); return found?old.map(x=>x.product_id===product.id && Number(x.preform_slot)===slot?{...x,effective_from:e.target.value}:{...x}):[...old,{...row,effective_from:e.target.value}];})}/></div>
                  <div className="cost-field"><span className="cost-label">&nbsp;</span><button className="cost-btn" type="button" disabled={skuPreformSaving===`${product.id}-${slot}`} onClick={()=>saveSkuPreform(row)}>{skuPreformSaving===`${product.id}-${slot}`?"Saving...":`Save Preform ${slot}`}</button></div>
                </div>;
              })}
            </div>)}
            {filteredProducts.length === 0 && <p className="cost-empty">No SKU matches the selected filter.</p>}
            <p className="cost-note">The general Rate Master below continues to control caps, wrapper, labels, labour, electricity and overheads. Legacy generic preform rows are retained only as fallback for SKUs without a saved SKU-specific setup.</p>
            <p className="cost-note">All material prices, preform specifications, bag weights, per-bag wastage, wrapper roll weight and electricity multiplier are read from this master during every Daily Entry calculation. Daily Entry does not accept separate price/specification overrides.</p>
            {rateLoading ? <p>Loading rates...</p> : <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>GST %</th><th>Effective from</th><th>Action</th></tr></thead><tbody>
              {rateRows.map((r)=><tr key={r.id}><td>{({preform_1_rate_per_kg:"Preform 1 basic rate",preform_2_rate_per_kg:"Preform 2 basic rate",preform_1_weight_g:"Preform 1 gram weight",preform_1_bag_weight_kg:"Preform 1 bag weight",preform_1_wastage_kg_per_bag:"Preform 1 wastage per bag",preform_2_weight_g:"Preform 2 gram weight",preform_2_bag_weight_kg:"Preform 2 bag weight",preform_2_wastage_kg_per_bag:"Preform 2 wastage per bag",wrapper_roll_weight_kg:"Wrapper roll weight",wrapper_boxes_per_roll:"Boxes packed per wrapper roll",meter_factor:"Electricity meter multiplier",preform:"Preform basic rate (legacy fallback)",caps:"Cap basic rate",wrapper:"Wrapper basic rate",labels:"Label rate",electricity:"Day electricity rate",labour:"Labour rate",maintenance:"Maintenance per box",glue_chemicals:"Glue & chemicals per box",other_charges:"Other charges per box",minerals:"Minerals per box"} as Record<string,string>)[r.component_key] || r.component_key}</td><td><input className="cost-input" style={{maxWidth:120}} value={String(r.rate_value ?? "")} onChange={(e)=>updateRate(r.id,"rate_value",e.target.value)}/></td><td>{r.unit || "—"}</td><td><input className="cost-input" style={{maxWidth:90}} value={String(r.gst_rate ?? 0)} onChange={(e)=>updateRate(r.id,"gst_rate",e.target.value)}/></td><td><input className="cost-input" type="date" value={String(r.effective_from || today()).slice(0,10)} onChange={(e)=>updateRate(r.id,"effective_from",e.target.value)}/></td><td><button className="cost-btn" type="button" onClick={()=>saveRate(r)} disabled={rateSaving===r.id}>{rateSaving===r.id?"Saving...":"Save rate"}</button></td></tr>)}
              {rateRows.length===0 && <tr><td colSpan={6} className="cost-empty">No active rate rows found.</td></tr>}
            </tbody></table></div>}
          </div>}

          {activeTab === "Cost Per Unit" && <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Cost component</th><th>Total cost</th><th>Cost / good box</th><th>Cost / bottle</th></tr></thead><tbody>
            {([{label:"Preform",key:"preform_cost"},{label:"Caps",key:"caps_cost"},{label:"Wrapper",key:"wrapper_cost"},{label:"Labels",key:"labels_cost"},{label:"Minerals",key:"minerals_cost"},{label:"Labour",key:"labour_cost"},{label:"Electricity",key:"electricity_cost"},{label:"Maintenance",key:"maintenance_cost"},{label:"Glue & chemicals",key:"glue_chemicals_cost"},{label:"Other charges",key:"other_charges_cost"}] as any[]).map((c)=><tr key={c.key}><td>{c.label}</td><td>{money(filteredEntries.reduce((s,e)=>s+num(e[c.key]),0))}</td><td>{money(totals.boxes?filteredEntries.reduce((s,e)=>s+num(e[c.key]),0)/totals.boxes:0)}</td><td>{money(totals.bottles?filteredEntries.reduce((s,e)=>s+num(e[c.key]),0)/totals.bottles:0)}</td></tr>)}
            <tr><td><strong>Total manufacturing</strong></td><td><strong>{money(totals.cost)}</strong></td><td><strong>{money(totals.boxes?totals.cost/totals.boxes:0)}</strong></td><td><strong>{money(totals.bottles?totals.cost/totals.bottles:0)}</strong></td></tr>
          </tbody></table></div>}

          {["Monthly Summary","Quarterly Summary","Half-Year Summary","Yearly Summary"].includes(activeTab) && <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Period</th><th>Good boxes</th><th>Sales</th><th>Manufacturing cost</th><th>Profit</th><th>Margin %</th><th>Cost / box</th><th>Profit / box</th></tr></thead><tbody>
            {groupedPeriods.map((r)=><tr key={r.period}><td>{r.period}</td><td>{r.boxes.toLocaleString("en-IN")}</td><td>{money(r.sales)}</td><td>{money(r.cost)}</td><td>{money(r.profit)}</td><td>{r.margin.toFixed(2)}%</td><td>{money(r.costPerBox)}</td><td>{money(r.profitPerBox)}</td></tr>)}
            {!groupedPeriods.length && <tr><td colSpan={8} className="cost-empty">No records in this period.</td></tr>}
          </tbody></table></div>}

          {activeTab === "Dashboard" && <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>SKU</th><th>Good boxes</th><th>Sales</th><th>Manufacturing cost</th><th>Profit</th></tr></thead><tbody>
            {filteredProducts.map((p)=>(<tr key={p.id}><td>{p.name}</td><td>{filteredEntries.filter(e=>e.product_id===p.id).reduce((s,e)=>s+num(e.good_boxes),0).toLocaleString("en-IN")}</td><td>{money(filteredEntries.filter(e=>e.product_id===p.id).reduce((s,e)=>s+num(e.sales_revenue,num(e.good_boxes)*num(e.selling_price_per_box)),0))}</td><td>{money(filteredEntries.filter(e=>e.product_id===p.id).reduce((s,e)=>s+num(e.manufacturing_cost),0))}</td><td>{money(filteredEntries.filter(e=>e.product_id===p.id).reduce((s,e)=>s+num(e.profit),0))}</td></tr>))}
          </tbody></table></div>}

          {activeTab === "Daily Costing" && <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Cost component</th><th>Total</th><th>Cost / box</th><th>Cost / bottle</th></tr></thead><tbody>
            {(["preform_cost","caps_cost","wrapper_cost","labels_cost","minerals_cost","labour_cost","electricity_cost","maintenance_cost","glue_chemicals_cost","other_charges_cost"] as string[]).map((key)=><tr key={key}><td>{key.replaceAll("_"," ")}</td><td>{money(filteredEntries.reduce((s,e)=>s+num(e[key]),0))}</td><td>{money(totals.boxes?filteredEntries.reduce((s,e)=>s+num(e[key]),0)/totals.boxes:0)}</td><td>{money(totals.bottles?filteredEntries.reduce((s,e)=>s+num(e[key]),0)/totals.bottles:0)}</td></tr>)}
          </tbody></table></div>}

          {activeTab === "Calendar" && <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Date</th><th>Day</th><th>Month</th><th>Quarter</th><th>Good boxes</th><th>Manufacturing cost</th></tr></thead><tbody>
            {filteredEntries.slice().sort((a,b)=>String(a.production_date).localeCompare(String(b.production_date))).map(e=><tr key={e.id}><td>{e.production_date}</td><td>{new Date(`${e.production_date}T00:00:00`).toLocaleDateString("en-IN",{weekday:"long"})}</td><td>{new Date(`${e.production_date}T00:00:00`).toLocaleDateString("en-IN",{month:"long"})}</td><td>Q{Math.floor((Number(String(e.production_date).slice(5,7))-1)/3)+1}</td><td>{e.good_boxes}</td><td>{money(e.manufacturing_cost)}</td></tr>)}
          </tbody></table></div>}
        </section>}
      </div>
    </main>
  );
}
