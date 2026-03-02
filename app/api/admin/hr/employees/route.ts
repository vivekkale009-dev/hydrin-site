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
          employee_no: body.employee_no, // Added this line
          full_name: body.name, 
          role: body.role, 
          daily_rate: parseFloat(body.dailyRate),
          contact_number: body.phone,
          aadhaar_number: body.aadhaar_number,
          bank_details: `Bank: ${body.bankName}, Acc: ${body.accountNo}, IFSC: ${body.ifsc}`
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('employees')
      .update({
        employee_no: body.employee_no, // Allow updating/correcting ID if needed
        full_name: body.full_name,
        role: body.role,
        contact_number: body.contact_number,
        aadhaar_number: body.aadhaar_number,
        daily_rate: parseFloat(body.daily_rate),
        is_active: body.is_active
      })
      .eq('id', body.id);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("Employee ID is required");

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
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
      .order('full_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}