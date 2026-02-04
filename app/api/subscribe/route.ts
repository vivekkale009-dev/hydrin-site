import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Setup Auth
    // We parse the JSON and fix potential newline issues in the private key
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 2. Append to the specific tab: "HydraSphereInq"
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "HydraSphereInq!A:B", 
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[email, new Date().toLocaleString()]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Google Sheets Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}