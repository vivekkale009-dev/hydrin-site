import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // Expects YYYY-MM
    const supabase = await createAdminClient();

    if (!month) return NextResponse.json({ error: "Month required" }, { status: 400 });

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // 1. Fetch All Transaction Records (including OURN and PDF Path)
    const { data: records, error: recError } = await supabase
      .from('gst_records')
      .select('id, invoice_no, invoice_date, customer_name, customer_gstin, taxable_value, cgst_amount, sgst_amount, igst_amount, total_invoice_value, is_gst_invoice, order_number, invoice_pdf_path, hsn_code, place_of_supply, gst_rate')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: false });

    if (recError) throw recError;

    // 2. Fetch HSN Summary from the View
    const { data: hsnSummary } = await supabase
      .from('gst_hsn_summary')
      .select('*')
      .eq('month_key', month);

    // 3. Calculate Totals for GSTR-3B Cards
    const totals = records?.reduce((acc, curr) => ({
      taxable: acc.taxable + (Number(curr.taxable_value) || 0),
      cgst: acc.cgst + (Number(curr.cgst_amount) || 0),
      sgst: acc.sgst + (Number(curr.sgst_amount) || 0),
      igst: acc.igst + (Number(curr.igst_amount) || 0),
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 }) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };

    return NextResponse.json({ 
      records: records || [], 
      hsnSummary: hsnSummary || [], 
      totals 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}