import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('business_documents')
      .select('*')
      .order('issue_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const supabase = await createAdminClient();
    
    // 1. Initialize formData first
    const formData = await req.formData();
    
    // 2. Extract the file and other fields
    const file = formData.get("file") as File | null;
    
    // Log for debugging purposes
    console.log("File received in API:", file);

    const docData: any = {};
    formData.forEach((value, key) => {
      if (key !== "file") docData[key] = value;
    });

    let file_path = docData.file_path || null;

    // 3. Handle file upload if present
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data: upData, error: upErr } = await supabase.storage
        .from('company-documents')
        .upload(fileName, file);

      if (upErr) throw upErr;
      file_path = upData.path;
    }

    // 4. Insert data into database
    const { data, error } = await supabase
      .from('business_documents')
      .insert([{ ...docData, file_path }])
      .select();

    if (error) throw error;
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("API Upload Error:", error);
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

    let file_path = updates.file_path || null;

    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from('company-documents')
        .upload(fileName, file);
      if (upErr) throw upErr;
      file_path = upData.path;
    }

    const { data, error } = await supabase
      .from('business_documents')
      .update({ ...updates, file_path })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { error } = await supabase.from('business_documents').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}