import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Securely bypasses RLS
);

// GET: Fetch all visitors
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('visitor_passes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new visitor pass
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Logic to generate a serial number if not provided by frontend
    const serial = `ES-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabaseAdmin
      .from('visitor_passes')
      .insert([{ ...body, serial_no: body.serial_no || serial, status: 'pending' }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}