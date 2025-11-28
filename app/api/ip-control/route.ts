import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // IMPORTANT
);

export async function POST(req: Request) {
  try {
    const { ip, action } = await req.json();

    if (!ip || !action) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (action === "block") {
      await supabase
        .from("blocked_ips")
        .upsert({
          ip_address: ip,
          is_blocked: true,
          reason: "Manually blocked from dashboard",
        });

      return NextResponse.json({ success: true });
    }

    if (action === "unblock") {
      await supabase
        .from("blocked_ips")
        .update({ is_blocked: false })
        .eq("ip_address", ip);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Server error", detail: String(e) },
      { status: 500 }
    );
  }
}
