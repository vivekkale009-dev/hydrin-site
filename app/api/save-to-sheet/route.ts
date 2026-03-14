import { google } from "googleapis";
import { NextResponse } from "next/server";

const spreadsheetId = "1x24wn1YrNtqw2OwKSb0js9HDN2zlMVdXzmBqDCqHEoE";

// --- RATE LIMITER FOR GOOGLE SHEETS ---
const ipCache = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 5; // Max 5 submissions
const WINDOW = 60 * 60 * 1000; // per hour

async function getSheetsInstance() {
  // 1. Get the raw string
  const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");

  // 2. Parse it
  const service = JSON.parse(rawServiceAccount);

  // 3. Fix potential private key newline issues
  if (service.private_key) {
    service.private_key = service.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: service,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  
  return google.sheets({ version: "v4", auth });
}

// NEW POST METHOD: Handles the actual "Save to Sheet" from your website
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headers = req.headers;

    // 1. SECURITY: RATE LIMIT
    const ip = headers.get("x-forwarded-for") || "0.0.0.0";
    const now = Date.now();
    const userData = ipCache.get(ip) || { count: 0, lastReset: now };
    if (now - userData.lastReset > WINDOW) { userData.count = 0; userData.lastReset = now; }
    if (userData.count >= LIMIT) return NextResponse.json({ error: "Too many submissions" }, { status: 429 });
    userData.count += 1;
    ipCache.set(ip, userData);

    // 2. SECURITY: REFERRER CHECK
    const referer = headers.get("referer");
    const host = headers.get("host");
    if (!host?.includes("localhost") && referer && !referer.includes("earthysource.in")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 3. GOOGLE SHEETS LOGIC
    const sheets = await getSheetsInstance();
    const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    
    // Prepare values for Google Sheet (adjust order to match your columns)
    const values = [
      [
        date,
        body.name || "",
        body.phone || "",
        body.email || "",
        body.category || "General",
        body.message || "",
        "Open", // Default Status
        ""      // Default Notes
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Responses!A:H",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("SHEETS POST ERROR:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// --- KEEP YOUR EXISTING GET, PATCH, DELETE BELOW ---

export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    const [responsesRes, chatBotRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: "Responses!A2:H500" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "ChatBot!A2:H500" })
    ]);

    const mapRows = (rows: any[], tabName: string) => rows.map((row, index) => ({
      rowId: index + 2,
      tab: tabName,
      date: row[0] || "",
      name: row[1] || "",
      phone: row[2] || "",
      email: row[3] || "",
      category: tabName === "ChatBot" ? "ChatBot" : (row[4] || "General"),
      message: tabName === "ChatBot" ? row[4] : (row[5] || ""),
      status: row[6] || "Open",
      notes: row[7] || "",
    }));

    const combinedData = [
      ...mapRows(responsesRes.data.values || [], "Responses"),
      ...mapRows(chatBotRes.data.values || [], "ChatBot")
    ];

    return NextResponse.json({ success: true, data: combinedData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { rowId, status, notes, tab } = await req.json();
    const sheets = await getSheetsInstance();
    const targetTab = tab || "Responses";

    if (status) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetTab}!G${rowId}`,
        valueInputOption: "RAW",
        requestBody: { values: [[status]] },
      });
    }

    if (notes !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetTab}!H${rowId}`,
        valueInputOption: "RAW",
        requestBody: { values: [[notes]] },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { rowId, tab } = await req.json();
    const sheets = await getSheetsInstance();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === tab);
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) throw new Error("Sheet tab not found");

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowId - 1,
                endIndex: rowId,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}