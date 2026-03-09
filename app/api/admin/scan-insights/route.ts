export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses Service Role to bypass RLS for Admin Insights
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from/to" },
        { status: 400 }
      );
    }

    // Include whole 'to' day: [from, to + 1 day)
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);

    // 1. Fetch Scans
    const { data: scans, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .gte("created_at", fromDate.toISOString())
      .lt("created_at", toDate.toISOString());

    if (scanError) {
      console.error("scan-insights DB error", scanError);
      return NextResponse.json(
        { error: "DB error", details: scanError.message },
        { status: 500 }
      );
    }

    // 2. Fetch Blocked IPs for the dashboard table
    const { data: blockedIps } = await supabase.from("blocked_ips").select("*");

    const rows = scans ?? [];
    
    // ---------- Build Aggregates ----------
    const summary = { verified: 0, fake: 0, expired: 0 };
    const dailyMap: Record<string, any> = {};
    const cityMap: Record<string, any> = {};
    const deviceMap: Record<string, any> = {};
    const batchMap: Record<string, any> = {};

    for (const s of rows as any[]) {
      const status: string = s.status || "unknown";
      const dateKey: string = (s.created_at || "").slice(0, 10);

      if (status === "verified") summary.verified++;
      else if (status === "fake") summary.fake++;
      else if (status === "expired") summary.expired++;

      // daily
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          verified: 0,
          fake: 0,
          expired: 0,
          total: 0,
        };
      }
      dailyMap[dateKey].total++;
      if (status === "verified") dailyMap[dateKey].verified++;
      else if (status === "fake") dailyMap[dateKey].fake++;
      else if (status === "expired") dailyMap[dateKey].expired++;

      // city
      const cityKey: string = s.city || s.state || s.country || "Unknown";
      if (!cityMap[cityKey]) {
        cityMap[cityKey] = {
          city: cityKey,
          total: 0,
          verified: 0,
          fake: 0,
          expired: 0,
        };
      }
      cityMap[cityKey].total++;
      if (status === "verified") cityMap[cityKey].verified++;
      else if (status === "fake") cityMap[cityKey].fake++;
      else if (status === "expired") cityMap[cityKey].expired++;

      // device / fingerprint
      const fp: string = s.fingerprint || "unknown";
      if (!deviceMap[fp]) {
        deviceMap[fp] = {
          fingerprint: fp,
          total: 0,
          first: 0,
          repeat: 0,
          city: s.city ?? null,
          state: s.state ?? null,
        };
      }
      deviceMap[fp].total++;
      if (s.first_scan) deviceMap[fp].first++;
      else deviceMap[fp].repeat++;

      // batch
      const batchKey: string = s.batch_code || "UNKNOWN";
      if (!batchMap[batchKey]) {
        batchMap[batchKey] = {
          batch: batchKey,
          total: 0,
          verified: 0,
          fake: 0,
          expired: 0,
        };
      }
      batchMap[batchKey].total++;
      if (status === "verified") batchMap[batchKey].verified++;
      else if (status === "fake") batchMap[batchKey].fake++;
      else if (status === "expired") batchMap[batchKey].expired++;
    }

    const daily = Object.values(dailyMap).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
    const byCity = Object.values(cityMap)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 20);
    const byDevice = Object.values(deviceMap)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 50);
    const byBatch = Object.values(batchMap)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 20);

    // 3. Final Return
    return NextResponse.json({
      summary,
      daily,
      byCity,
      byDevice,
      byBatch,
      scans: rows,           // Required for the Map pins
      blockedIps: blockedIps // Required for the Dashboard table
    });

  } catch (err) {
    console.error("scan-insights route crash", err);
    return NextResponse.json(
      { error: "Route crashed", details: String(err) },
      { status: 500 }
    );
  }
}