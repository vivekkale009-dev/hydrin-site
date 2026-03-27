import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Fetch products and their recipes in one go
    const [{ data: products }, { data: recipes }] = await Promise.all([
      supabase.from('products').select('*').order('name', { ascending: true }),
      supabase.from('product_recipes').select('*, raw_materials(name, unit)')
    ]);

    return NextResponse.json({ 
      products: products || [], 
      recipes: recipes || [] 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createAdminClient();
    const { product_id, material_id, quantity_per_box } = await req.json();

    const { data, error } = await supabase
      .from('product_recipes')
      .upsert({
        product_id,
        material_id,
        quantity_per_box: Number(quantity_per_box)
      }, { onConflict: 'product_id,material_id' }) // Adjust based on your unique constraints
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from('product_recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}