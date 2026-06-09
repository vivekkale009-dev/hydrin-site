import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // Expects YYYY-MM
    const supabase = await createAdminClient();

    if (!month) return NextResponse.json({ error: "Month required" }, { status: 400 });

    // 1. Parse the year and month
    const [year, monthVal] = month.split('-').map(Number);

    // 2. Calculate the last day dynamically
    const lastDay = new Date(year, monthVal, 0).getDate();

    // 3. Define the start and end dates ONCE
    const startDate = `${month}-01`;
    const endDate = `${month}-${lastDay}`;

    // 4. Fetch All Transaction Records
    const { data: records, error: recError } = await supabase
      .from('gst_records')
      .select('id, invoice_no, invoice_date, customer_name, customer_gstin, taxable_value, cgst_amount, sgst_amount, igst_amount, total_invoice_value, is_gst_invoice, order_number, invoice_pdf_path, hsn_code, place_of_supply, gst_rate')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: false });

    if (recError) throw recError;

    // 5. Fetch HSN Summary
    const { data: hsnSummary } = await supabase
      .from('gst_hsn_summary')
      .select('*')
      .eq('month_key', month);

    // 6. Calculate Totals
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