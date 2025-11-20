// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Instruct Supabase to sign out (this is optional; main thing is clearing cookies)
  try {
    await supabase.auth.signOut();
  } catch (err) {
    // ignore
  }

  const res = NextResponse.redirect(new URL("/admin/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
  // clear common supabase cookies
  res.cookies.delete("sb-access-token");
  res.cookies.delete("sb-refresh-token");
  return res;
}
