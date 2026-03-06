export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- HELPERS ---

async function logAction(action: string, tables: string[], details: string = "") {
  try {
    await supabase.from('admin_logs').insert({ // <--- Ensure this is 'admin_logs'
      action: action,
      affected_tables: tables.join(", "),
      details: details,
      performed_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Logging failed:", e);
  }
}

async function verifyAdmin(req: Request) {
  const body = await req.json();
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD; 
  
  if (!body.password || body.password !== adminPassword) {
    throw new Error("Unauthorized: Incorrect Password");
  }
  return body;
}

async function getSheetsInstance() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// --- API ROUTES ---

export async function GET() {
  try {
    const { data: stats, error: statsError } = await supabase.rpc('get_database_size');
    const { data: tables, error: tableError } = await supabase.rpc('get_all_table_names');
    if (statsError || tableError) throw new Error("Failed to fetch DB metadata");

    return NextResponse.json({
      usedBytes: stats.total_bytes || 0,
      limitBytes: 524288000, 
      tableCount: stats.table_count || 0,
      availableTables: tables.map((t: any) => typeof t === 'string' ? t : t.table_name)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await verifyAdmin(req);
    const { selectedTables, action, tableName, data } = body;

    if (action === "IMPORT") {
      const { error } = await supabase.from(tableName).upsert(data);
      if (error) throw error;
      await logAction("CSV_IMPORT", [tableName], `Imported ${data.length} rows`);
      return NextResponse.json({ success: true, message: "Import successful" });
    }

    if (!selectedTables || selectedTables.length === 0) throw new Error("No tables selected");
    const sheets = await getSheetsInstance();
    const spreadsheetId = process.env.SHEET_ID!;
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(spreadsheet.data.sheets?.map(s => s.properties?.title));

    for (const table of selectedTables) {
      if (!existingTabs.has(table)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: table } } }] },
        });
      }
      const { data: rows } = await supabase.from(table).select('*');
      if (!rows || rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      const values = [headers, ...rows.map(row => headers.map(h => {
          const val = row[h];
          return (val === null || val === undefined) ? "" : (typeof val === 'object' ? JSON.stringify(val) : val);
      }))];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${table}!A1`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    }

    const timestamp = new Date().toLocaleString();
    await logAction("SHEETS_BACKUP", selectedTables, `Timestamp: ${timestamp}`);
    return NextResponse.json({ success: true, message: `Synced ${selectedTables.length} tables`, timestamp });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await verifyAdmin(req);
    const { selectedTables, dryRun } = body;
    
    const sheets = await getSheetsInstance();
    const spreadsheetId = process.env.SHEET_ID!;
    const dryRunSummary: any[] = [];

    for (const tableName of selectedTables) {
      try {
        const { data: pkColumns } = await supabase.rpc('get_primary_key_columns', { table_name_input: tableName });
        const actualPrimaryKey = (pkColumns && pkColumns.length > 0) ? pkColumns.join(',') : 'id';

        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tableName}!A:Z` });
        const rows = response.data.values;

        if (!rows || rows.length <= 1) {
          if (dryRun) dryRunSummary.push({ table: tableName, rowsToSync: 0, keysUsed: actualPrimaryKey, status: "Empty" });
          continue;
        }

        const rawHeaders = rows[0].map((h: string) => h.trim());
        const formatted = rows.slice(1).map(row => {
          const obj: any = {};
          rawHeaders.forEach((h, i) => {
            const val = row[i];
            if (val === "" || val === undefined) obj[h] = null;
            else if (!isNaN(Number(val)) && val !== "" && val.length < 15) obj[h] = Number(val);
            else obj[h] = val;
          });
          return obj;
        });

        if (dryRun) {
          dryRunSummary.push({ table: tableName, rowsToSync: formatted.length, keysUsed: actualPrimaryKey, status: "Ready" });
        } else {
          const { error } = await supabase.from(tableName).upsert(formatted, { onConflict: actualPrimaryKey });
          if (error) throw new Error(`[Table: ${tableName}] ${error.message}`);
        }
      } catch (err: any) {
        if (dryRun) dryRunSummary.push({ table: tableName, rowsToSync: 0, keysUsed: "Error", status: err.message });
        else throw err;
      }
    }

    if (!dryRun) {
      await supabase.rpc('set_retention_sequences');
      await logAction("RESTORE", selectedTables, "Restore completed from Sheets");
    }

    return NextResponse.json({ 
      success: true, 
      isDryRun: dryRun, 
      message: dryRun ? "Dry run finished." : "Restore successful.", 
      details: dryRun ? dryRunSummary : null 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await verifyAdmin(req);
    const { selectedTables } = body;
    for (const tableName of selectedTables) {
      const { error } = await supabase.from(tableName).delete().neq('ctid', '(0,0)');
      if (error) throw error;
    }
    await logAction("PURGE", selectedTables, "Emergency database wipe performed");
    return NextResponse.json({ success: true, message: `Purged ${selectedTables.length} tables` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}