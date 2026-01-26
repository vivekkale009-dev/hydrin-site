import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/distributor/portal`);
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/distributor/login?error=missing_code`);
}
