import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { contactId } = await req.json();
    const supabase = await createAdminClient();

    if (!contactId) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contact_list')
      .update({ last_messaged_at: new Date().toISOString() })
      .eq('id', contactId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Optional: GET handler if you want to fetch contacts via API instead of client-side
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'Distributor';
    
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('contact_list')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}