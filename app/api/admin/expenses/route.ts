import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('business_expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createAdminClient();
    const formData = await req.formData();
    
    // Extract file and data
    const file = formData.get("file") as File | null;
    const expenseData: any = {};
    formData.forEach((value, key) => {
      if (key !== "file") expenseData[key] = value;
    });

    let attachment_url = expenseData.attachment_url || null;

    // Handle File Upload on Server
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data: upData, error: upErr } = await supabase.storage
        .from('expense-attachments')
        .upload(fileName, file);

      if (upErr) throw upErr;
      attachment_url = upData.path;
    }

    const { data, error } = await supabase
      .from('business_expenses')
      .insert([{ ...expenseData, attachment_url }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createAdminClient();
    const formData = await req.formData();
    
    const file = formData.get("file") as File | null;
    const id = formData.get("id");
    const updates: any = {};
    formData.forEach((value, key) => {
      if (key !== "file" && key !== "id") updates[key] = value;
    });

    let attachment_url = updates.attachment_url || null;

    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from('expense-attachments')
        .upload(fileName, file);
      if (upErr) throw upErr;
      attachment_url = upData.path;
    }

    const { data, error } = await supabase
      .from('business_expenses')
      .update({ ...updates, attachment_url })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { error } = await supabase.from('business_expenses').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}