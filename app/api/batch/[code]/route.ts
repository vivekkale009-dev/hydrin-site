import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  let { code } = await context.params;
  code = String(code).trim().replace(/\s+/g, "").toUpperCase();

  const { data, error } = await supabase
    .from("batches")
    .select(
      "batch_code, production_date, status, ph_value, tds_value, report_url"
    )
    .eq("batch_code", code)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Batch not found" },
      { status: 404 }
    );
  }

  // Log scan
  await supabase.from("scans").insert([
    { batch_code: code }
  ]);

  return NextResponse.json(data);
}