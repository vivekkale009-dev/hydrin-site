import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const calculateExpiry = (prodDate: string) => {
  const date = new Date(prodDate);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().split('T')[0];
};

// ... (keep existing imports and calculateExpiry)

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const supabaseAdmin = await createAdminClient();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('batches')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    return NextResponse.json({ success: true, message: "Batch deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabaseAdmin = await createAdminClient();
    if (body.production_date) {
      body.expiry_date = calculateExpiry(body.production_date);
    }
    const { data, error } = await supabaseAdmin
      .from('batches')
      .insert([body])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: "Batch code exists." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const supabaseAdmin = await createAdminClient();
    // Re-calculate expiry if production_date changed, but allow manual override if provided
    if (updates.production_date && !updates.expiry_date) {
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    const checkCode = searchParams.get('checkCode');
    const supabaseAdmin = await createAdminClient();

    if (checkCode) {
      const { data } = await supabaseAdmin.from('batches').select('batch_code').eq('batch_code', checkCode.toUpperCase()).maybeSingle();
      return NextResponse.json({ exists: !!data });
    }
    if (!path) return NextResponse.json({ error: "No path" }, { status: 400 });
    const { data, error } = await supabaseAdmin.storage.from('water-reports').createSignedUrl(path, 900);
    if (error) throw error;
    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}