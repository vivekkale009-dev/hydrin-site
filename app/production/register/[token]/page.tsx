'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Product = {
  id: string
  name: string
  volume_ml: number | null
  units_per_box: number | null
}

type Location = {
  id: string
  location_code: string
  location_name: string
  location_type: string
}

export default function ProductionRegistrationPage() {
  const params = useParams()
  const token = String(params.token || '')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState<any>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  const [pin, setPin] = useState('')
  const [productId, setProductId] = useState('')
  const [quantityBoxes, setQuantityBoxes] = useState('')
  const [locationId, setLocationId] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [shift, setShift] = useState('General')

  useEffect(() => {
    if (!token) return

    async function loadData() {
      try {
        const response = await fetch(
          `/api/production/register/${encodeURIComponent(token)}`,
          { cache: 'no-store' }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          setPageError(data.message || 'Unable to load this QR code.')
          return
        }

        setProducts(data.products || [])
        setLocations(data.locations || [])
      } catch {
        setPageError('Unable to connect. Please check your internet connection.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPageError('')

    if (!pin || !productId || !quantityBoxes || !locationId || !workerName.trim()) {
      setPageError('Please fill in all fields.')
      return
    }

    const quantity = Number(quantityBoxes)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setPageError('Enter a valid number of boxes.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(
        `/api/production/register/${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin,
            productId,
            quantityBoxes: quantity,
            locationId,
            workerName: workerName.trim(),
            shift,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        setPageError(data.message || 'Registration failed.')
        return
      }

      setSuccess(data.result)
    } catch {
      setPageError('Unable to submit registration. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProduct = products.find(p => p.id === productId)
  const selectedLocation = locations.find(l => l.id === locationId)

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      background: '#f3f6f4',
      padding: '24px 14px',
      fontFamily: 'Arial, sans-serif',
      color: '#17251d',
    },
    container: {
      maxWidth: 480,
      margin: '0 auto',
    },
    card: {
      background: '#ffffff',
      border: '1px solid #e1e8e3',
      borderRadius: 16,
      padding: 22,
      boxShadow: '0 5px 22px rgba(0,0,0,0.05)',
    },
    heading: {
      fontSize: 23,
      fontWeight: 800,
      margin: '0 0 6px',
      color: '#164b32',
    },
    subtitle: {
      fontSize: 13,
      color: '#64746a',
      margin: '0 0 22px',
      lineHeight: 1.5,
    },
    label: {
      display: 'block',
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 7,
      color: '#34463a',
    },
    input: {
      width: '100%',
      height: 47,
      padding: '0 12px',
      border: '1px solid #cbd7ce',
      borderRadius: 9,
      background: '#fff',
      fontSize: 16,
      color: '#17251d',
      boxSizing: 'border-box',
      outlineColor: '#28734c',
    },
    field: {
      marginBottom: 17,
    },
    button: {
      width: '100%',
      height: 50,
      border: 0,
      borderRadius: 10,
      background: '#17633d',
      color: '#fff',
      fontWeight: 700,
      fontSize: 16,
      cursor: 'pointer',
      marginTop: 6,
    },
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>Loading QR registration...</div>
        </div>
      </main>
    )
  }

  if (pageError && products.length === 0 && !success) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.heading}>Production Registration</h1>
            <p style={{ color: '#b42318', lineHeight: 1.6 }}>{pageError}</p>
            <p style={{ fontSize: 13, color: '#64746a' }}>
              Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 48, color: '#16834b' }}>✓</div>
              <h1 style={{ ...styles.heading, marginTop: 12 }}>
                Registration Successful
              </h1>
              <p style={{ color: '#64746a', fontSize: 14 }}>
                Production stock has been added to inventory.
              </p>
            </div>

            <div style={{
              background: '#f1f7f3',
              borderRadius: 11,
              padding: 16,
              marginTop: 14,
              lineHeight: 1.9,
              fontSize: 14,
            }}>
              <div><strong>Lot number:</strong> {success.lot_code}</div>
              <div><strong>Boxes registered:</strong> {success.quantity_boxes}</div>
              <div><strong>Stock reference:</strong> {success.stock_unit_id}</div>
            </div>

            <p style={{
              fontSize: 13,
              color: '#64746a',
              textAlign: 'center',
              marginTop: 20,
            }}>
              This QR code has now been used and cannot be registered again.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 2,
            color: '#28734c',
            marginBottom: 8,
          }}>
            EARTHY SOURCE
          </div>
          <h1 style={styles.heading}>Production Stock Entry</h1>
          <p style={{ ...styles.subtitle, marginBottom: 0 }}>
            Scan QR and register the finished stock.
          </p>
        </div>

        <form style={styles.card} onSubmit={handleSubmit}>
          {pageError && (
            <div style={{
              background: '#fff1f0',
              color: '#b42318',
              border: '1px solid #ffd0cc',
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 17,
            }}>
              {pageError}
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Daily Production PIN</label>
            <input
              style={styles.input}
              value={pin}
              onChange={e => setPin(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="Enter 5-character PIN"
              maxLength={5}
              autoComplete="off"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Product / SKU</label>
            <select
              style={styles.input}
              value={productId}
              onChange={e => setProductId(e.target.value)}
              required
            >
              <option value="">Select product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.volume_ml ? ` — ${product.volume_ml} ml` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Number of Boxes</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              step="1"
              value={quantityBoxes}
              onChange={e => setQuantityBoxes(e.target.value)}
              placeholder="e.g. 150"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Storage Location</label>
            <select
              style={styles.input}
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              required
            >
              <option value="">Select storage location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.location_name} ({location.location_code})
                </option>
              ))}
            </select>
            {locations.length === 0 && (
              <p style={{ color: '#b45309', fontSize: 12 }}>
                No active storage locations found. Ask the administrator to add locations.
              </p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Production Shift</label>
            <select
              style={styles.input}
              value={shift}
              onChange={e => setShift(e.target.value)}
            >
              <option value="General">General</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Worker Name</label>
            <input
              style={styles.input}
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={80}
              required
            />
          </div>

          {selectedProduct && selectedLocation && quantityBoxes && (
            <div style={{
              background: '#f1f7f3',
              borderRadius: 9,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.7,
            }}>
              <strong>Registration summary</strong>
              <div>Product: {selectedProduct.name}</div>
              <div>Quantity: {quantityBoxes} boxes</div>
              <div>Location: {selectedLocation.location_name}</div>
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: submitting || locations.length === 0 ? 0.6 : 1,
            }}
            disabled={submitting || locations.length === 0}
          >
            {submitting ? 'Registering Stock...' : 'Register Production Stock'}
          </button>

          <p style={{
            fontSize: 11,
            color: '#819087',
            textAlign: 'center',
            margin: '15px 0 0',
            lineHeight: 1.5,
          }}>
            Verify the product and box quantity before submitting.
            Each QR code can be registered only once.
          </p>
        </form>
      </div>
    </main>
  )
}