import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use the Service Role Key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { ip, action } = await req.json();

    if (!ip) return NextResponse.json({ error: "IP is required" }, { status: 400 });

    if (action === "block") {
      const { error } = await supabase
        .from("blocked_ips")
        .upsert(
          { 
            ip_address: ip, 
            is_blocked: true, 
            reason: "Manually blocked from dashboard" 
          }, 
          { onConflict: 'ip_address' } // Tells Supabase to use the IP as the unique key
        );

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Blocked ${ip}` });
    }

    if (action === "unblock") {
      // It's safer to just delete the block record or set is_blocked to false
      const { error } = await supabase
        .from("blocked_ips")
        .update({ is_blocked: false })
        .eq("ip_address", ip);

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Unblocked ${ip}` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("Blocking Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}