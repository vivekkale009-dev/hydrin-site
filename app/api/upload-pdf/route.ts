import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Upload from server-side to bypass browser-based watchers
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(`letters/${fileName}`, file, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(`letters/${fileName}`);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Server Upload Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}