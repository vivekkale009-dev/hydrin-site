import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: stats, error: statsError } = await supabase.rpc('get_database_size');
    const { data: tables, error: tableError } = await supabase.rpc('get_all_table_names');
    
    if (statsError || tableError) throw new Error("Metadata fetch failed");

    return NextResponse.json({
      usedBytes: stats.total_bytes || 0,
      limitBytes: 524288000, 
      tableCount: stats.table_count || 0,
      availableTables: tables.map((t: any) => typeof t === 'string' ? t : t.table_name)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}