import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    const { 
      vehicle_number, 
      driver_name, 
      driver_phone, 
      rate_per_km, 
      is_active, 
      vehicle_model,
      is_owned_by_firm // Destructured from the payload sent by the page
    } = body;

    const { data, error } = await supabase
      .from("vans")
      .insert([
        {
          vehicle_number: vehicle_number.toUpperCase(),
          driver_name,
          driver_phone,
          vehicle_model,
          rate_per_km: Number(rate_per_km),
          is_active: is_active ?? true,
          // Added to the database insert
          is_owned_by_firm: is_owned_by_firm ?? false, 
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}