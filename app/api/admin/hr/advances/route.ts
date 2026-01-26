import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('salary_advances')
      .insert([
        { 
          employee_id: parseInt(body.employee_id), 
          amount: parseFloat(body.amount), 
          request_date: body.date 
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}