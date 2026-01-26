import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
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