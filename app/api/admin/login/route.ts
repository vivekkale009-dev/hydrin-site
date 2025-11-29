import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = body.password as string | undefined;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password required" },
        { status: 400 }
      );
    }

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      console.error("ADMIN_PASSWORD is not set in environment variables");
      return NextResponse.json(
        {
          success: false,
          error: "Server auth is not configured.",
        },
        { status: 500 }
      );
    }

    if (password !== expected) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });

    // Set admin cookie for 12 hours
    res.cookies.set("oxy_admin", "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (e) {
    console.error("Admin login error:", e);
    return NextResponse.json(
      { success: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
