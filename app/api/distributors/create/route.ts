import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const s = await createServerSupabaseClient();
    const body = await req.json();

    const {
      name,
      phone,
      business_name,
      address,
      city,
      state,
      pincode,
      email,
      latitude,
      longitude,
      distance_km,
      delivery_rate_per_km,
      allow_credit,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone required" },
        { status: 400 }
      );
    }

    const { error } = await s.from("distributors").insert({
      name,
      phone,
      business_name,
      address,
      city,
      state,
      pincode,
      email,
      latitude,
      longitude,
      distance_km,
      delivery_rate_per_km: delivery_rate_per_km ?? 15,
      allow_credit: allow_credit ?? false,
      created_by_admin: true,
      is_approved: true,
      approved_at: new Date().toISOString(),
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Phone already exists" },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ADMIN DISTRIBUTOR CREATE ERROR", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
