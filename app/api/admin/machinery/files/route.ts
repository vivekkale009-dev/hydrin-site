import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role to bypass RLS
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    if (!machineId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data, error } = await supabase
      .from('machine_files')
      .select('*')
      .eq('machine_id', machineId);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// THIS IS THE MISSING PIECE CAUSING THE 405
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const machineId = formData.get('machineId') as string;

    if (!file || !machineId) throw new Error("Missing file or machine ID");

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `extra/${machineId}/${fileName}`;

    // 1. Upload to Storage
    const { error: storageError } = await supabase.storage
      .from('machinery-assets')
      .upload(filePath, file);

    if (storageError) throw storageError;

    // 2. Insert into Database
    const { data, error: dbError } = await supabase
      .from('machine_files')
      .insert([{
        machine_id: machineId,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type
      }])
      .select();

    if (dbError) throw dbError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Upload Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { error } = await supabase.from('machine_files').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}