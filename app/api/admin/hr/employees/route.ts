import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('employees')
      .insert([
        { 
          full_name: body.name, 
          role: body.role, 
          daily_rate: parseFloat(body.dailyRate),
          contact_number: body.phone,
          bank_details: `Bank: ${body.bankName}, Acc: ${body.accountNo}, IFSC: ${body.ifsc}`
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}