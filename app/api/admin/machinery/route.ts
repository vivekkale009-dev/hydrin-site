import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const machineData: any = {};
    const id = formData.get('id');
    
    // Updated fields list to include video_url as a text field
    const fields = ['machine_name', 'model_number', 'install_date', 'status', 'next_maintenance', 'vendor_contact', 'criticality', 'video_url'];
    fields.forEach(f => {
      const val = formData.get(f);
      if (val !== null) machineData[f] = val;
    });

    // Handle Manual PDF Upload only (Video is now handled as text above)
    const manualFile = formData.get('manual') as File;
    if (manualFile && manualFile.size > 0 && typeof manualFile !== 'string') {
      const fileName = `${Date.now()}_${manualFile.name.replace(/\s/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('machinery-assets')
        .upload(`manuals/${fileName}`, manualFile);

      if (uploadError) throw uploadError;
      machineData[`manual_url`] = uploadData.path;
    }

    let result;
    if (id) {
      result = await supabase
        .from('plant_machinery')
        .update(machineData)
        .eq('id', id)
        .select();
    } else {
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

export async function PUT(req: Request) {
  return POST(req);
}

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