import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // Clear the cookie
  res.cookies.set("oxy_admin", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}
