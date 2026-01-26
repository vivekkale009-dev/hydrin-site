import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Use Service Role to bypass all RLS restrictions
  const supabase = createClient(
    process.env.SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json({ error: "No ID provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("order_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(JSON.stringify(data || []), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}