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
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
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
      created_by_admin: false,
      is_approved: false,
      is_active: false,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Phone number already registered" },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Registration submitted. Admin will contact you.",
    });
  } catch (err) {
    console.error("PUBLIC DISTRIBUTOR REGISTER ERROR", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
