
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import './stock-dashboard.css'

type DashboardData = {
  summary: any
  byProduct: any[]
  byLocation: any[]
  lots: any[]
  stockUnits: any[]
  movements: any[]
  recentRegistrations: any[]
  qrSummary: any
  generatedAt: string
}

const fmt = (n: any) => Number(n || 0).toLocaleString('en-IN')

const date = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const dateTime = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const movementLabel = (value: string) =>
  String(value || '').replaceAll('_', ' ')

function Status({ value }: { value: string }) {
  const status = String(value || 'unknown').toLowerCase()
  return <span className={`stock-status status-${status}`}>
    <i />{movementLabel(status)}
  </span>
}

function Metric({
  label, value, note, icon, variant = '',
}: {
  label: string
  value: any
  note: string
  icon: string
  variant?: string
}) {
  return (
    <div className={`stock-metric ${variant}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{fmt(value)}</div>
      <div className="metric-note">{note}</div>
    </div>
  )
}

function Section({
  title, subtitle, action, children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="stock-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function AdminStockDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('stock')

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const response = await fetch('/api/admin/stock/dashboard', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to load dashboard.')
      }

      setData(result)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const filteredStock = useMemo(() => {
    if (!data) return []

    return data.stockUnits.filter((row: any) => {
      const matchesProduct =
        productFilter === 'all' || row.product_id === productFilter

      const text = [
        row.lot_code, row.product_name, row.location_name,
        row.qr_token_short, row.status,
      ].join(' ').toLowerCase()

      return matchesProduct && text.includes(search.toLowerCase())
    })
  }, [data, productFilter, search])

  const filteredLots = useMemo(() => {
    if (!data) return []
    return data.lots.filter((lot: any) =>
      [
        lot.lot_code, lot.product_name, lot.production_shift, lot.status,
      ].join(' ').toLowerCase().includes(search.toLowerCase())
    )
  }, [data, search])

  if (loading) {
    return <main className="stock-page">
      <div className="stock-loading">
        <div className="stock-loader" />
        Loading inventory dashboard...
      </div>
    </main>
  }

  if (!data) {
    return <main className="stock-page">
      <div className="stock-error">
        <h2>Unable to load inventory</h2>
        <p>{error || 'Please try again.'}</p>
        <button className="stock-primary-btn" onClick={() => loadDashboard()}>
          Try again
        </button>
      </div>
    </main>
  }

  const s = data.summary

  return (
    <main className="stock-page">
      <div className="stock-container">

        {/* Page header */}
        <header className="stock-header">
          <div>
            <div className="stock-eyebrow">
              <span className="live-dot" /> EARTHY SOURCE
              <span className="eyebrow-divider">/</span>
              INVENTORY MANAGEMENT
            </div>
            <h1>Stock Overview</h1>
            <p className="stock-header-subtitle">
              Monitor finished goods, production lots and warehouse inventory.
            </p>
          </div>

          <div className="stock-header-actions">
            <div className="stock-updated">
              <span className="live-dot" />
              Live data
            </div>
            <button
              className="stock-primary-btn"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              <span className={refreshing ? 'spin' : ''}>↻</span>
              {refreshing ? 'Refreshing' : 'Refresh data'}
            </button>
          </div>
        </header>

        {error && (
          <div className="stock-alert">
            {error} — showing the last successfully loaded data.
          </div>
        )}

        {/* Main inventory highlight */}
        <div className="stock-hero">
          <div className="stock-hero-content">
            <div className="stock-hero-label">
              <span className="hero-icon">▦</span>
              TOTAL AVAILABLE INVENTORY
            </div>
            <div className="stock-hero-number">
              {fmt(s.availableBoxes)}
              <span>boxes</span>
            </div>
            <p>Finished goods currently available for dispatch</p>
          </div>
          <div className="stock-hero-side">
            <div className="hero-side-item">
              <span>Registered stock units</span>
              <strong>{fmt(s.totalStockUnits)}</strong>
            </div>
            <div className="hero-side-item">
              <span>Active production lots</span>
              <strong>{fmt(s.activeLots)}</strong>
            </div>
            <div className="hero-side-item">
              <span>Registered QR labels</span>
              <strong>{fmt(s.registeredQrs)}</strong>
            </div>
          </div>
          <div className="hero-decoration">ES</div>
        </div>

        {/* KPI cards */}
        <div className="stock-metric-grid">
          <Metric
            label="Total produced"
            value={s.totalProducedBoxes}
            note="QR-registered boxes"
            icon="▤"
          />
          <Metric
            label="Dispatched"
            value={s.dispatchedBoxes}
            note="Recorded dispatch quantity"
            icon="↗"
          />
          <Metric
            label="Quality hold"
            value={s.qualityHoldBoxes}
            note="Restricted stock"
            icon="◇"
            variant="metric-warning"
          />
          <Metric
            label="Scrapped"
            value={s.scrappedBoxes}
            note="Recorded scrap quantity"
            icon="⌁"
            variant="metric-muted"
          />
        </div>

        {/* QR overview */}
        <div className="qr-overview">
          <div className="qr-overview-title">
            <div className="qr-overview-icon">⌗</div>
            <div>
              <strong>QR label overview</strong>
              <span>Production identification system</span>
            </div>
          </div>
          <div className="qr-stat">
            <strong>{fmt(data.qrSummary.registered)}</strong>
            <span>Registered</span>
          </div>
          <div className="qr-stat">
            <strong>{fmt(data.qrSummary.unused)}</strong>
            <span>Unused</span>
          </div>
          <div className="qr-stat">
            <strong>{fmt(data.qrSummary.cancelled)}</strong>
            <span>Cancelled</span>
          </div>
          <div className="qr-stat qr-stat-total">
            <strong>{fmt(data.qrSummary.total)}</strong>
            <span>Total labels</span>
          </div>
        </div>

        {/* SKU overview */}
        <Section
          title="Inventory by product"
          subtitle="Available finished stock across all registered SKUs"
        >
          {data.byProduct.length === 0 ? (
            <div className="stock-empty">No production stock registered yet.</div>
          ) : (
            <div className="product-grid">
              {data.byProduct.map((p: any, index: number) => {
                const share = s.availableBoxes > 0
                  ? Math.round(p.availableBoxes / s.availableBoxes * 100)
                  : 0

                return (
                  <div className="product-card" key={p.productId}>
                    <div className="product-card-top">
                      <div className={`product-symbol product-symbol-${index % 3}`}>
                        {p.volumeMl ? `${p.volumeMl}` : 'SKU'}
                      </div>
                      <span className="product-card-tag">ACTIVE STOCK</span>
                    </div>
                    <h3>{p.productName}</h3>
                    <div className="product-available">
                      {fmt(p.availableBoxes)}
                      <span>boxes available</span>
                    </div>
                    <div className="product-progress">
                      <div style={{ width: `${share}%` }} />
                    </div>
                    <div className="product-card-bottom">
                      <span>{share}% of available inventory</span>
                      <span>{fmt(p.stockUnits)} stock units</span>
                    </div>
                    <div className="product-mini-stats">
                      <div>
                        <span>Produced</span>
                        <strong>{fmt(p.producedBoxes)}</strong>
                      </div>
                      <div>
                        <span>Dispatched</span>
                        <strong>{fmt(p.dispatchedBoxes)}</strong>
                      </div>
                      <div>
                        <span>Quality hold</span>
                        <strong>{fmt(p.qualityHoldBoxes)}</strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Location table */}
        <Section
          title="Warehouse locations"
          subtitle="Finished stock grouped by physical storage location"
        >
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Storage location</th>
                  <th>Location code</th>
                  <th>Type</th>
                  <th>Stock units</th>
                  <th>Available boxes</th>
                  <th>Quality hold</th>
                </tr>
              </thead>
              <tbody>
                {data.byLocation.map((location: any) => (
                  <tr key={location.locationId}>
                    <td>
                      <div className="location-cell">
                        <span className="location-icon">▦</span>
                        <strong>{location.locationName}</strong>
                      </div>
                    </td>
                    <td><span className="code-tag">{location.locationCode}</span></td>
                    <td className="capitalize">{movementLabel(location.locationType)}</td>
                    <td>{fmt(location.stockUnits)}</td>
                    <td className="table-strong">{fmt(location.availableBoxes)}</td>
                    <td>{fmt(location.qualityHoldBoxes)}</td>
                  </tr>
                ))}
                {data.byLocation.length === 0 && (
                  <tr><td colSpan={6}>No storage locations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Register tabs */}
        <Section
          title="Inventory register"
          subtitle="Detailed tracking of each production stock entry"
          action={
            <span className="register-count">
              {fmt(filteredStock.length)} stock units
            </span>
          }
        >
          <div className="register-tabs">
            <button
              className={activeTab === 'stock' ? 'active' : ''}
              onClick={() => setActiveTab('stock')}
            >
              Stock units
            </button>
            <button
              className={activeTab === 'lots' ? 'active' : ''}
              onClick={() => setActiveTab('lots')}
            >
              Production lots
            </button>
            <button
              className={activeTab === 'registrations' ? 'active' : ''}
              onClick={() => setActiveTab('registrations')}
            >
              QR registrations
            </button>
            <button
              className={activeTab === 'movements' ? 'active' : ''}
              onClick={() => setActiveTab('movements')}
            >
              Movement history
            </button>
          </div>

          <div className="register-toolbar">
            <div className="stock-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search lot, product, location..."
              />
            </div>
            {activeTab === 'stock' && (
              <select
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                className="stock-filter"
              >
                <option value="all">All products</option>
                {data.byProduct.map((p: any) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeTab === 'stock' && (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Production lot</th>
                    <th>Product</th>
                    <th>Storage location</th>
                    <th>Original</th>
                    <th>Available</th>
                    <th>Dispatched</th>
                    <th>Status</th>
                    <th>QR reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((row: any) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.lot_code}</strong>
                        <small>{date(row.production_date)}</small>
                      </td>
                      <td>{row.product_name}</td>
                      <td>{row.location_name}</td>
                      <td>{fmt(row.original_boxes)}</td>
                      <td className="table-strong">{fmt(row.available_boxes)}</td>
                      <td>{fmt(row.dispatched_boxes)}</td>
                      <td><Status value={row.status} /></td>
                      <td><span className="code-tag">{row.qr_token_short || '—'}</span></td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr><td colSpan={8}>No matching stock units.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'lots' && (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Lot number</th>
                    <th>Production date</th>
                    <th>Product</th>
                    <th>Shift</th>
                    <th>Produced</th>
                    <th>Available</th>
                    <th>Dispatched</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.map((lot: any) => (
                    <tr key={lot.id}>
                      <td><strong>{lot.lot_code}</strong></td>
                      <td>{date(lot.production_date)}</td>
                      <td>{lot.product_name}</td>
                      <td>{lot.production_shift || '—'}</td>
                      <td>{fmt(lot.produced_boxes)}</td>
                      <td className="table-strong">{fmt(lot.available_boxes)}</td>
                      <td>{fmt(lot.dispatched_boxes)}</td>
                      <td><Status value={lot.status} /></td>
                    </tr>
                  ))}
                  {filteredLots.length === 0 && (
                    <tr><td colSpan={8}>No matching production lots.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'registrations' && (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Registration date</th>
                    <th>Lot</th>
                    <th>Product</th>
                    <th>Boxes</th>
                    <th>Location</th>
                    <th>QR status</th>
                    <th>QR reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRegistrations
                    .filter((row: any) => [
                      row.lot_code, row.product_name, row.location_name,
                      row.qr_token_short,
                    ].join(' ').toLowerCase().includes(search.toLowerCase()))
                    .map((row: any) => (
                      <tr key={row.id}>
                        <td>{dateTime(row.registered_at)}</td>
                        <td><strong>{row.lot_code}</strong></td>
                        <td>{row.product_name}</td>
                        <td className="table-strong">{fmt(row.original_boxes)}</td>
                        <td>{row.location_name}</td>
                        <td><Status value={row.qr_status} /></td>
                        <td><span className="code-tag">{row.qr_token_short}</span></td>
                      </tr>
                    ))}
                  {data.recentRegistrations.length === 0 && (
                    <tr><td colSpan={7}>No QR registrations found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Date / time</th>
                    <th>Movement</th>
                    <th>Product</th>
                    <th>Lot</th>
                    <th>Quantity</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Performed by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements
                    .filter((row: any) => [
                      row.product_name, row.lot_code, row.movement_type,
                      row.performed_by, row.from_location, row.to_location,
                    ].join(' ').toLowerCase().includes(search.toLowerCase()))
                    .map((row: any) => (
                      <tr key={row.id}>
                        <td>{dateTime(row.created_at)}</td>
                        <td><Status value={row.movement_type} /></td>
                        <td>{row.product_name}</td>
                        <td>{row.lot_code}</td>
                        <td className="table-strong">{fmt(row.quantity_boxes)}</td>
                        <td>{row.from_location || '—'}</td>
                        <td>{row.to_location || '—'}</td>
                        <td>{row.performed_by || '—'}</td>
                      </tr>
                    ))}
                  {data.movements.length === 0 && (
                    <tr><td colSpan={8}>No movements recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <footer className="stock-footer">
          <span>EARTHY SOURCE FOODS AND BEVERAGES</span>
          <span>Inventory data · Last refreshed {dateTime(data.generatedAt)}</span>
        </footer>
      </div>
    </main>
  )
}
