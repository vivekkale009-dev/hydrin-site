import { NextResponse } from "next/server";

export function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  return new NextResponse(ip);
}
