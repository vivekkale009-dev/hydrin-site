import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get('serial');

    // 1. Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase Environment Variables");
      return NextResponse.json(
        { error: "Server Configuration Error: supabaseUrl is missing" }, 
        { status: 500 }
      );
    }

    if (!serial) {
      return NextResponse.json({ error: "Serial number required" }, { status: 400 });
    }

    // 2. Initialize client inside the request to ensure fresh env access
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Query with string conversion and trimming
    const { data, error } = await supabase
      .from('issued_documents')
      .select('*')
      .eq('serial_no', String(serial).trim())
      .maybeSingle();

    if (error) {
      console.error("Database Query Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.error("Global API Error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}