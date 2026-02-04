import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getSheetsInstance() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// 📊 GET: Dashboard Stats & Table List
export async function GET() {
  try {
    const { data: stats, error: statsError } = await supabase.rpc('get_database_size');
    const { data: tables, error: tableError } = await supabase.rpc('get_all_table_names');

    if (statsError || tableError) throw new Error("Failed to fetch DB metadata");

    return NextResponse.json({
      usedBytes: stats.total_bytes || 0,
      limitBytes: 524288000, // 500MB
      tableCount: stats.table_count || 0,
      availableTables: tables.map((t: any) => typeof t === 'string' ? t : t.table_name)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📤 POST: SELECTIVE BACKUP (Supabase -> Sheets)
export async function POST(req: Request) {
  try {
    const { selectedTables } = await req.json();
    if (!selectedTables || selectedTables.length === 0) throw new Error("No tables selected");

    const sheets = await getSheetsInstance();
    const spreadsheetId = process.env.SHEET_ID!;
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(spreadsheet.data.sheets?.map(s => s.properties?.title));

    for (const tableName of selectedTables) {
      if (!existingTabs.has(tableName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: tableName } } }] },
        });
      }

      const { data: rows } = await supabase.from(tableName).select('*');
      if (!rows || rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      const values = [headers, ...rows.map(row => headers.map(h => row[h]))];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tableName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
    }

    const timestamp = new Date().toLocaleString();
    if (!existingTabs.has("Internal_Metadata")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: "Internal_Metadata" } } }] },
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Internal_Metadata!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["last_backup"], [timestamp]] },
    });

    return NextResponse.json({ success: true, message: `Synced ${selectedTables.length} tables`, timestamp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📥 PUT: SELECTIVE RESTORE (Sheets -> Supabase)
export async function PUT(req: Request) {
  try {
    const { selectedTables } = await req.json();
    if (!selectedTables || selectedTables.length === 0) throw new Error("No tables selected");

    const sheets = await getSheetsInstance();
    const spreadsheetId = process.env.SHEET_ID!;

    for (const tableName of selectedTables) {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tableName}!A:Z` });
      const rows = response.data.values;
      if (!rows || rows.length <= 1) continue;

      const headers = rows[0];
      const formatted = rows.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });

      const { error } = await supabase.from(tableName).upsert(formatted);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: `Restored ${selectedTables.length} tables` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🗑️ DELETE: SELECTIVE PURGE (Wipe Supabase Tables)
// 🗑️ DELETE: SELECTIVE PURGE (Wipe Supabase Tables)
export async function DELETE(req: Request) {
  try {
    const { selectedTables } = await req.json();
    if (!selectedTables || selectedTables.length === 0) throw new Error("No tables selected");

    for (const tableName of selectedTables) {
      // Logic: Delete where any system column (like ctid) is not null.
      // This works on tables even if they don't have an 'id' column.
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('ctid', '(0,0)'); // 'ctid' is a hidden system column present in all Postgres tables

      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Purged ${selectedTables.length} tables from Supabase` 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}