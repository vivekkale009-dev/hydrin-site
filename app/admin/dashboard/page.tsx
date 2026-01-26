"use client";
import { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CompleteCommandCenter() {
  const supabase = createClientComponentClient();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>({ orders: [], costs: [], rules: [], vans: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"BREAKDOWN" | "INFLOW">("BREAKDOWN");

  const defaultDates = {
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
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
        const { data: o } = await supabase
          .from('orders_with_details')
          .select('*, order_items(*, products(*))')
          .order('created_at', { ascending: true });

        const { data: c } = await supabase.from('product_cost_components').select('*');
        const { data: r } = await supabase.from('business_rules').select('*');
        const { data: v } = await supabase.from('vans').select('*');
        const { data: p } = await supabase.from('products').select('*');

        setData({ orders: o || [], costs: c || [], rules: r || [], vans: v || [], products: p || [] });
      } catch (err) {
        console.error("Critical Engine Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [mounted]);

  const filteredOrders = useMemo(() => {
    return data.orders.filter((o: any) => {
      const date = o.created_at?.split('T')[0];
      const van = data.vans.find((v: any) => v.id === o.van_id);
      const isDateMatch = date >= filters.startDate && date <= filters.endDate;
      const isVanMatch = van?.is_owned_by_firm ? filters.showOwnVan : filters.showExtVan;
      return isDateMatch && isVanMatch;
    });
  }, [data.orders, filters]);

  const stats = useMemo(() => {
    let rev = 0; let pCost = 0; let ownV = 0; let extV = 0;
    const dailyData: any = {};

    filteredOrders.forEach((o: any) => {
      const dateKey = o.created_at?.split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { rev: 0, pCost: 0, ownV: 0, extV: 0, salaries: 0, expenses: 0 };
      }

      let orderRev = 0;
      let orderPCost = 0;
      o.order_items?.forEach((item: any) => {
        if (filters.selectedSku !== "ALL" && item.product_id !== filters.selectedSku) return;

        const units = Number(item.qty_boxes || 0) * (item.products?.units_per_box || 1);
        const unitCost = data.costs
          .filter((c: any) => c.product_id === item.product_id)
          .reduce((s: number, curr: any) => s + Number(curr.cost_per_unit || 0), 0);

        orderRev += (Number(item.price_per_box || 0) * Number(item.qty_boxes || 0));
        orderPCost += (unitCost * units);
      });

      dailyData[dateKey].rev += orderRev;
      dailyData[dateKey].pCost += orderPCost;
      rev += orderRev;
      pCost += orderPCost;

      const van = data.vans.find((v: any) => v.id === o.van_id);
      const fee = Number(o.delivery_fee || 0);
      if (van?.is_owned_by_firm) {
        ownV += fee;
        dailyData[dateKey].ownV += fee;
      } else {
        extV += fee;
        dailyData[dateKey].extV += fee;
      }
    });

    const salTotal = data.rules.filter((r: any) => r.key.toUpperCase().includes('SALARY')).reduce((a: any, b: any) => a + Number(b.value_number || 0), 0);
    const expTotal = data.rules.filter((r: any) => r.key.toUpperCase().includes('EXPENSE') || r.key.toUpperCase().includes('BILL')).reduce((a: any, b: any) => a + Number(b.value_number || 0), 0);

    // Spread global rules across active dates for the trend lines
    const dateKeys = Object.keys(dailyData);
    dateKeys.forEach(dk => {
      dailyData[dk].salaries = salTotal / (dateKeys.length || 1);
      dailyData[dk].expenses = expTotal / (dateKeys.length || 1);
    });

    const totalIncome = rev + (filters.showOwnVan ? ownV : 0);
    const totalOutflow = (filters.showProduction ? pCost : 0) + (filters.showSalaries ? salTotal : 0) + (filters.showExpenses ? expTotal : 0) + (filters.showExtVan ? extV : 0);

    return { rev, pCost, ownV, extV, salaries: salTotal, expenses: expTotal, totalIncome, totalOutflow, net: totalIncome - totalOutflow, dailyData };
  }, [filteredOrders, data, filters]);

  if (!mounted || loading) return <div style={ui.loader}>Configuring Factory Data...</div>;

  return (
    <div style={ui.wrapper}>
      <aside style={ui.sidebar}>
        <h2 style={ui.sideTitle}>Command Center</h2>
        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Date Range</label>
          <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} style={{ ...ui.select, marginBottom: '10px' }} />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} style={ui.select} />
        </div>

        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Target Product</label>
          <select value={filters.selectedSku} onChange={(e) => setFilters({ ...filters, selectedSku: e.target.value })} style={ui.select}>
            <option value="ALL">Full Factory View</option>
            {data.products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Cost Toggles</label>
          <ToggleBtn label="Salaries" active={filters.showSalaries} onClick={() => setFilters({ ...filters, showSalaries: !filters.showSalaries })} color="#ef4444" />
          <ToggleBtn label="Production Cost" active={filters.showProduction} onClick={() => setFilters({ ...filters, showProduction: !filters.showProduction })} color="#f97316" />
          <ToggleBtn label="Expenses/Bills" active={filters.showExpenses} onClick={() => setFilters({ ...filters, showExpenses: !filters.showExpenses })} color="#8b5cf6" />
        </div>

        <div style={ui.controlGroup}>
          <label style={ui.groupLabel}>Logistics</label>
          <ToggleBtn label="Own Van Income" active={filters.showOwnVan} onClick={() => setFilters({ ...filters, showOwnVan: !filters.showOwnVan })} color="#10b981" />
          <ToggleBtn label="3rd Party Outgo" active={filters.showExtVan} onClick={() => setFilters({ ...filters, showExtVan: !filters.showExtVan })} color="#64748b" />
        </div>
        <div style={{ height: '50px' }} /> {/* Buffer for scrolling */}
      </aside>

      <main style={ui.main}>
        <div style={ui.summaryRow}>
          <div style={{ ...ui.summaryCard, background: '#0f172a', color: '#fff' }}>
            <label style={ui.label}>Final Net Profit</label>
            <div style={{ fontSize: '42px', fontWeight: '900', color: stats.net >= 0 ? '#10b981' : '#ef4444', margin: '10px 0' }}>₹{stats.net.toLocaleString()}</div>
            <div style={ui.marginBadge}>{((stats.net / (stats.totalIncome || 1)) * 100).toFixed(1)}% Margin</div>
          </div>

          <div style={ui.graphCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <label style={ui.label}>{viewMode === "BREAKDOWN" ? "Operations Trend (All Metrics)" : "Total Cash Flow"}</label>
              <div style={ui.btnGroup}>
                <button onClick={() => setViewMode("BREAKDOWN")} style={viewMode === "BREAKDOWN" ? ui.activeBtn : ui.inactiveBtn}>Trend View</button>
                <button onClick={() => setViewMode("INFLOW")} style={viewMode === "INFLOW" ? ui.activeBtn : ui.inactiveBtn}>Summary</button>
              </div>
            </div>
            <div style={ui.chartArea}>
              {viewMode === "BREAKDOWN" ? (
                <TrendChart dailyData={stats.dailyData} filters={filters} />
              ) : (
                <div style={{ width: '100%' }}>
                  <BigBar label="Inflow" val={stats.totalIncome} max={stats.totalIncome} color="#10b981" />
                  <div style={{ height: '20px' }} />
                  <BigBar label="Outflow" val={stats.totalOutflow} max={stats.totalIncome} color="#ef4444" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={ui.orderSection}>
          <div style={ui.sectionHeader}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Live Order Intel</h3>
            <span style={ui.countBadge}>{filteredOrders.length} Records Found</span>
          </div>
          <table style={ui.table}>
            <thead>
              <tr style={ui.thRow}>
                <th style={ui.th}>OURN / Customer</th>
                <th style={ui.th}>Revenue</th>
                <th style={ui.th}>Production Cost</th>
                <th style={ui.th}>Net Contribution</th>
                <th style={ui.th}>Logistics</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredOrders].reverse().map((o: any) => {
                const van = data.vans.find((v: any) => v.id === o.van_id);
                const orderCost = o.order_items?.reduce((acc: number, item: any) => {
                  const unitCost = data.costs.filter((c: any) => c.product_id === item.product_id).reduce((s: number, curr: any) => s + Number(curr.cost_per_unit || 0), 0);
                  return acc + (unitCost * (item.qty_boxes || 0) * (item.products?.units_per_box || 1));
                }, 0) || 0;
                const revenue = Number(o.total_payable_amount || 0);
                const orderMargin = revenue - orderCost;

                return (
                  <tr key={o.id} style={ui.row}>
                    <td style={ui.td}>
                      <div style={{ fontWeight: '800', color: '#1e293b' }}>{o.billing_name}</div>
                      <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>{o.ourn_number || o.uorn || 'N/A'}</div>
                    </td>
                    <td style={ui.td}>₹{revenue.toLocaleString()}</td>
                    <td style={ui.td}>₹{orderCost.toLocaleString()}</td>
                    <td style={{ ...ui.td, fontWeight: '900', color: orderMargin <= 0 ? '#ef4444' : '#10b981' }}>
                      ₹{Math.abs(orderMargin).toLocaleString()} {orderMargin <= 0 ? '↓' : '↑'}
                    </td>
                    <td style={ui.td}>
                      <div style={{ fontSize: '11px', fontWeight: '900' }}>{van?.is_owned_by_firm ? 'OWN' : 'EXT'}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Fee: ₹{o.delivery_fee}</div>
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

const TrendChart = ({ dailyData, filters }: any) => {
  const dates = Object.keys(dailyData).sort();
  const width = 500;
  const height = 120;

  // Find max value across all active metrics to scale graph
  const allValues = dates.flatMap(d => [
    dailyData[d].rev,
    filters.showProduction ? dailyData[d].pCost : 0,
    filters.showSalaries ? dailyData[d].salaries : 0,
    filters.showExpenses ? dailyData[d].expenses : 0,
    filters.showOwnVan ? dailyData[d].ownV : 0,
    filters.showExtVan ? dailyData[d].extV : 0
  ]);
  const max = Math.max(...allValues, 1);

  const getPath = (key: string) => {
    return dates.map((d, i) => {
      const x = (i / (dates.length - 1 || 1)) * width;
      const y = height - (dailyData[d][key] / max) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const Line = ({ k, color, show }: any) => !show ? null : (
    <g>
      <path d={getPath(k)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: '0.3s' }} />
      {dates.map((d, i) => (
        <circle key={i} cx={(i / (dates.length - 1 || 1)) * width} cy={height - (dailyData[d][k] / max) * height} r="3" fill="#fff" stroke={color} strokeWidth="1.5">
          <title>{`${k.toUpperCase()}: ₹${dailyData[d][k].toLocaleString()}`}</title>
        </circle>
      ))}
    </g>
  );

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '140px', overflow: 'visible' }}>
        <Line k="rev" color="#3b82f6" show={true} />
        <Line k="pCost" color="#f97316" show={filters.showProduction} />
        <Line k="salaries" color="#ef4444" show={filters.showSalaries} />
        <Line k="expenses" color="#8b5cf6" show={filters.showExpenses} />
        <Line k="ownV" color="#10b981" show={filters.showOwnVan} />
        <Line k="extV" color="#64748b" show={filters.showExtVan} />
      </svg>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
        <LegendItem c="#3b82f6" t="Revenue" />
        {filters.showProduction && <LegendItem c="#f97316" t="Prod Cost" />}
        {filters.showSalaries && <LegendItem c="#ef4444" t="Salaries" />}
        {filters.showExpenses && <LegendItem c="#8b5cf6" t="Bills" />}
        {filters.showOwnVan && <LegendItem c="#10b981" t="Own Van" />}
        {filters.showExtVan && <LegendItem c="#64748b" t="Ext Van" />}
      </div>
    </div>
  );
};

const LegendItem = ({ c, t }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>
    <div style={{ width: '8px', height: '8px', background: c, borderRadius: '2px', marginRight: '4px' }} /> {t}
  </div>
);

const BigBar = ({ label, val, max, color }: any) => (
  <div style={{ width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', fontWeight: '900' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span>₹{val.toLocaleString()}</span>
    </div>
    <div style={{ height: '20px', width: '100%', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(val / (max || 1)) * 100}%`, background: color }} />
    </div>
  </div>
);

const ToggleBtn = ({ label, active, onClick, color }: any) => (
  <button onClick={onClick} style={{ ...ui.toggle, borderColor: active ? color : '#e2e8f0', background: active ? `${color}15` : 'transparent', color: active ? color : '#94a3b8' }}>
    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? color : '#e2e8f0', marginRight: '10px' }} />
    {label}
  </button>
);

const ui: any = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui' },
  sidebar: { 
    width: '260px', 
    background: '#fff', 
    borderRight: '1px solid #e2e8f0', 
    padding: '25px', 
    position: 'sticky', 
    top: 0, 
    height: '100vh',
    overflowY: 'auto' // FIX: Sidebar scrollable
  },
  main: { flex: 1, padding: '40px' },
  sideTitle: { fontSize: '18px', fontWeight: '900', marginBottom: '30px' },
  controlGroup: { marginBottom: '30px' },
  groupLabel: { fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '10px' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: '700' },
  toggle: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid', marginBottom: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center' },
  summaryRow: { display: 'flex', gap: '30px', marginBottom: '40px' },
  summaryCard: { flex: 1, padding: '35px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  graphCard: { flex: 2, background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' },
  btnGroup: { background: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'flex' },
  activeBtn: { background: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  inactiveBtn: { background: 'none', border: 'none', padding: '6px 14px', fontSize: '10px', fontWeight: '700', color: '#64748b' },
  chartArea: { height: '180px', display: 'flex', alignItems: 'center' },
  marginBadge: { background: '#10b981', color: '#fff', padding: '6px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: '900', display: 'inline-block' },
  orderSection: { background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  sectionHeader: { padding: '25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' },
  countBadge: { background: '#0f172a', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', color: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc' },
  th: { padding: '15px 25px', fontSize: '10px', color: '#94a3b8', textAlign: 'left', textTransform: 'uppercase' },
  row: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '20px 25px', fontSize: '12px' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#0f172a' },
  label: { fontSize: '10px', fontWeight: '900', color: '#94a3b8' }
};