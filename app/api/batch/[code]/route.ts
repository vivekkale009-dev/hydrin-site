import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Works with Next.js 16 Promise params
export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  // 1. Get and clean batch code
  let { code } = await context.params;
  code = String(code).trim().replace(/\s+/g, "").toUpperCase();

  // 2. Fetch batch details
  const { data, error } = await supabase
    .from("batches")
    .select(
      "batch_code, production_date, tds_display_min, tds_display_max, ph_display_min, ph_display_max, status"
    )
    .eq("batch_code", code)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Batch not found" },
      { status: 404 }
    );
  }

  // 3. Log scan
  await supabase.from("scans").insert([
    { batch_code: code }
  ]);

  // 4. Return batch details
  return NextResponse.json(data);
}
