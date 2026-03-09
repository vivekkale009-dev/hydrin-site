import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const ipHeader =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    const ip = ipHeader === "::1" || ipHeader === "127.0.0.1" ? "8.8.8.8" : ipHeader;
    const TOKEN = "95b5add6d80b7b"; 
    
    const res = await fetch(`https://ipinfo.io/${ip}?token=${TOKEN}`);
    const geo = await res.json();

    const [lat, lon] = (geo.loc || "0,0").split(",");

    // CLEAN THE ISP NAME: Removes "AS12345 " from the start
    const rawIsp = geo.org || "Unknown ISP";
    const cleanIsp = rawIsp.replace(/^AS\d+\s+/g, "");

    return NextResponse.json({
      ip,
      geo: {
        country: geo.country ?? null,
        state: geo.region ?? null,
        city: geo.city ?? null,
        isp: cleanIsp, 
        latitude: lat ?? null,
        longitude: lon ?? null,
        pincode: geo.postal ?? null,
        // VPN Detection logic
        is_vpn: !!(geo.privacy?.vpn || geo.privacy?.proxy || geo.privacy?.tor)
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Service Error" }, { status: 500 });
  }
}