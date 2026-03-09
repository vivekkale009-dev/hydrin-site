import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to calculate expiry (Prod Date + 6 Months)
const calculateExpiry = (prodDate: string) => {
  const date = new Date(prodDate);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().split('T')[0];
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabaseAdmin = await createAdminClient();

    // Auto-calculate expiry before insert
    if (body.production_date) {
      body.expiry_date = calculateExpiry(body.production_date);
    }

    const { data, error } = await supabaseAdmin
      .from('batches')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const supabaseAdmin = await createAdminClient();

    // Re-calculate expiry if production_date is being changed
    if (updates.production_date) {
      updates.expiry_date = calculateExpiry(updates.production_date);
    }

    const { data, error } = await supabaseAdmin
      .from('batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ... GET function remains the same ...

// 3. SECURE VIEW: Generates a temporary link for the Admin to see the PDF
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) return NextResponse.json({ error: "No path provided" }, { status: 400 });

    const supabaseAdmin = await createAdminClient();
    
    // Creates a signed URL that expires in 15 minutes (900 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from('water-reports')
      .createSignedUrl(path, 900);

    if (error) throw error;
    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}