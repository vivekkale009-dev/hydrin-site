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

// GET: Fetch with Notes column (H)
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
      notes: row[7] || "", // Column H
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

// PATCH: Handles both Status (G) and Notes (H)
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

// DELETE: Handle Deletion
export async function DELETE(req: Request) {
  try {
    const { rowId, tab } = await req.json();
    const sheets = await getSheetsInstance();
    
    // Get Sheet ID for the tab name
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
                startIndex: rowId - 1, // 0-based index
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