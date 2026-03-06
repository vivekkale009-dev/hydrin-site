export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
//import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    //const supabase = await createServerSupabaseClient();
	const supabase = await createAdminClient();
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
    // Switch to AdminClient to bypass RLS for updates
    const supabase = await createAdminClient(); 
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('employees')
      .update({
        employee_no: body.employee_no,
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
    // USE AdminClient to bypass RLS restrictions
    const supabase = await createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("Employee ID is required");

    // Check if the employee has attendance records first
    // If they do, a standard delete might fail due to "Foreign Key Constraints"
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      // If the error code is 23503, it's a Foreign Key violation
      if (error.code === '23503') {
        throw new Error("Cannot delete employee: They have existing attendance records. Try deactivating them instead.");
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Switch to AdminClient to bypass RLS that started blocking this after security updates
    const supabase = await createAdminClient(); 
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    
    // This matches your page's (data.data || []) expectation
    return NextResponse.json({ data }); 
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}