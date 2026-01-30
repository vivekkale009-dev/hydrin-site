import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Check Service Account Env
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ success: false, error: "Env variable missing" }, { status: 500 });
    }

    const service = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials: service,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1x24wn1YrNtqw2OwKSb0js9HDN2zlMVdXzmBqDCqHEoE";
    const sheetName = "Responses";

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // 2. Append Data
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:F`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            now,
            body.name || "-",
            body.phone || "-",
            body.email || "-",
            body.category || "General",
            body.message || "-",
          ],
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Sheet error detail:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}