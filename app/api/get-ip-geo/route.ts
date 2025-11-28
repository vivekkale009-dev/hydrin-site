import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const ipHeader =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    const ip = ipHeader === "::1" ? "8.8.8.8" : ipHeader;

    const geo = await fetch(`https://ipwho.is/${ip}`).then((res) => res.json());

    if (!geo.success) {
      return NextResponse.json({
        ip,
        geo: {
          country: null,
          state: null,
          city: null,
          isp: null,
          latitude: null,
          longitude: null,
          pincode: null,
        },
        error: geo.message,
      });
    }

    return NextResponse.json({
      ip,
      geo: {
        country: geo.country ?? null,
        state: geo.region ?? null,
        city: geo.city ?? null,
        isp: geo.connection?.isp ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        pincode: geo.postal ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Geo lookup crashed",
        details: String(err),
      },
      { status: 500 }
    );
  }
}
