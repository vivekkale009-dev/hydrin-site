import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Securely check DB
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ip = searchParams.get("ip");

  const { data } = await supabase
    .from("blocked_ips")
    .select("is_blocked")
    .eq("ip_address", ip)
    .eq("is_blocked", true)
    .single();

  return NextResponse.json({ blocked: !!data });
}