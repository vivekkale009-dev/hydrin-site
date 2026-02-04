import { NextResponse } from "next/server";
import { google } from "googleapis";

async function getSheetsInstance() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// 1. FETCH ALL JOBS
export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "EarthyJobs!A:G", 
    });
    return NextResponse.json(response.data.values || []);
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

// 2. ADD NEW JOB
export async function POST(req: Request) {
  try {
    const { title, location, type, status, description, education } = await req.json();
    const sheets = await getSheetsInstance();
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "EarthyJobs!A:G", 
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          Date.now().toString(), // ID (Column A)
          title,                 // Title (Column B)
          location,              // Location (Column C)
          type,                  // Type (Column D)
          status,                // Status (Column E)
          description || "",     // Description (Column F)
          education || ""        // Education (Column G)
        ]],
      },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. EDIT EXISTING JOB (FULL UPDATE)
export async function PUT(req: Request) {
  try {
    const { id, title, location, type, status, description, education } = await req.json();
    const sheets = await getSheetsInstance();

    // Find the row index by ID
    const lookUp = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "EarthyJobs!A:A",
    });
    const rows = lookUp.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id.toString());

    if (rowIndex === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `EarthyJobs!A${rowIndex + 1}:G${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[id, title, location, type, status, description, education]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. TOGGLE STATUS (FREEZE/ACTIVATE)
export async function PATCH(req: Request) {
  try {
    const { id, newStatus } = await req.json();
    const sheets = await getSheetsInstance();

    const lookUp = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "EarthyJobs!A:A",
    });
    const rows = lookUp.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id.toString());

    if (rowIndex === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `EarthyJobs!E${rowIndex + 1}`, // Update only Column E
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[newStatus]] },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 5. DELETE JOB
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const sheets = await getSheetsInstance();

    const lookUp = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "EarthyJobs!A:A",
    });
    const rows = lookUp.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id.toString());

    if (rowIndex === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // In Google Sheets API, "deleting" usually means clearing the row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SHEET_ID,
      range: `EarthyJobs!A${rowIndex + 1}:G${rowIndex + 1}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}