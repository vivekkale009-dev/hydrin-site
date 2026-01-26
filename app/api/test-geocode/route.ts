import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pincode = url.searchParams.get("pincode");

    if (!pincode) {
      return NextResponse.json({ error: "Missing pincode" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Read from correct table
    const { data, error } = await supabase
      .from("pincode_geo")
      .select("*")
      .eq("pincode", pincode)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Pincode not found" }, { status: 404 });
    }

    return NextResponse.json({
      pincode,
      latitude: data.latitude,
      longitude: data.longitude,
      source: data.source,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
