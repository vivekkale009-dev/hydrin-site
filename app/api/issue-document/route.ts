import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { serial_no, category, document_url } = await req.json();
    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('issued_documents')
      .insert([
        { 
          serial_no: String(serial_no), // Force string to avoid type errors
          category: category, 
          document_url: document_url 
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Database Sync Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}