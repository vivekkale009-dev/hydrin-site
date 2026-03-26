"use client";
import { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CompleteCommandCenter() {
  const supabase = createClientComponentClient();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>({ 
    orders: [], costs: [], rules: [], vans: [], products: [], 
    expenses: [], salaryAdvances: [], salaryPayments: [] 
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"BREAKDOWN" | "INFLOW">("BREAKDOWN");

  const defaultDates = {
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T'),
    end: new Date().toISOString().split('T')
  };

  const [filters, setFilters] = useState({
    startDate: defaultDates.start,
    endDate: defaultDates.end,
    showSalaries: true,
    showProduction: true,
    showExpenses: true,
    showOwnVan: true,
    showExtVan: true,
    selectedSku: "ALL"
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const fetchAll = async () => {
      try {
        const response = await fetch('/api/admin/dashboard-data');
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        setData(result);
      } catch (err) { console.error("Fetch Error:", err); } 
      finally { setLoading(false); }
    };
    fetchAll();
  }, [mounted]);

  const stats = useMemo(() => {
    let totalRev = 0; let totalPCost = 0; let totalOwnV = 0; let totalExtV = 0;
    const dailyData: any = {};
    
    // Initialize Dates
    let curr = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    while (curr <= end) {
      const dKey = curr.toISOString().split('T');
      dailyData[dKey] = { rev: 0, pCost: 0, ownV: 0, extV: 0, salaries: 0, expenses: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    // Process Orders & SKU Logic
    const filteredOrders = (data.orders || []).filter((o: any) => {
      const d = o.created_at?.split('T');
      const isDateMatch = d >= filters.startDate && d <= filters.endDate;
      
      // If filtering by SKU, only show orders that actually contain that SKU
      const containsSku = filters.selectedSku === "ALL" || 
        o.order_items?.some((item: any) => item.product_id === filters.selectedSku);
      
      return isDateMatch && containsSku;
    }).map((o: any) => {
      // Calculate specific metrics for this order based on SKU filter
      let orderRev = 0;
      let orderPCost = 0;

      o.order_items?.forEach((item: any) => {
        // SKIP items that don't match the selected SKU
        if (filters.selectedSku !== "ALL" && item.product_id !== filters.selectedSku) return;

        // Formula: boxes * (bottles per box) = total bottles
        const totalBottles = Number(item.qty_boxes || 0) * (item.products?.units_per_box || 1);
        
        // Sum of all cost components for this specific product
        const unitCost = data.costs
          .filter((c: any) => c.product_id === item.product_id)
          .reduce((s: number, curr: any) => s + Number(curr.cost_per_unit || 0), 0);

        orderRev += (Number(item.price_per_box || 0) * Number(item.qty_boxes || 0));
        orderPCost += (unitCost * totalBottles);
      });

      const van = data.vans.find((v: any) => v.id === o.van_id);
      const deliveryFee = Number(o.delivery_fee || 0);

      // Add to Daily Totals
      const dKey = o.created_at?.split('T');
      if (dailyData[dKey]) {
        dailyData[dKey].rev += orderRev;
        dailyData[dKey].pCost += orderPCost;
        if (van?.is_owned_by_firm) dailyData[dKey].ownV += deliveryFee;
        else dailyData[dKey].extV += deliveryFee;
      }

      totalRev += orderRev;
      totalPCost += orderPCost;
      if (van?.is_owned_by_firm) totalOwnV += deliveryFee;
      else totalExtV += deliveryFee;

      return { ...o, calculatedRev: orderRev, calculatedCost: orderPCost, isOwnVan: van?.is_owned_by_firm };
    });

    const expTotal = (data.expenses || []).filter((e: any) => {
      const d = (e.expense_date || e.created_at)?.split('T');
      return d >= filters.startDate && d <= filters.endDate;
    }).reduce((a: any, b: any) => a + Number(b.amount || 0), 0);

    const salTotal = [...(data.salaryAdvances || []), ...(data.salaryPayments || [])].filter((s: any) => {
      const d = (s.request_date || s.payment_date || s.created_at)?.split('T');
      return d >= filters.startDate && d <= filters.endDate;
    }).reduce((a: any, b: any) => a + Number(b.amount || 0), 0);

    // Distribute fixed costs over the selected period for the chart
    const daysCount = Object.keys(dailyData).length || 1;
    Object.keys(dailyData).forEach(dk => {
      dailyData[dk].salaries = salTotal / daysCount;
      dailyData[dk].expenses = expTotal / daysCount;
    });

    const inflow = totalRev + (filters.showOwnVan ? totalOwnV : 0);
    const outflow = (filters.showProduction ? totalPCost : 0) + 
                    (filters.showSalaries ? salTotal : 0) + 
                    (filters.showExpenses ? expTotal : 0) + 
                    (filters.showExtVan ? totalExtV : 0);

    return { totalRev, totalPCost, totalOwnV, totalExtV, salTotal, expTotal, inflow, outflow, net: inflow - outflow, dailyData, filteredOrders };
  }, [data, filters]);

  if (!mounted || loading) return <div style={ui.loader}>Analyzing Factory Economics...</div>;

  return (
    <div style={ui.wrapper}>
      <aside style={ui.sidebar}>
        <h2 style={ui.sideTitle}>Factory Command</h2>
        
        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Analysis Period</label>
          <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} style={{ ...ui.select, marginBottom: '10px' }} />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} style={ui.select} />
        </div>

        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Filter by Product (SKU)</label>
          <select value={filters.selectedSku} onChange={(e) => setFilters({ ...filters, selectedSku: e.target.value })} style={ui.select}>
            <option value="ALL">All Products combined</option>
            {data.products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Outflow (What you Give)</label>
          <ToggleBtn label="Salaries" active={filters.showSalaries} onClick={() => setFilters({ ...filters, showSalaries: !filters.showSalaries })} color="#ef4444" />
          <ToggleBtn label="Production Cost" active={filters.showProduction} onClick={() => setFilters({ ...filters, showProduction: !filters.showProduction })} color="#f97316" />
          <ToggleBtn label="External Van Fees" active={filters.showExtVan} onClick={() => setFilters({ ...filters, showExtVan: !filters.showExtVan })} color="#64748b" />
          <ToggleBtn label="General Expenses" active={filters.showExpenses} onClick={() => setFilters({ ...filters, showExpenses: !filters.showExpenses })} color="#8b5cf6" />
        </div>

        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Inflow (What you Earn)</label>
          <ToggleBtn label="Own Van Income" active={filters.showOwnVan} onClick={() => setFilters({ ...filters, showOwnVan: !filters.showOwnVan })} color="#10b981" />
        </div>
      </aside>

      <main style={ui.main}>
        <div style={ui.summaryRow}>
          <div style={{ ...ui.summaryCard, background: '#0f172a', color: '#fff' }}>
            <label style={ui.label}>Final Business Health (Net)</label>
            <div style={{ fontSize: '42px', fontWeight: '900', color: stats.net >= 0 ? '#10b981' : '#ef4444', margin: '10px 0' }}>₹{stats.net.toLocaleString()}</div>
            <div style={{...ui.marginBadge, background: stats.net >= 0 ? '#10b981' : '#ef4444'}}>
                {((stats.net / (stats.inflow || 1)) * 100).toFixed(1)}% {stats.net >= 0 ? 'Profit' : 'Loss'}
            </div>
          </div>

          <div style={ui.graphCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <label style={ui.label}>{viewMode === "BREAKDOWN" ? "Operational Trends" : "Cash In vs Cash Out"}</label>
              <div style={ui.btnGroup}>
                <button onClick={() => setViewMode("BREAKDOWN")} style={viewMode === "BREAKDOWN" ? ui.activeBtn : ui.inactiveBtn}>Trend</button>
                <button onClick={() => setViewMode("INFLOW")} style={viewMode === "INFLOW" ? ui.activeBtn : ui.inactiveBtn}>Summary</button>
              </div>
            </div>
            <div style={ui.chartArea}>
              {viewMode === "BREAKDOWN" ? (
                <TrendChart dailyData={stats.dailyData} filters={filters} />
              ) : (
                <div style={{ width: '100%' }}>
                  <BigBar label="Total Cash Inflow" val={stats.inflow} max={Math.max(stats.inflow, stats.outflow)} color="#10b981" />
                  <div style={{ height: '20px' }} />
                  <BigBar label="Total Cash Outflow" val={stats.outflow} max={Math.max(stats.inflow, stats.outflow)} color="#ef4444" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={ui.orderSection}>
          <div style={ui.sectionHeader}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Live Order Intel {filters.selectedSku !== "ALL" ? `(Filtered SKU)` : ""}</h3>
            <span style={ui.countBadge}>{stats.filteredOrders.length} Orders Found</span>
          </div>
          <table style={ui.table}>
            <thead>
              <tr style={ui.thRow}>
                <th style={ui.th}>Customer / OURN</th>
                <th style={ui.th}>Revenue (SKU)</th>
                <th style={ui.th}>Prod. Cost (SKU)</th>
                <th style={ui.th}>Contribution</th>
                <th style={ui.th}>Van Logic</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.filteredOrders].reverse().map((o: any) => {
                const contribution = o.calculatedRev - o.calculatedCost;
                return (
                  <tr key={o.id} style={ui.row}>
                    <td style={ui.td}>
                      <div style={{ fontWeight: '800' }}>{o.billing_name}</div>
                      <div style={{ fontSize: '10px', color: '#3b82f6' }}>{o.order_number}</div>
                    </td>
                    <td style={ui.td}>₹{o.calculatedRev.toLocaleString()}</td>
                    <td style={ui.td}>₹{o.calculatedCost.toLocaleString()}</td>
                    <td style={{ ...ui.td, fontWeight: '900', color: contribution >= 0 ? '#10b981' : '#ef4444' }}>
                      ₹{contribution.toLocaleString()}
                    </td>
                    <td style={ui.td}>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: o.isOwnVan ? '#10b981' : '#64748b' }}>
                        {o.isOwnVan ? 'OWN (+₹'+o.delivery_fee+')' : 'EXT (-₹'+o.delivery_fee+')'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// Re-usable UI Components (Logic-Integrated)
const TrendChart = ({ dailyData, filters }: any) => {
  const dates = Object.keys(dailyData).sort();
  const width = 500; const height = 120;
  const allValues = dates.flatMap(d => [
    dailyData[d].rev,
    filters.showProduction ? dailyData[d].pCost : 0,
    filters.showSalaries ? dailyData[d].salaries : 0,
    filters.showExpenses ? dailyData[d].expenses : 0
  ]);
  const max = Math.max(...allValues, 1);
  const getPath = (k: string) => dates.map((d, i) => {
    const x = (i / (dates.length - 1 || 1)) * width;
    const y = height - (dailyData[d][k] / max) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const Line = ({ k, color, show }: any) => !show ? null : (
    <path d={getPath(k)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  );

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '140px', overflow: 'visible' }}>
        <Line k="rev" color="#3b82f6" show={true} />
        <Line k="pCost" color="#f97316" show={filters.showProduction} />
        <Line k="salaries" color="#ef4444" show={filters.showSalaries} />
        <Line k="expenses" color="#8b5cf6" show={filters.showExpenses} />
      </svg>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <LegendItem c="#3b82f6" t="Revenue" />
        <LegendItem c="#f97316" t="Prod Cost" />
        <LegendItem c="#ef4444" t="Salaries" />
      </div>
    </div>
  );
};

const LegendItem = ({ c, t }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px', fontWeight: 'bold' }}>
    <div style={{ width: '8px', height: '8px', background: c, marginRight: '4px', borderRadius: '2px' }} /> {t}
  </div>
);

const BigBar = ({ label, val, max, color }: any) => (
  <div style={{ width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '900', marginBottom: '5px' }}>
      <span>{label}</span>
      <span>₹{val.toLocaleString()}</span>
    </div>
    <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(val / (max || 1)) * 100}%`, background: color }} />
    </div>
  </div>
);

const ToggleBtn = ({ label, active, onClick, color }: any) => (
  <button onClick={onClick} style={{ ...ui.toggle, borderColor: active ? color : '#e2e8f0', background: active ? `${color}10` : 'transparent', color: active ? color : '#94a3b8' }}>
    {label}
  </button>
);

const ui: any = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui' },
  sidebar: { width: '280px', background: '#fff', borderRight: '1px solid #e2e8f0', padding: '25px', position: 'sticky', top: 0, height: '100vh' },
  main: { flex: 1, padding: '40px' },
  sideTitle: { fontSize: '20px', fontWeight: '900', marginBottom: '30px' },
  controlGroup: { marginBottom: '25px' },
  groupLabel: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', display: 'block' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: '700' },
  toggle: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid', marginBottom: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '800' },
  summaryRow: { display: 'flex', gap: '30px', marginBottom: '40px' },
  summaryCard: { flex: 1, padding: '35px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  graphCard: { flex: 2, background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' },
  chartArea: { height: '160px', display: 'flex', alignItems: 'center' },
  btnGroup: { background: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'flex' },
  activeBtn: { background: '#fff', border: 'none', padding: '6px 15px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' },
  inactiveBtn: { background: 'none', border: 'none', padding: '6px 15px', fontSize: '10px', fontWeight: '700', color: '#64748b' },
  marginBadge: { padding: '6px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: '900', display: 'inline-block' },
  orderSection: { background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  sectionHeader: { padding: '25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  countBadge: { background: '#0f172a', color: '#fff', padding: '5px 12px', borderRadius: '10px', fontSize: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc' },
  th: { padding: '15px 25px', fontSize: '10px', color: '#94a3b8', textAlign: 'left', textTransform: 'uppercase' },
  row: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '18px 25px', fontSize: '12px' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' },
  label: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }
};