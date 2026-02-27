import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Use AbortController to kill the request if it takes too long (ISP Hanging)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

  try {
    const { error } = await supabase
      .from('issued_documents')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);

    if (error && error.code !== 'PGRST116') throw error;
    
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() }, 
      { 
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' } // Ensure fresh results
      }
    );
  } catch (err: any) {
    console.error("Health Check Failed:", err.message);
    return NextResponse.json(
      { status: 'degraded', details: err.name === 'AbortError' ? 'TIMEOUT' : 'CONNECTION_ERROR' }, 
      { status: 500 }
    );
  }
}