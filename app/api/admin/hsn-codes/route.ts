export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
//import { createServerSupabaseClient } from "@/lib/supabase/server";
//export const dynamic = 'force-dynamic';

export async function GET() {
  try {
  	const supabase = await createAdminClient();
    //const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc("get_active_hsn_codes");

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("HSN fetch error", err);
    return NextResponse.json(
      { error: "Failed to load HSN codes" },
      { status: 500 }
    );
  }
}
