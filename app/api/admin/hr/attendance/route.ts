export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
//import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('work_date', date);

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Keep your existing POST function below this...

export async function POST(req: Request) {
  try {
    //const supabase = await createServerSupabaseClient();
	const supabase = await createAdminClient();
    const { date, logs } = await req.json();

    const insertData = Object.entries(logs).map(([empId, status]) => ({
      employee_id: parseInt(empId),
      work_date: date,
      status: status as string
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(insertData, { onConflict: 'employee_id,work_date' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}