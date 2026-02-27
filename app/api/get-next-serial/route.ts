import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force Next.js to not cache this API response
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const currentYear = new Date().getFullYear();
    
    // We only need the ONE most recent record
    const { data, error } = await supabase
      .from('issued_documents')
      .select('serial_no, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Better for single record fetching

    if (error) throw error;

    let nextSerial = "001";
    let lastSerial = "None Found";

    if (data) {
      lastSerial = data.serial_no;
      const lastYear = new Date(data.created_at).getFullYear();

      if (currentYear > lastYear) {
        nextSerial = "001"; 
      } else {
        // Safe parsing of the serial number
        const matches = data.serial_no.match(/\d+/);
        const lastNum = matches ? parseInt(matches[0]) : 0;
        nextSerial = (lastNum + 1).toString().padStart(3, '0');
      }
    }

    return NextResponse.json({ nextSerial, lastSerial });
  } catch (err: any) {
    console.error("[SERIAL API ERROR]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}