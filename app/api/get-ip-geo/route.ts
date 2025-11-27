import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Get client IP from headers
    const ipHeader =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    // In local dev, you'll get ::1 – use Google IP just for testing
    const ip = ipHeader === "::1" ? "8.8.8.8" : ipHeader;

    // Use ipwho.is (free, no key, unlimited)
    const geo = await fetch(`https://ipwho.is/${ip}`).then((res) => res.json());

    if (!geo.success) {
      return NextResponse.json({
        ip,
        geo: {
          country: null,
          region: null,
          city: null,
          isp: null,
          latitude: null,
          longitude: null,
        },
        error: geo.message || "Geo lookup failed",
      });
    }

    return NextResponse.json({
      ip,
      geo: {
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        isp: geo.connection?.isp ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Geo lookup crashed", details: String(err) },
      { status: String(err) },
    );
  }
}
