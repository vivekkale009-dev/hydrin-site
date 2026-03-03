import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    // Use Admin Client to bypass Storage RLS policies
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload to 'documents' bucket
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .upload(`letters/${fileName}`, file, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
       console.error("Storage Error:", error);
       throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(`letters/${fileName}`);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Server Upload Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}