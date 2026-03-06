import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

// MASTER CLIENT: Bypasses RLS safely on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAdmin(req: Request) {
  const body = await req.json();
  if (body.password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    throw new Error("Unauthorized: Incorrect Admin Password");
  }
  return body;
}

// ... Keep your getSheetsInstance() function here ...

export async function POST(req: Request) {
  try {
    const { selectedTables, action } = await verifyAdmin(req);

    // ACTION: SECURE CSV IMPORT
    if (action === "IMPORT") {
      const { tableName, data } = await req.json(); // Re-parse for specific data
      const { error } = await supabaseAdmin.from(tableName).upsert(data);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Import successful" });
    }

    // ACTION: GOOGLE SHEETS BACKUP (Existing logic)
    // ... insert your existing POST backup logic here using supabaseAdmin ...
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { selectedTables, dryRun } = await verifyAdmin(req);
    // ACTION: RESTORE FROM SHEETS
    // ... insert your existing PUT restore logic here using supabaseAdmin ...
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { selectedTables } = await verifyAdmin(req);
    
    // ACTION: EMERGENCY PURGE
    for (const tableName of selectedTables) {
      const { error } = await supabaseAdmin
        .from(tableName)
        .delete()
        .neq('ctid', '(0,0)'); // Deletes all rows safely
      if (error) throw new Error(`Failed to purge ${tableName}: ${error.message}`);
    }
    
    return NextResponse.json({ success: true, message: `Purged ${selectedTables.length} tables` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}