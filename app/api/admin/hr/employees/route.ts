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
          aadhaar_number: body.aadhaar_number, // Added Aadhar for onboarding
          bank_details: `Bank: ${body.bankName}, Acc: ${body.accountNo}, IFSC: ${body.ifsc}`
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// NEW: Added PUT function to handle editing/saving from the list page
export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('employees')
      .update({
        full_name: body.full_name,
        role: body.role,
        contact_number: body.contact_number,
        aadhaar_number: body.aadhaar_number,
        daily_rate: parseFloat(body.daily_rate),
        is_active: body.is_active
      })
      .eq('id', body.id); // Matches the specific employee by ID

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// NEW: Added DELETE function to remove employee records
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
      .order('full_name', { ascending: true }); // Removed the 'is_active' filter so you can edit inactive ones too

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}