import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createAdminClient(); 
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []); 
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createAdminClient();
    const body = await req.json();
    const { name, unit, grammage } = body;

    const { data, error } = await supabase
      .from('raw_materials')
      .insert([{
        name: name.trim(),
        unit: unit || 'grams',
        grammage: grammage ? Number(grammage) : null,
        current_stock: 0,
        low_stock_threshold: 100
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const supabase = await createAdminClient();
    
    // Note: If this material is used in a BOM Recipe, 
    // you might get a Foreign Key error unless you delete the recipe first.
    const { error } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}