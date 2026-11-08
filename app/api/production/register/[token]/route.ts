import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function indiaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createAdminClient()
    const token = params.token

    const { data: label, error: labelError } = await supabase
      .from('qr_labels')
      .select('id, status, qr_batch_id')
      .eq('qr_token', token)
      .maybeSingle()

    if (labelError) throw labelError

    if (!label) {
      return NextResponse.json(
        { success: false, message: 'Invalid QR code.' },
        { status: 404 }
      )
    }

    if (label.status !== 'unused') {
      return NextResponse.json(
        {
          success: false,
          message: 'This QR code has already been used, cancelled or expired.',
          status: label.status,
        },
        { status: 409 }
      )
    }

    const [{ data: products, error: productError }, { data: locations, error: locationError }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, name, volume_ml, units_per_box')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('stock_locations')
          .select('id, location_code, location_name, location_type')
          .eq('is_active', true)
          .order('location_name'),
      ])

    if (productError) throw productError
    if (locationError) throw locationError

    return NextResponse.json({
      success: true,
      products: products || [],
      locations: locations || [],
      productionDate: indiaDate(),
    })
  } catch (error: any) {
    console.error('Production registration GET error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Unable to load registration details.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient()

  try {
    const token = params.token
    const body = await request.json()

    const pin = String(body.pin || '').trim().toUpperCase()
    const productId = String(body.productId || '')
    const quantityBoxes = Number(body.quantityBoxes)
    const locationId = String(body.locationId || '')
    const workerName = String(body.workerName || '').trim()
    const shift = String(body.shift || 'General').trim()

    if (!/^[A-Z0-9]{5}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: 'Enter the valid 5-character daily PIN.' },
        { status: 400 }
      )
    }

    if (!productId || !locationId || !Number.isInteger(quantityBoxes) || quantityBoxes <= 0 || workerName.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Please complete all fields with valid values.' },
        { status: 400 }
      )
    }

    // Check QR status before PIN verification.
    const { data: label, error: labelError } = await supabase
      .from('qr_labels')
      .select('id, status, qr_batch_id')
      .eq('qr_token', token)
      .maybeSingle()

    if (labelError) throw labelError

    if (!label) {
      return NextResponse.json(
        { success: false, message: 'Invalid QR code.' },
        { status: 404 }
      )
    }

    if (label.status !== 'unused') {
      return NextResponse.json(
        { success: false, message: 'This QR code is not available for registration.' },
        { status: 409 }
      )
    }

    // Find the latest active PIN batch for today.
    const { data: pinBatch, error: pinError } = await supabase
      .from('qr_batches')
      .select('id, pin_hash, pin_expires_at, failed_pin_attempts, locked_until')
      .eq('batch_date', indiaDate())
      .eq('status', 'active')
      .gt('pin_expires_at', new Date().toISOString())
      .order('batch_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pinError) throw pinError

    if (!pinBatch) {
      return NextResponse.json(
        { success: false, message: 'No active daily PIN found. Contact the administrator.' },
        { status: 403 }
      )
    }

    if (pinBatch.locked_until && new Date(pinBatch.locked_until) > new Date()) {
      return NextResponse.json(
        { success: false, message: 'PIN entry is temporarily locked. Contact the administrator.' },
        { status: 429 }
      )
    }

    const pinMatches = await bcrypt.compare(pin, pinBatch.pin_hash)

    if (!pinMatches) {
      const attempts = (pinBatch.failed_pin_attempts || 0) + 1
      const lockedUntil =
        attempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null

      await supabase
        .from('qr_batches')
        .update({
          failed_pin_attempts: attempts >= 5 ? 0 : attempts,
          locked_until: lockedUntil,
        })
        .eq('id', pinBatch.id)

      return NextResponse.json(
        {
          success: false,
          message: lockedUntil
            ? 'Too many incorrect attempts. Try again after 15 minutes.'
            : `Incorrect PIN. ${5 - attempts} attempt(s) remaining.`,
        },
        { status: 401 }
      )
    }

    // Reset failed attempts after successful PIN verification.
    await supabase
      .from('qr_batches')
      .update({
        failed_pin_attempts: 0,
        locked_until: null,
      })
      .eq('id', pinBatch.id)

    // The database function performs the actual registration atomically.
    const { data: result, error: registrationError } = await supabase.rpc(
      'register_production_stock',
      {
        p_qr_token: token,
        p_product_id: productId,
        p_quantity_boxes: quantityBoxes,
        p_location_id: locationId,
        p_worker_name: workerName,
        p_shift: shift || 'General',
        p_production_date: indiaDate(),
      }
    )

    if (registrationError) {
      const message = registrationError.message || 'Registration failed.'
      const conflict =
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('cancelled') ||
        message.toLowerCase().includes('not found')

      return NextResponse.json(
        { success: false, message },
        { status: conflict ? 409 : 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Production stock registered successfully.',
      result,
    })
  } catch (error: any) {
    console.error('Production registration POST error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Unable to register production stock.' },
      { status: 500 }
    )
  }
}