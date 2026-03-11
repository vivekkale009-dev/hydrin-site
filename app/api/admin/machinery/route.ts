import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize with Service Role Key to bypass RLS on the server side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// GET: Fetches all machines (Bypasses RLS to ensure UI always reflects data)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('plant_machinery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Handles New Asset Registration and File Uploads
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const machineData: any = {};
    const id = formData.get('id'); // Used for matching in PUT/Edit scenarios
    
    // Define expected fields
    const fields = ['machine_name', 'model_number', 'install_date', 'status', 'next_maintenance', 'vendor_contact', 'criticality'];
    fields.forEach(f => {
      const val = formData.get(f);
      if (val !== null) machineData[f] = val;
    });

    // Handle File Uploads (Manual & Video)
    const files = { 
      manual: formData.get('manual') as File, 
      video: formData.get('video') as File 
    };
    
    for (const [key, file] of Object.entries(files)) {
      // Only upload if a new file is actually provided
      if (file && file.size > 0 && typeof file !== 'string') {
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('machinery-assets')
          .upload(`${key}s/${fileName}`, file);

        if (uploadError) throw uploadError;
        machineData[`${key}_url`] = uploadData.path;
      }
    }

    let result;
    if (id) {
      // UPDATE EXISTING ASSET
      result = await supabase
        .from('plant_machinery')
        .update(machineData)
        .eq('id', id)
        .select();
    } else {
      // INSERT NEW ASSET
      result = await supabase
        .from('plant_machinery')
        .insert([machineData])
        .select();
    }

    if (result.error) throw result.error;
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Reuses POST logic for editing
export async function PUT(req: Request) {
  return POST(req);
}

// DELETE: Removes the asset record (and triggers cascade for logs/files)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Machine ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from('plant_machinery')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: "Asset deleted successfully" });
  } catch (error: any) {
    console.error("Delete Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}