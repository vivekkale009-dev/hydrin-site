import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      address,
      city,
      pincode,
      created_by_admin = false,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const s = await createServerSupabaseClient();

    // Check duplicate phone (extra safety)
    const { data: existing } = await s
      .from("distributors")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Distributor with this phone already exists" },
        { status: 400 }
      );
    }

    const { data, error } = await s
      .from("distributors")
      .insert({
        name,
        phone,
        email,
        address,
        city,
        pincode,
        is_active: created_by_admin ? true : false,
        created_by_admin,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      distributor_id: data.id,
      status: created_by_admin ? "approved" : "pending_admin_approval",
    });
  } catch (err) {
    console.error("DISTRIBUTOR REGISTER ERROR", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
