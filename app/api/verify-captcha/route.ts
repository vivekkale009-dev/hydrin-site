import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json();

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const result = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
    {
      method: "POST",
    }
  );

  const data = await result.json();
  return NextResponse.json({ success: data.success });
}
