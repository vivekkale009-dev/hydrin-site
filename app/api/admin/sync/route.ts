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
      const values = [
        headers,
        ...rows.map(row => headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === 'object') {
            const str = JSON.stringify(val);
            return str === '{}' || str === '[]' ? "" : str;
          }
          return val;
        }))
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tableName}!A1`,
        valueInputOption: "RAW",
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
      valueInputOption: "RAW",
      requestBody: { values: [["last_backup"], [timestamp]] },
    });

    return NextResponse.json({ success: true, message: `Synced ${selectedTables.length} tables`, timestamp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { selectedTables, dryRun = false } = await req.json();
    const sheets = await getSheetsInstance();
    const spreadsheetId = process.env.SHEET_ID!;
    const dryRunSummary: any[] = [];

    for (const tableName of selectedTables) {
      // 1. Get ALL Primary Key columns (handles composite keys like fy_year + invoice_type)
      const { data: pkColumns, error: rpcError } = await supabase.rpc('get_primary_key_columns', { 
        table_name_input: tableName 
      });

      if (rpcError) console.error(`RPC Error for ${tableName}:`, rpcError);

      // Join columns for onConflict target (e.g., "fy_year,invoice_type")
      const actualPrimaryKey = (pkColumns && pkColumns.length > 0) ? pkColumns.join(',') : 'id';

      const response = await sheets.spreadsheets.values.get({ 
        spreadsheetId, 
        range: `${tableName}!A:Z` 
      });
      const rows = response.data.values;
      if (!rows || rows.length <= 1) continue;

      const rawHeaders = rows[0].map(h => h.trim());
      const formatted = rows.slice(1).map(row => {
        const obj: any = {};
        rawHeaders.forEach((h, i) => { 
          const val = row[i];
          const isPKColumn = pkColumns?.some(pk => pk.toLowerCase() === h.toLowerCase());
          const cleanHeader = isPKColumn ? pkColumns.find(pk => pk.toLowerCase() === h.toLowerCase()) : h;
          
          if (val === "" || val === undefined) obj[cleanHeader] = null;
          else if (!isNaN(Number(val)) && val !== "" && val.length < 15) obj[cleanHeader] = Number(val);
          else obj[cleanHeader] = val;
        });
        return obj;
      });

      if (dryRun) {
        dryRunSummary.push({
          table: tableName,
          rowsToSync: formatted.length,
          keysUsed: actualPrimaryKey
        });
      } else {
        const { error } = await supabase.from(tableName).upsert(formatted, { 
          onConflict: actualPrimaryKey 
        });
        if (error) throw new Error(`[Table: ${tableName}] ${error.message}`);
      }
    }

    if (!dryRun) await supabase.rpc('set_retention_sequences');

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
    const { selectedTables } = await req.json();
    for (const tableName of selectedTables) {
      const { error } = await supabase.from(tableName).delete().neq('ctid', '(0,0)');
      if (error) throw error;
    }
    return NextResponse.json({ success: true, message: `Purged ${selectedTables.length} tables` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}