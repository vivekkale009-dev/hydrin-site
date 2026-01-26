import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { employee_id, amount_paid, payment_mode, payment_month } = await req.json();

    if (!employee_id || !amount_paid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Convert '2026-01' to 'January 2026'
    const [year, month] = payment_month.split('-');
    const formattedMonth = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' })
      .replace(/\s+/g, ' '); // Ensures only single spaces

    // 1. Insert the payment record
    const { error: payError } = await supabase
      .from('salary_payments')
      .insert([{
        employee_id,
        amount_paid,
        payment_mode,
        payment_date: new Date().toISOString().split('T')[0],
        payment_month: formattedMonth, 
        created_at: new Date().toISOString()
      }]);

    if (payError) throw payError;

    // 2. Mark advances as settled
    const { error: advError } = await supabase
      .from('salary_advances')
      .update({ is_settled: true })
      .eq('employee_id', employee_id)
      .eq('is_settled', false);

    if (advError) throw advError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}