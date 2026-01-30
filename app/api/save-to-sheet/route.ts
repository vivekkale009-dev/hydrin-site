import { google } from "googleapis";
import { NextResponse } from "next/server";

const spreadsheetId = "1x24wn1YrNtqw2OwKSb0js9HDN2zlMVdXzmBqDCqHEoE";

async function getSheetsInstance() {
  const service = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials: service,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sheets = await getSheetsInstance();
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Responses!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[now, body.name || "-", body.phone || "-", body.email || "-", body.category || "General", body.message || "-", "Open"]],
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    
    // Fetch from both tabs
    const [responsesRes, chatBotRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: "Responses!A2:G500" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "ChatBot!A2:G500" })
    ]);

    const responseRows = responsesRes.data.values || [];
    const chatBotRows = chatBotRes.data.values || [];

    const responseData = responseRows.map((row, index) => ({
      rowId: index + 2,
      tab: "Responses",
      date: row[0] || "",
      name: row[1] || "",
      phone: row[2] || "",
      email: row[3] || "",
      category: row[4] || "General",
      message: row[5] || "",
      status: row[6] || "Open",
    }));

    const chatBotData = chatBotRows.map((row, index) => ({
      rowId: index + 2,
      tab: "ChatBot",
      date: row[0] || "",
      name: row[1] || "Chat User",
      phone: row[2] || "",
      email: row[3] || "",
      category: "ChatBot",
      message: row[4] || "", // Adjust column index if message is elsewhere in ChatBot tab
      status: row[6] || "Open",
    }));

    // Combine and keep standard sort (we reverse in the frontend)
    const combinedData = [...responseData, ...chatBotData];

    return NextResponse.json({ success: true, data: combinedData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { rowId, status, tab } = await req.json();
    const sheets = await getSheetsInstance();
    const targetTab = tab || "Responses";

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${targetTab}!G${rowId}`,
      valueInputOption: "RAW",
      requestBody: { values: [[status]] },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}