import { createAdminClient } from '@/lib/supabase/admin';;
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { serial_no, category, document_url } = await req.json();

    // Use the Service Role Key to bypass RLS policies completely
// ✅ CORRECT: Keep it empty as per your existing logic
const supabaseAdmin = await createAdminClient();

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