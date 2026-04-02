import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// This connects to your database using your environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone_number, name, category } = await req.json();

    // Basic safety check: if there's no phone number, we stop here
    if (!phone_number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // This is the "Magic" part: 
    // It looks for the phone number. 
    // If it finds it, it updates the name. If not, it creates a new row.
    const { error } = await supabase
      .from("contact_list")
      .upsert(
        {
          phone_number: phone_number,
          name: name || "Unknown Customer",
          category: category || "Customer",
          last_order_date: new Date().toISOString(),
        },
        { onConflict: "phone_number" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Sync Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}