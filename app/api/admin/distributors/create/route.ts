import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();

    const {
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      delivery_rate_per_km,
      is_active
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // 1️⃣ Check phone uniqueness
    const { data: existing } = await supabase
      .from("distributors")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Distributor with this phone already exists" },
        { status: 409 }
      );
    }

    // 2️⃣ Insert distributor
    const { data, error } = await supabase
      .from("distributors")
      .insert({
        name: name.trim(),
        phone: cleanPhone,
        email,
        address,
        city,
        state,
        pincode,
        delivery_rate_per_km: delivery_rate_per_km ?? 15,
        is_active: is_active ?? true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, distributor: data });

  } catch (err: any) {
    console.error("Distributor create error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
