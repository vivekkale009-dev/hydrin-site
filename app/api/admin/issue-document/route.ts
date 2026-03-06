import { createAdminClient } from '@/lib/supabase/admin';;
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { serial_no, category, document_url } = await req.json();

    // Use the Service Role Key to bypass RLS policies completely
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST be the secret key from settings
    );

    const { data, error } = await supabaseAdmin
      .from('issued_documents')
      .upsert({ 
          serial_no: String(serial_no), 
          category: category, 
          document_url: document_url,
          issue_date: new Date().toISOString().split('T')[0],
          is_active: true
      }, { onConflict: 'serial_no' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Database Sync Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}